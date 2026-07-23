const { v4: uuidv4 } = require('uuid');

// Generate a human-readable order number: SL-XXXXXX
function generateOrderNumber() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `SL-${num}`;
}

module.exports = async function (fastify, opts) {
  // GET /api/orders — List orders with filters
  fastify.get('/', async (request, reply) => {
    const { location_id, status, date, limit = 50, offset = 0 } = request.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (location_id) { conditions.push(`o.location_id = $${paramIdx++}`); params.push(location_id); }
    if (status) { conditions.push(`o.status = $${paramIdx++}`); params.push(status); }
    if (date) { conditions.push(`DATE(o.created_at) = $${paramIdx++}`); params.push(date); }

    let query = `SELECT o.*, l.name AS location_name, l.store_number
                 FROM orders o JOIN locations l ON l.id = o.location_id`;
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY o.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const { rows } = await fastify.pg.query(query, params);

    // Attach items for each order
    for (const order of rows) {
      const { rows: items } = await fastify.pg.query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [order.id]
      );
      order.items = items;
    }

    return { orders: rows };
  });

  // GET /api/orders/:id — Get order details
  fastify.get('/:id', async (request, reply) => {
    const { rows: orders } = await fastify.pg.query(
      `SELECT o.*, l.name AS location_name, l.store_number
       FROM orders o JOIN locations l ON l.id = o.location_id
       WHERE o.id = $1`, [request.params.id]
    );
    if (!orders.length) return reply.code(404).send({ error: 'Order not found' });

    const order = orders[0];
    const { rows: items } = await fastify.pg.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [order.id]
    );
    order.items = items;

    return order;
  });

  // POST /api/orders — Create a new order
  fastify.post('/', async (request, reply) => {
    const {
      location_id, customer_id, customer_name, customer_phone,
      delivery_address, delivery_instructions, order_type,
      items, special_id, notes
    } = request.body;

    if (!location_id) return reply.code(400).send({ error: 'location_id is required' });
    if (!items || !items.length) return reply.code(400).send({ error: 'Order must have at least one item' });

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const lineTotal = (item.unit_price || 0) * (item.quantity || 1);
      subtotal += lineTotal;
      orderItems.push({
        ...item,
        total_price: lineTotal,
      });
    }

    // Apply special/discount
    let discount = 0;
    if (special_id) {
      const { rows: [special] } = await fastify.pg.query('SELECT * FROM specials WHERE id = $1', [special_id]);
      if (special) {
        if (special.discount_type === 'percentage') {
          discount = Math.round(subtotal * special.discount_value) / 100;
        } else if (special.discount_type === 'fixed') {
          discount = special.discount_value;
        }
        // buy_one_get_one handled differently in production
      }
    }

    const taxRate = 0.13; // HST Ontario
    const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
    const total = Math.round((subtotal - discount + tax) * 100) / 100;

    const orderNumber = generateOrderNumber();

    // Create order
    const { rows: [order] } = await fastify.pg.query(
      `INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone,
        delivery_address, delivery_instructions, order_type, status, subtotal, tax, discount, total, special_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14) RETURNING *`,
      [orderNumber, location_id, customer_id || null, customer_name, customer_phone,
       delivery_address, delivery_instructions, order_type || 'pickup',
       subtotal, tax, discount, total, special_id || null, notes || null]
    );

    // Create order items
    for (const item of orderItems) {
      await fastify.pg.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order.id, item.menu_item_id || null, item.name, item.size || null, item.quantity || 1,
         item.unit_price, item.total_price, JSON.stringify(item.customizations || {}), item.special_requests || null]
      );
    }

    // Update customer order count if customer exists
    if (customer_id) {
      await fastify.pg.query('UPDATE customers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = $1', [customer_id]);
    }

    // TODO: Submit to mock POS
    // For now, just mark as confirmed
    await fastify.pg.query("UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1", [order.id]);

    // Reload order with items
    const { rows: [fullOrder] } = await fastify.pg.query('SELECT * FROM orders WHERE id = $1', [order.id]);
    const { rows: orderItemsResult } = await fastify.pg.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    fullOrder.items = orderItemsResult;

    return reply.code(201).send(fullOrder);
  });

  // PATCH /api/orders/:id/status — Update order status
  fastify.patch('/:id/status', async (request, reply) => {
    const { status } = request.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { rows } = await fastify.pg.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, request.params.id]
    );

    if (!rows.length) return reply.code(404).send({ error: 'Order not found' });
    return rows[0];
  });
};