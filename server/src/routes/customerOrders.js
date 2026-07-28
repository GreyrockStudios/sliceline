// SliceLine Customer Order History & Reorder API
// GET /api/customers/:id/orders — paginated order history with items
// GET /api/customers/:id/reorder-suggestions — top 3 most-ordered combos
// POST /api/customers/:id/reorder — clone a previous order, validate availability

module.exports = async function (fastify, opts) {
  // GET /api/customers/:id/orders — Full order history with items
  fastify.get('/:id/orders', async (request, reply) => {
    const { id } = request.params;
    const { limit = 20, offset = 0, location_id } = request.query;

    // Verify customer exists
    const { rows: [customer] } = await fastify.pg.query(
      'SELECT id, phone, name FROM customers WHERE id = $1', [id]
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    // Build query with optional franchise/location filter
    const conditions = ['o.customer_id = $1'];
    const params = [id];
    let paramIdx = 2;

    if (location_id) {
      conditions.push(`o.location_id = $${paramIdx++}`);
      params.push(location_id);
    } else if (request.franchise_id) {
      conditions.push(`l.franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders o JOIN locations l ON l.id = o.location_id WHERE ${conditions.join(' AND ')}`;
    const { rows: [{ total }] } = await fastify.pg.query(countQuery, params);

    // Get orders with items
    params.push(limit, offset);
    const ordersQuery = `
      SELECT o.id, o.order_number, o.location_id, o.customer_id,
             o.customer_name, o.customer_phone, o.delivery_address,
             o.order_type, o.status, o.subtotal, o.tax, o.discount, o.total,
             o.notes, o.created_at, o.updated_at,
             l.name AS location_name, l.store_number
      FROM orders o
      JOIN locations l ON l.id = o.location_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const { rows: orders } = await fastify.pg.query(ordersQuery, params);

    // Attach items for each order
    for (const order of orders) {
      const { rows: items } = await fastify.pg.query(
        `SELECT oi.id, oi.menu_item_id, oi.name, oi.size, oi.quantity,
                oi.unit_price, oi.total_price, oi.customizations, oi.special_requests
         FROM order_items oi WHERE oi.order_id = $1 ORDER BY oi.created_at`,
        [order.id]
      );
      order.items = items;
    }

    return {
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      orders,
      total: Number(total),
      limit: Number(limit),
      offset: Number(offset),
    };
  });

  // GET /api/customers/:id/reorder-suggestions — Top combos for quick reorder
  fastify.get('/:id/reorder-suggestions', async (request, reply) => {
    const { id } = request.params;
    const { location_id } = request.query;

    // Verify customer
    const { rows: [customer] } = await fastify.pg.query(
      'SELECT id, phone, name FROM customers WHERE id = $1', [id]
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    // Find their most recent completed orders with items
    const conditions = ['o.customer_id = $1', "o.status IN ('completed', 'confirmed')"];
    const params = [id];
    let paramIdx = 2;

    if (location_id) {
      conditions.push(`o.location_id = $${paramIdx++}`);
      params.push(location_id);
    } else if (request.franchise_id) {
      conditions.push(`l.franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    }

    const ordersQuery = `
      SELECT o.id, o.order_number, o.location_id, o.order_type, o.total,
             o.delivery_address, o.created_at, l.name AS location_name
      FROM orders o
      JOIN locations l ON l.id = o.location_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    const { rows: orders } = await fastify.pg.query(ordersQuery, params);

    // For each order, get items and build a summary
    const suggestions = [];
    for (const order of orders) {
      const { rows: items } = await fastify.pg.query(
        `SELECT oi.menu_item_id, oi.name, oi.size, oi.quantity, oi.unit_price,
                oi.total_price, oi.customizations, oi.special_requests
         FROM order_items oi WHERE oi.order_id = $1`,
        [order.id]
      );

      // Check if items are still available
      const unavailableItems = [];
      for (const item of items) {
        if (item.menu_item_id) {
          const { rows: [menuItem] } = await fastify.pg.query(
            'SELECT is_available FROM menu_items WHERE id = $1', [item.menu_item_id]
          );
          if (menuItem && !menuItem.is_available) {
            unavailableItems.push(item.name);
          }
          // Check if required toppings are in stock (if location specified)
          if (location_id) {
            const { rows: oosToppings } = await fastify.pg.query(
              `SELECT t.name FROM menu_item_toppings mit
               JOIN toppings t ON t.id = mit.topping_id
               JOIN location_stock ls ON ls.item_id = t.id AND ls.item_type = 'topping' AND ls.location_id = $1
               WHERE mit.menu_item_id = $2 AND mit.is_required = true AND ls.stock_status = 'out_of_stock'`,
              [location_id, item.menu_item_id]
            );
            for (const t of oosToppings) {
              unavailableItems.push(`${item.name} (missing ${t.name})`);
            }
          }
        }
      }

      suggestions.push({
        order_id: order.id,
        order_number: order.order_number,
        location_name: order.location_name,
        order_type: order.order_type,
        delivery_address: order.delivery_address,
        total: Number(order.total),
        created_at: order.created_at,
        items: items.map(i => ({
          name: i.name,
          size: i.size,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
          total_price: Number(i.total_price),
          customizations: i.customizations,
          special_requests: i.special_requests,
          menu_item_id: i.menu_item_id,
        })),
        item_summary: items.map(i => `${i.quantity}x ${i.size ? i.size + ' ' : ''}${i.name}`).join(', '),
        available: unavailableItems.length === 0,
        unavailable_items: unavailableItems,
        can_reorder: unavailableItems.length === 0,
      });
    }

    // Deduplicate similar orders (same items, different dates)
    const seen = new Set();
    const unique = suggestions.filter(s => {
      const key = s.items.map(i => `${i.menu_item_id || i.name}:${i.size}:${i.quantity}`).sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      customer: { id: customer.id, name: customer.name },
      suggestions: unique.slice(0, 5),
    };
  });

  // POST /api/customers/:id/reorder — Clone a previous order
  fastify.post('/:id/reorder', async (request, reply) => {
    const { id } = request.params;
    const { order_id, location_id, modifications } = request.body;

    // modifications: { add_items: [...], remove_items: [...], change_size: {item_id: new_size}, change_delivery_address: "..." }

    // Verify customer
    const { rows: [customer] } = await fastify.pg.query(
      'SELECT id, phone, name, default_location_id FROM customers WHERE id = $1', [id]
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    // Load the original order
    const origLocationFilter = request.franchise_id
      ? ' AND l.franchise_id = $3'
      : '';
    const origParams = request.franchise_id
      ? [order_id, id, request.franchise_id]
      : [order_id, id];

    const { rows: [originalOrder] } = await fastify.pg.query(
      `SELECT o.*, l.name AS location_name FROM orders o
       JOIN locations l ON l.id = o.location_id
       WHERE o.id = $1 AND o.customer_id = $2${origLocationFilter}`,
      origParams
    );
    if (!originalOrder) return reply.code(404).send({ error: 'Original order not found' });

    // Load original items
    const { rows: originalItems } = await fastify.pg.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [originalOrder.id]
    );

    // Determine target location
    const targetLocationId = location_id || originalOrder.location_id;

    // Validate availability of all items at target location
    const warnings = [];
    const validItems = [];

    for (const item of originalItems) {
      if (item.menu_item_id) {
        // Check menu item availability
        const { rows: [menuItem] } = await fastify.pg.query(
          'SELECT is_available, name, base_price, sizes FROM menu_items WHERE id = $1',
          [item.menu_item_id]
        );
        if (!menuItem) {
          warnings.push(`${item.name} is no longer on the menu`);
          continue;
        }
        if (!menuItem.is_available) {
          warnings.push(`${item.name} is currently unavailable`);
          continue;
        }

        // Check required toppings stock at target location
        const { rows: oosToppings } = await fastify.pg.query(
          `SELECT t.name FROM menu_item_toppings mit
           JOIN toppings t ON t.id = mit.topping_id
           LEFT JOIN location_stock ls ON ls.item_id = t.id AND ls.item_type = 'topping' AND ls.location_id = $1
           WHERE mit.menu_item_id = $2 AND mit.is_required = true
           AND ls.stock_status = 'out_of_stock'`,
          [targetLocationId, item.menu_item_id]
        );
        if (oosToppings.length > 0) {
          warnings.push(`${item.name} is unavailable (out of stock: ${oosToppings.map(t => t.name).join(', ')})`);
          continue;
        }

        // Recalculate price (menu price may have changed)
        let unitPrice = item.unit_price;

        // Check for location price override
        const { rows: [override] } = await fastify.pg.query(
          'SELECT price_override, sizes_override FROM location_menu_overrides WHERE location_id = $1 AND menu_item_id = $2',
          [targetLocationId, item.menu_item_id]
        );

        if (item.size && menuItem.sizes) {
          const sizes = override?.sizes_override || menuItem.sizes;
          const sizeMatch = sizes.find(s => s.name === item.size);
          if (sizeMatch) {
            unitPrice = Number(sizeMatch.price);
          } else if (override?.price_override) {
            unitPrice = Number(override.price_override);
          }
        } else if (override?.price_override) {
          unitPrice = Number(override.price_override);
        }

        // Apply modifications: size change
        const mods = modifications || {};
        let finalSize = item.size;
        if (mods.change_size && mods.change_size[item.menu_item_id]) {
          finalSize = mods.change_size[item.menu_item_id];
          const sizes = override?.sizes_override || menuItem.sizes;
          const sizeMatch = sizes?.find(s => s.name === finalSize);
          if (sizeMatch) unitPrice = Number(sizeMatch.price);
        }

        // Recalculate topping prices from current menu data
        let toppingTotal = 0;
        const customizations = item.customizations || {};
        const addedToppings = customizations.added_toppings || [];
        for (const t of addedToppings) {
          toppingTotal += Number(t.price || 1.50);
        }
        if (customizations.extra_cheese) toppingTotal += 2.00;

        validItems.push({
          menu_item_id: item.menu_item_id,
          name: item.name,
          size: finalSize,
          quantity: item.quantity,
          unit_price: unitPrice + toppingTotal,
          total_price: (unitPrice + toppingTotal) * item.quantity,
          customizations: item.customizations,
          special_requests: item.special_requests,
        });
      } else {
        // Non-menu item (custom order line) — keep as-is
        validItems.push({
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          customizations: item.customizations,
          special_requests: item.special_requests,
        });
      }
    }

    if (validItems.length === 0) {
      return reply.code(400).send({
        error: 'None of the items from the original order are available',
        warnings,
      });
    }

    // Apply modifications: add/remove items
    const mods = modifications || {};
    if (mods.add_items && Array.isArray(mods.add_items)) {
      for (const addItem of mods.add_items) {
        if (addItem.menu_item_id) {
          const { rows: [mi] } = await fastify.pg.query(
            'SELECT name, base_price, sizes, is_available FROM menu_items WHERE id = $1',
            [addItem.menu_item_id]
          );
          if (mi && mi.is_available) {
            let price = Number(mi.base_price);
            if (addItem.size && mi.sizes) {
              const sizeMatch = mi.sizes.find(s => s.name === addItem.size);
              if (sizeMatch) price = Number(sizeMatch.price);
            }
            validItems.push({
              menu_item_id: addItem.menu_item_id,
              name: addItem.name || mi.name,
              size: addItem.size || null,
              quantity: addItem.quantity || 1,
              unit_price: price,
              total_price: price * (addItem.quantity || 1),
              customizations: addItem.customizations || {},
              special_requests: addItem.special_requests || null,
            });
          }
        }
      }
    }

    // Calculate totals
    const subtotal = validItems.reduce((sum, i) => sum + Number(i.total_price), 0);
    const deliveryAddress = mods.change_delivery_address || originalOrder.delivery_address;
    const orderType = mods.change_order_type || originalOrder.order_type;

    // Delivery fee
    let deliveryFee = 0;
    if (orderType === 'delivery') {
      const { rows: [loc] } = await fastify.pg.query(
        'SELECT delivery_fee FROM locations WHERE id = $1', [targetLocationId]
      );
      deliveryFee = Number(loc?.delivery_fee || 0);
    }

    const tax = Math.round(subtotal * 0.13 * 100) / 100; // Ontario HST
    const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;
    const orderNumber = `SL-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create the order
    const { rows: [order] } = await fastify.pg.query(
      `INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone,
        delivery_address, delivery_instructions, order_type, status, subtotal, tax, discount, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, 0, $11, $12) RETURNING *`,
      [orderNumber, targetLocationId, customer.id, customer.name, customer.phone,
       deliveryAddress, originalOrder.delivery_instructions, orderType,
       subtotal, tax, total,
       `Reorder of ${originalOrder.order_number}${warnings.length ? '. Warnings: ' + warnings.join('; ') : ''}`]
    );

    // Create order items
    for (const item of validItems) {
      await fastify.pg.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order.id, item.menu_item_id || null, item.name, item.size || null,
         item.quantity, item.unit_price, item.total_price,
         JSON.stringify(item.customizations || {}), item.special_requests || null]
      );
    }

    // Update customer order count
    await fastify.pg.query('UPDATE customers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = $1', [customer.id]);

    // Update customer favorites
    await updateFavorites(fastify, customer.id, targetLocationId, validItems);

    // Mark order as confirmed
    await fastify.pg.query("UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1", [order.id]);

    const { rows: [fullOrder] } = await fastify.pg.query('SELECT * FROM orders WHERE id = $1', [order.id]);
    const { rows: orderItems } = await fastify.pg.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    fullOrder.items = orderItems;

    const estimatedTime = orderType === 'delivery' ? '35-45 minutes' : '20-25 minutes';

    return {
      ...fullOrder,
      reordered_from: originalOrder.order_number,
      warnings: warnings.length ? warnings : undefined,
      estimated_time: estimatedTime,
      message: `Reorder confirmed! Your new order number is ${fullOrder.order_number}. Total: $${Number(fullOrder.total).toFixed(2)}.${warnings.length ? ' Note: ' + warnings.join('. ') : ''} Estimated ${orderType === 'delivery' ? 'delivery' : 'pickup'} time is ${estimatedTime}.`,
    };
  });
};

// Helper: Update customer favorites after reorder
async function updateFavorites(fastify, customerId, locationId, items) {
  for (const item of items) {
    if (!item.menu_item_id) continue;

    const { rows: [existing] } = await fastify.pg.query(
      `SELECT id, order_count FROM customer_favorites
       WHERE customer_id = $1 AND location_id = $2 AND menu_item_id = $3 AND usual_size = $4`,
      [customerId, locationId, item.menu_item_id, item.size || null]
    );

    if (existing) {
      await fastify.pg.query(
        `UPDATE customer_favorites SET order_count = order_count + 1, last_ordered_at = NOW(),
         usual_customizations = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(item.customizations || {}), existing.id]
      );
    } else {
      await fastify.pg.query(
        `INSERT INTO customer_favorites (customer_id, location_id, menu_item_id, order_count, usual_size, usual_customizations)
         VALUES ($1, $2, $3, 1, $4, $5)
         ON CONFLICT (customer_id, location_id, menu_item_id, usual_size) DO UPDATE
         SET order_count = customer_favorites.order_count + 1, last_ordered_at = NOW()`,
        [customerId, locationId, item.menu_item_id, item.size || null, JSON.stringify(item.customizations || {})]
      );
    }
  }
}