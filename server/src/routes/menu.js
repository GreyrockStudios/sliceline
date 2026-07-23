const { v4: uuidv4 } = require('uuid');

module.exports = async function (fastify, opts) {
  // Helper: get menu for a location (with overrides applied)
  async function getLocationMenu(locationId) {
    // Get location's franchise
    const locResult = await fastify.pg.query('SELECT franchise_id FROM locations WHERE id = $1', [locationId]);
    if (!locResult.rows.length) return null;
    const franchiseId = locResult.rows[0].franchise_id;

    // Get all categories
    const catsResult = await fastify.pg.query(
      'SELECT * FROM menu_categories WHERE franchise_id = $1 AND is_active = true ORDER BY display_order',
      [franchiseId]
    );

    // Get all menu items for franchise (base items)
    const itemsResult = await fastify.pg.query(
      `SELECT mi.*, mc.name AS category_name
       FROM menu_items mi
       JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.franchise_id = $1 AND mi.is_available = true
       ORDER BY mi.display_order`,
      [franchiseId]
    );

    // Get location overrides
    const overridesResult = await fastify.pg.query(
      'SELECT * FROM location_menu_overrides WHERE location_id = $1', [locationId]
    );
    const overrides = new Map(overridesResult.rows.map(o => [o.menu_item_id, o]));

    // Get stock status
    const stockResult = await fastify.pg.query(
      `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'menu_item' AND stock_status != 'in_stock'`,
      [locationId]
    );
    const stock = new Map(stockResult.rows.map(s => [s.item_id, s]));

    // Get toppings for franchise
    const toppingsResult = await fastify.pg.query(
      'SELECT * FROM toppings WHERE franchise_id = $1 AND is_available = true ORDER BY is_premium, name',
      [franchiseId]
    );

    // Get topping overrides for location
    const topOverridesResult = await fastify.pg.query(
      'SELECT * FROM location_topping_overrides WHERE location_id = $1', [locationId]
    );
    const topOverrides = new Map(topOverridesResult.rows.map(o => [o.topping_id, o]));

    // Get topping stock
    const topStockResult = await fastify.pg.query(
      `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'topping' AND stock_status != 'in_stock'`,
      [locationId]
    );
    const topStock = new Map(topStockResult.rows.map(s => [s.item_id, s]));

    // Build menu with overrides applied
    const items = itemsResult.rows.map(item => {
      const override = overrides.get(item.id);
      const stockInfo = stock.get(item.id);

      // Skip discontinued items entirely
      if (stockInfo && stockInfo.stock_status === 'discontinued') return null;
      // Mark out of stock
      if (stockInfo && stockInfo.stock_status === 'out_of_stock') {
        return { ...item, is_available: false, stock_status: stockInfo.stock_status, stock_notes: stockInfo.notes, expected_restock: stockInfo.expected_restock_at };
      }
      // Mark low stock
      if (stockInfo && stockInfo.stock_status === 'low_stock') {
        return { ...item, stock_status: 'low_stock', stock_quantity: stockInfo.quantity, stock_notes: stockInfo.notes };
      }

      // Apply price override
      if (override) {
        return {
          ...item,
          base_price: override.price_override || item.base_price,
          sizes: override.sizes_override || item.sizes,
          is_available: override.is_available !== false,
        };
      }

      return item;
    }).filter(Boolean);

    // Build toppings with overrides applied
    const toppings = toppingsResult.rows.map(topping => {
      const override = topOverrides.get(topping.id);
      const stockInfo = topStock.get(topping.id);

      if (stockInfo && stockInfo.stock_status === 'discontinued') return null;
      if (stockInfo && stockInfo.stock_status === 'out_of_stock') {
        return { ...topping, is_available: false, stock_status: stockInfo.stock_status, stock_notes: stockInfo.notes };
      }

      if (override) {
        return {
          ...topping,
          base_price: override.price_override || topping.base_price,
          is_available: override.is_available !== false,
        };
      }
      return topping;
    }).filter(Boolean);

    // Get specials for this location (franchise-wide + location-specific)
    const specialsResult = await fastify.pg.query(
      `SELECT s.* FROM specials s
       WHERE s.franchise_id = $1 AND s.is_active = true
       AND (s.start_date IS NULL OR s.start_date <= CURRENT_DATE)
       AND (s.end_date IS NULL OR s.end_date >= CURRENT_date)`,
      [franchiseId]
    );

    // Exclude any specials this location has opted out of
    const exclusionsResult = await fastify.pg.query(
      'SELECT special_id FROM location_specials WHERE location_id = $1 AND is_excluded = true',
      [locationId]
    );
    const excludedIds = new Set(exclusionsResult.rows.map(e => e.special_id));

    const franchiseSpecials = specialsResult.rows.filter(s => !excludedIds.has(s.id));

    // Get location-exclusive specials
    const locationSpecialsResult = await fastify.pg.query(
      `SELECT id, name, description, discount_type, discount_value, applies_to, applies_to_id,
              day_of_week, start_time, end_time, start_date, end_date
       FROM location_specials
       WHERE location_id = $1 AND is_active = true AND special_id IS NULL
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [locationId]
    );

    // Group items by category
    const menu = catsResult.rows.map(cat => ({
      ...cat,
      items: items.filter(i => i.category_id === cat.id)
    }));

    return {
      location_id: locationId,
      categories: menu,
      toppings,
      specials: [...franchiseSpecials, ...locationSpecialsResult.rows],
    };
  }

  // GET /api/menu/:locationId — Get full menu for a location (with overrides and stock)
  fastify.get('/:locationId', async (request, reply) => {
    const menu = await getLocationMenu(request.params.locationId);
    if (!menu) return reply.code(404).send({ error: 'Location not found' });
    return menu;
  });

  // GET /api/menu/:locationId/specials — Get current specials for a location
  fastify.get('/:locationId/specials', async (request, reply) => {
    const menu = await getLocationMenu(request.params.locationId);
    if (!menu) return reply.code(404).send({ error: 'Location not found' });

    // Filter to only currently active specials (day + time)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const activeSpecials = menu.specials.filter(s => {
      // Check day
      if (s.day_of_week && s.day_of_week.length && !s.day_of_week.includes(dayOfWeek)) return false;
      // Check time range
      if (s.start_time && s.end_time) {
        if (currentTime < s.start_time || currentTime > s.end_time) return false;
      }
      return true;
    });

    return { specials: activeSpecials };
  });

  // POST /api/menu/items — Add a menu item
  fastify.post('/items', async (request, reply) => {
    const { franchise_id, category_id, name, description, slug, base_price, sizes, display_order } = request.body;
    const { rows } = await fastify.pg.query(
      `INSERT INTO menu_items (franchise_id, category_id, name, description, slug, base_price, sizes, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [franchise_id, category_id, name, description, slug, base_price, JSON.stringify(sizes || []), display_order || 0]
    );
    return reply.code(201).send(rows[0]);
  });

  // PUT /api/menu/items/:id — Update a menu item
  fastify.put('/items/:id', async (request, reply) => {
    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(request.body)) {
      if (['name', 'description', 'base_price', 'sizes', 'is_available', 'display_order', 'category_id'].includes(key)) {
        fields.push(`${key} = $${paramIdx++}`);
        values.push(key === 'sizes' ? JSON.stringify(value) : value);
      }
    }

    if (!fields.length) return reply.code(400).send({ error: 'No valid fields to update' });
    fields.push('updated_at = NOW()');
    values.push(request.params.id);

    const { rows } = await fastify.pg.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`, values
    );
    if (!rows.length) return reply.code(404).send({ error: 'Menu item not found' });
    return rows[0];
  });

  // DELETE /api/menu/items/:id — Remove a menu item (soft delete)
  fastify.delete('/items/:id', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'UPDATE menu_items SET is_available = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [request.params.id]
    );
    if (!rows.length) return reply.code(404).send({ error: 'Menu item not found' });
    return { message: 'Menu item deactivated', id: rows[0].id };
  });

  // POST /api/menu/:locationId/stock — Update stock for a location
  fastify.post('/:locationId/stock', async (request, reply) => {
    const { items } = request.body; // [{item_type, item_id, stock_status, quantity?, notes?}]
    const locationId = request.params.locationId;

    const results = [];
    for (const item of items) {
      const { rows } = await fastify.pg.query(
        `INSERT INTO location_stock (location_id, item_type, item_id, stock_status, quantity, notes, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'manager')
         ON CONFLICT (location_id, item_type, item_id)
         DO UPDATE SET stock_status = EXCLUDED.stock_status, quantity = EXCLUDED.quantity, notes = EXCLUDED.notes, updated_by = 'manager', updated_at = NOW()
         RETURNING *`,
        [locationId, item.item_type, item.item_id, item.stock_status, item.quantity || null, item.notes || null]
      );
      results.push(rows[0]);
    }

    return { updated: results };
  });
};