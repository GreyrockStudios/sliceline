// SliceLine Admin API — Franchise, Location, Menu, Topping, Stock management
const { v4: uuidv4 } = require('uuid');

module.exports = async function (fastify, opts) {

  // ==========================================
  // FRANCHISE MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises — List all franchises
  fastify.get('/franchises', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT f.*, COUNT(l.id) AS location_count FROM franchises f LEFT JOIN locations l ON l.franchise_id = f.id GROUP BY f.id ORDER BY f.name'
    );
    return { franchises: rows };
  });

  // GET /api/admin/franchises/:id — Get franchise with locations
  fastify.get('/franchises/:id', async (request, reply) => {
    const { rows: [franchise] } = await fastify.pg.query('SELECT * FROM franchises WHERE id = $1', [request.params.id]);
    if (!franchise) return reply.code(404).send({ error: 'Franchise not found' });
    const { rows: locations } = await fastify.pg.query('SELECT * FROM locations WHERE franchise_id = $1 ORDER BY store_number', [request.params.id]);
    franchise.locations = locations;
    return franchise;
  });

  // POST /api/admin/franchises — Create franchise
  fastify.post('/franchises', async (request, reply) => {
    const { name, slug } = request.body;
    const { rows: [franchise] } = await fastify.pg.query(
      'INSERT INTO franchises (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')]
    );
    return reply.code(201).send(franchise);
  });

  // PUT /api/admin/franchises/:id — Update franchise
  fastify.put('/franchises/:id', async (request, reply) => {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (['name', 'slug'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields' });
    fields.push('updated_at = NOW()');
    values.push(request.params.id);
    const { rows: [franchise] } = await fastify.pg.query(
      `UPDATE franchises SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!franchise) return reply.code(404).send({ error: 'Franchise not found' });
    return franchise;
  });

  // ==========================================
  // LOCATION MANAGEMENT
  // ==========================================

  // GET /api/admin/locations — List all locations (with franchise info)
  fastify.get('/locations', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      `SELECT l.*, f.name AS franchise_name, f.slug AS franchise_slug
       FROM locations l JOIN franchises f ON f.id = l.franchise_id
       ORDER BY f.name, l.store_number`
    );
    return { locations: rows };
  });

  // GET /api/admin/locations/:id — Get single location with full config
  fastify.get('/locations/:id', async (request, reply) => {
    const { rows: [location] } = await fastify.pg.query('SELECT * FROM locations WHERE id = $1', [request.params.id]);
    if (!location) return reply.code(404).send({ error: 'Location not found' });

    // Get stock alerts
    const { rows: stockAlerts } = await fastify.pg.query(
      `SELECT ls.*, CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
       FROM location_stock ls
       LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
       LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
       WHERE ls.location_id = $1 AND ls.stock_status != 'in_stock'`, [request.params.id]
    );
    location.stock_alerts = stockAlerts;
    return location;
  });

  // PUT /api/admin/locations/:id — Update location config (hours, greeting, delivery)
  fastify.put('/locations/:id', async (request, reply) => {
    const allowed = ['name', 'phone', 'email', 'street', 'city', 'state', 'zip',
      'latitude', 'longitude', 'timezone', 'is_active', 'delivery_radius_km',
      'hours', 'phone_greeting', 'delivery_enabled', 'delivery_fee', 'delivery_min_order', 'delivery_zones'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields' });
    fields.push('updated_at = NOW()');
    values.push(request.params.id);
    const { rows: [location] } = await fastify.pg.query(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!location) return reply.code(404).send({ error: 'Location not found' });
    return location;
  });

  // ==========================================
  // MENU CATEGORY MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/categories — List categories
  fastify.get('/franchises/:franchiseId/categories', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT * FROM menu_categories WHERE franchise_id = $1 ORDER BY display_order', [request.params.franchiseId]
    );
    return { categories: rows };
  });

  // POST /api/admin/categories — Create category
  fastify.post('/categories', async (request, reply) => {
    const { franchise_id, name, slug, display_order } = request.body;
    const { rows: [cat] } = await fastify.pg.query(
      'INSERT INTO menu_categories (franchise_id, name, slug, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [franchise_id, name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), display_order || 0]
    );
    return reply.code(201).send(cat);
  });

  // PUT /api/admin/categories/:id — Update category
  fastify.put('/categories/:id', async (request, reply) => {
    const allowed = ['name', 'slug', 'display_order', 'is_active'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields' });
    values.push(request.params.id);
    const { rows: [cat] } = await fastify.pg.query(
      `UPDATE menu_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!cat) return reply.code(404).send({ error: 'Category not found' });
    return cat;
  });

  // ==========================================
  // MENU ITEM MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/items — List menu items with toppings
  fastify.get('/franchises/:franchiseId/items', async (request, reply) => {
    const { rows: items } = await fastify.pg.query(
      `SELECT mi.*, mc.name AS category_name
       FROM menu_items mi
       JOIN menu_categories mc ON mc.id = mi.category_id
       WHERE mi.franchise_id = $1
       ORDER BY mi.category_id, mi.display_order`, [request.params.franchiseId]
    );

    // Get all topping associations for these items
    const itemIds = items.map(i => i.id);
    if (itemIds.length) {
      const { rows: toppings } = await fastify.pg.query(
        `SELECT mit.*, t.name AS topping_name, t.base_price, t.is_premium
         FROM menu_item_toppings mit
         JOIN toppings t ON t.id = mit.topping_id
         WHERE mit.menu_item_id = ANY($1)
         ORDER BY mit.display_order`, [itemIds]
      );
      const toppingMap = new Map();
      for (const t of toppings) {
        if (!toppingMap.has(t.menu_item_id)) toppingMap.set(t.menu_item_id, []);
        toppingMap.get(t.menu_item_id).push({
          topping_id: t.topping_id, name: t.topping_name,
          is_required: t.is_required, price: t.base_price, is_premium: t.is_premium,
          display_order: t.display_order
        });
      }
      for (const item of items) {
        item.default_toppings = toppingMap.get(item.id) || [];
      }
    }

    return { items };
  });

  // POST /api/admin/items — Create menu item
  fastify.post('/items', async (request, reply) => {
    const { franchise_id, category_id, name, description, slug, base_price, sizes, available_times, display_order, default_toppings } = request.body;
    const { rows: [item] } = await fastify.pg.query(
      `INSERT INTO menu_items (franchise_id, category_id, name, description, slug, base_price, sizes, available_times, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [franchise_id, category_id, name, description || null, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
       base_price, JSON.stringify(sizes || []),
       available_times ? JSON.stringify(available_times) : null, display_order || 0]
    );

    // Insert topping associations
    if (default_toppings && default_toppings.length) {
      for (const t of default_toppings) {
        await fastify.pg.query(
          'INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [item.id, t.topping_id, t.is_required !== false, t.display_order || 0]
        );
      }
    }

    return reply.code(201).send(item);
  });

  // PUT /api/admin/items/:id — Update menu item (including toppings)
  fastify.put('/items/:id', async (request, reply) => {
    const allowed = ['name', 'description', 'base_price', 'sizes', 'is_available', 'display_order', 'category_id', 'available_times'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(['sizes', 'available_times'].includes(key) ? JSON.stringify(value) : value);
      }
    }
    if (!fields.length && !request.body.default_toppings) return reply.code(400).send({ error: 'No valid fields' });
    fields.push('updated_at = NOW()');
    values.push(request.params.id);
    const { rows: [item] } = await fastify.pg.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!item) return reply.code(404).send({ error: 'Item not found' });

    // Update topping associations if provided
    if (request.body.default_toppings !== undefined) {
      await fastify.pg.query('DELETE FROM menu_item_toppings WHERE menu_item_id = $1', [request.params.id]);
      for (const t of request.body.default_toppings) {
        await fastify.pg.query(
          'INSERT INTO menu_item_toppings (menu_item_id, topping_id, is_required, display_order) VALUES ($1, $2, $3, $4)',
          [request.params.id, t.topping_id, t.is_required !== false, t.display_order || 0]
        );
      }
    }

    return item;
  });

  // DELETE /api/admin/items/:id — Soft delete
  fastify.delete('/items/:id', async (request, reply) => {
    const { rows: [item] } = await fastify.pg.query(
      'UPDATE menu_items SET is_available = false, updated_at = NOW() WHERE id = $1 RETURNING *', [request.params.id]
    );
    if (!item) return reply.code(404).send({ error: 'Item not found' });
    return { message: 'Item deactivated', id: item.id };
  });

  // ==========================================
  // TOPPING MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/toppings — List toppings
  fastify.get('/franchises/:franchiseId/toppings', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT * FROM toppings WHERE franchise_id = $1 ORDER BY is_premium, name', [request.params.franchiseId]
    );
    return { toppings: rows };
  });

  // POST /api/admin/toppings — Create topping
  fastify.post('/toppings', async (request, reply) => {
    const { franchise_id, name, base_price, is_premium } = request.body;
    const { rows: [topping] } = await fastify.pg.query(
      'INSERT INTO toppings (franchise_id, name, base_price, is_premium) VALUES ($1, $2, $3, $4) RETURNING *',
      [franchise_id, name, base_price || 1.50, is_premium || false]
    );
    return reply.code(201).send(topping);
  });

  // PUT /api/admin/toppings/:id — Update topping
  fastify.put('/toppings/:id', async (request, reply) => {
    const allowed = ['name', 'base_price', 'is_premium', 'is_available'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields' });
    values.push(request.params.id);
    const { rows: [topping] } = await fastify.pg.query(
      `UPDATE toppings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!topping) return reply.code(404).send({ error: 'Topping not found' });
    return topping;
  });

  // DELETE /api/admin/toppings/:id — Soft delete
  fastify.delete('/toppings/:id', async (request, reply) => {
    const { rows: [topping] } = await fastify.pg.query(
      'UPDATE toppings SET is_available = false WHERE id = $1 RETURNING *', [request.params.id]
    );
    if (!topping) return reply.code(404).send({ error: 'Topping not found' });
    return { message: 'Topping deactivated', id: topping.id };
  });

  // ==========================================
  // SPECIALS MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/specials — List specials
  fastify.get('/franchises/:franchiseId/specials', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT * FROM specials WHERE franchise_id = $1 ORDER BY name', [request.params.franchiseId]
    );
    return { specials: rows };
  });

  // POST /api/admin/specials — Create special
  fastify.post('/specials', async (request, reply) => {
    const { franchise_id, name, description, discount_type, discount_value, applies_to, applies_to_id,
            day_of_week, start_time, end_time, start_date, end_date } = request.body;
    const { rows: [special] } = await fastify.pg.query(
      `INSERT INTO specials (franchise_id, name, description, discount_type, discount_value, applies_to, applies_to_id,
        day_of_week, start_time, end_time, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [franchise_id, name, description, discount_type || 'percentage', discount_value,
       applies_to || 'order', applies_to_id || null,
       day_of_week ? JSON.stringify(day_of_week) : null, start_time || null, end_time || null,
       start_date || null, end_date || null]
    );
    return reply.code(201).send(special);
  });

  // PUT /api/admin/specials/:id — Update special
  fastify.put('/specials/:id', async (request, reply) => {
    const allowed = ['name', 'description', 'discount_type', 'discount_value', 'applies_to', 'applies_to_id',
                     'day_of_week', 'start_time', 'end_time', 'start_date', 'end_date', 'is_active'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(request.body)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(['day_of_week'].includes(key) ? JSON.stringify(value) : value);
      }
    }
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields' });
    fields.push('updated_at = NOW()');
    values.push(request.params.id);
    const { rows: [special] } = await fastify.pg.query(
      `UPDATE specials SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (!special) return reply.code(404).send({ error: 'Special not found' });
    return special;
  });

  // ==========================================
  // STOCK MANAGEMENT
  // ==========================================

  // GET /api/admin/locations/:locationId/stock — Get all stock statuses for a location
  fastify.get('/locations/:locationId/stock', async (request, reply) => {
    const { rows: menuStock } = await fastify.pg.query(
      `SELECT ls.*, mi.name AS item_name FROM location_stock ls
       JOIN menu_items mi ON mi.id = ls.item_id
       WHERE ls.location_id = $1 AND ls.item_type = 'menu_item'
       ORDER BY mi.name`, [request.params.locationId]
    );
    const { rows: toppingStock } = await fastify.pg.query(
      `SELECT ls.*, t.name AS item_name FROM location_stock ls
       JOIN toppings t ON t.id = ls.item_id
       WHERE ls.location_id = $1 AND ls.item_type = 'topping'
       ORDER BY t.name`, [request.params.locationId]
    );
    return { menu_items: menuStock, toppings: toppingStock };
  });

  // POST /api/admin/locations/:locationId/stock — Update stock
  fastify.post('/locations/:locationId/stock', async (request, reply) => {
    const { items } = request.body;
    const locationId = request.params.locationId;
    const results = [];
    for (const item of items) {
      const { rows: [row] } = await fastify.pg.query(
        `INSERT INTO location_stock (location_id, item_type, item_id, stock_status, quantity, notes, expected_restock_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'manager')
         ON CONFLICT (location_id, item_type, item_id)
         DO UPDATE SET stock_status = EXCLUDED.stock_status, quantity = EXCLUDED.quantity,
           notes = EXCLUDED.notes, expected_restock_at = EXCLUDED.expected_restock_at, updated_by = 'manager', updated_at = NOW()
         RETURNING *`,
        [locationId, item.item_type, item.item_id, item.stock_status,
         item.quantity || null, item.notes || null, item.expected_restock_at || null]
      );
      results.push(row);
    }
    return { updated: results };
  });

  // DELETE /api/admin/locations/:locationId/stock/:stockId — Remove stock entry (set back to in_stock)
  fastify.delete('/locations/:locationId/stock/:stockId', async (request, reply) => {
    const { rows: [row] } = await fastify.pg.query(
      'DELETE FROM location_stock WHERE id = $1 AND location_id = $2 RETURNING *',
      [request.params.stockId, request.params.locationId]
    );
    if (!row) return reply.code(404).send({ error: 'Stock entry not found' });
    return { message: 'Stock entry removed', id: row.id };
  });
};