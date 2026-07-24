// SliceLine Admin API — Franchise, Location, Menu, Topping, Stock management
// All routes require authentication and are tenant-filtered by franchise_id
const { v4: uuidv4 } = require('uuid');

module.exports = async function (fastify, opts) {

  // Helper: ensure admin or write permission
  function requireWrite(request, reply) {
    if (request.api_key_permissions) {
      if (!request.api_key_permissions.includes('write') && !request.api_key_permissions.includes('admin')) {
        reply.code(403).send({ error: 'Insufficient permissions. Requires write or admin.' });
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // FRANCHISE MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises — List franchises (tenant-filtered)
  fastify.get('/franchises', async (request, reply) => {
    if (request.franchise_id) {
      const { rows } = await fastify.pg.query(
        'SELECT f.*, COUNT(l.id) AS location_count FROM franchises f LEFT JOIN locations l ON l.franchise_id = f.id WHERE f.id = $1 GROUP BY f.id ORDER BY f.name',
        [request.franchise_id]
      );
      return { franchises: rows };
    }
    const { rows } = await fastify.pg.query(
      'SELECT f.*, COUNT(l.id) AS location_count FROM franchises f LEFT JOIN locations l ON l.franchise_id = f.id GROUP BY f.id ORDER BY f.name'
    );
    return { franchises: rows };
  });

  // GET /api/admin/franchises/:id — Get franchise with locations (tenant-filtered)
  fastify.get('/franchises/:id', async (request, reply) => {
    const query = request.franchise_id
      ? 'SELECT * FROM franchises WHERE id = $1 AND id = $2'
      : 'SELECT * FROM franchises WHERE id = $1';
    const params = request.franchise_id
      ? [request.params.id, request.franchise_id]
      : [request.params.id];

    const { rows: [franchise] } = await fastify.pg.query(query, params);
    if (!franchise) return reply.code(404).send({ error: 'Franchise not found' });

    const locQuery = request.franchise_id
      ? 'SELECT * FROM locations WHERE franchise_id = $1 ORDER BY store_number'
      : 'SELECT * FROM locations WHERE franchise_id = $1 ORDER BY store_number';
    const { rows: locations } = await fastify.pg.query(locQuery, [franchise.id]);
    franchise.locations = locations;
    return franchise;
  });

  // POST /api/admin/franchises — Create franchise (admin only)
  fastify.post('/franchises', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    const { name, slug } = request.body;
    const { rows: [franchise] } = await fastify.pg.query(
      'INSERT INTO franchises (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')]
    );
    return reply.code(201).send(franchise);
  });

  // PUT /api/admin/franchises/:id — Update franchise (tenant-filtered)
  fastify.put('/franchises/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify franchise belongs to tenant
    if (request.franchise_id && request.params.id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot modify another franchise' });
    }

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

  // GET /api/admin/locations — List locations (tenant-filtered)
  fastify.get('/locations', async (request, reply) => {
    if (request.franchise_id) {
      const { rows } = await fastify.pg.query(
        `SELECT l.*, f.name AS franchise_name, f.slug AS franchise_slug
         FROM locations l JOIN franchises f ON f.id = l.franchise_id
         WHERE l.franchise_id = $1
         ORDER BY l.store_number`,
        [request.franchise_id]
      );
      return { locations: rows };
    }
    const { rows } = await fastify.pg.query(
      `SELECT l.*, f.name AS franchise_name, f.slug AS franchise_slug
       FROM locations l JOIN franchises f ON f.id = l.franchise_id
       ORDER BY f.name, l.store_number`
    );
    return { locations: rows };
  });

  // GET /api/admin/locations/:id — Get single location with full config (tenant-filtered)
  fastify.get('/locations/:id', async (request, reply) => {
    const query = request.franchise_id
      ? 'SELECT * FROM locations WHERE id = $1 AND franchise_id = $2'
      : 'SELECT * FROM locations WHERE id = $1';
    const params = request.franchise_id
      ? [request.params.id, request.franchise_id]
      : [request.params.id];

    const { rows: [location] } = await fastify.pg.query(query, params);
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

  // PUT /api/admin/locations/:id — Update location config (tenant-filtered)
  fastify.put('/locations/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify location belongs to tenant
    if (request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(404).send({ error: 'Location not found' });
    }

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

  // PATCH /api/admin/locations/:id — Partial update of location settings
  fastify.patch('/locations/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify location belongs to tenant
    if (request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(403).send({ error: 'Location not found or not owned' });
    }

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
    if (!fields.length) return reply.code(400).send({ error: 'No valid fields to update' });
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

  // GET /api/admin/franchises/:franchiseId/categories — List categories (tenant-filtered)
  fastify.get('/franchises/:franchiseId/categories', async (request, reply) => {
    if (request.franchise_id && request.params.franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot access another franchise' });
    }
    const { rows } = await fastify.pg.query(
      'SELECT * FROM menu_categories WHERE franchise_id = $1 ORDER BY display_order', [request.params.franchiseId]
    );
    return { categories: rows };
  });

  // POST /api/admin/categories — Create category (tenant-filtered)
  fastify.post('/categories', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    if (request.franchise_id && request.body.franchise_id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create categories for another franchise' });
    }
    const { franchise_id, name, slug, display_order } = request.body;
    const { rows: [cat] } = await fastify.pg.query(
      'INSERT INTO menu_categories (franchise_id, name, slug, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [franchise_id, name, slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), display_order || 0]
    );
    return reply.code(201).send(cat);
  });

  // PUT /api/admin/categories/:id — Update category
  fastify.put('/categories/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
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

  // GET /api/admin/franchises/:franchiseId/items — List menu items (tenant-filtered)
  fastify.get('/franchises/:franchiseId/items', async (request, reply) => {
    if (request.franchise_id && request.params.franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot access another franchise' });
    }
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

  // POST /api/admin/items — Create menu item (tenant-filtered)
  fastify.post('/items', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    if (request.franchise_id && request.body.franchise_id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create items for another franchise' });
    }
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

  // PUT /api/admin/items/:id — Update menu item
  fastify.put('/items/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify item belongs to tenant
    if (request.franchise_id) {
      const { rows: itemCheck } = await fastify.pg.query(
        'SELECT id FROM menu_items WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!itemCheck.length) return reply.code(404).send({ error: 'Item not found' });
    }

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

  // DELETE /api/admin/items/:id — Soft delete (tenant-filtered)
  fastify.delete('/items/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    if (request.franchise_id) {
      const { rows: itemCheck } = await fastify.pg.query(
        'SELECT id FROM menu_items WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!itemCheck.length) return reply.code(404).send({ error: 'Item not found' });
    }

    const { rows: [item] } = await fastify.pg.query(
      'UPDATE menu_items SET is_available = false, updated_at = NOW() WHERE id = $1 RETURNING *', [request.params.id]
    );
    if (!item) return reply.code(404).send({ error: 'Item not found' });
    return { message: 'Item deactivated', id: item.id };
  });

  // ==========================================
  // TOPPING MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/toppings (tenant-filtered)
  fastify.get('/franchises/:franchiseId/toppings', async (request, reply) => {
    if (request.franchise_id && request.params.franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot access another franchise' });
    }
    const { rows } = await fastify.pg.query(
      'SELECT * FROM toppings WHERE franchise_id = $1 ORDER BY is_premium, name', [request.params.franchiseId]
    );
    return { toppings: rows };
  });

  // POST /api/admin/franchises/:franchiseId/toppings — Create topping under franchise
  fastify.post('/franchises/:franchiseId/toppings', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    const franchiseId = request.params.franchiseId;
    if (request.franchise_id && franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create toppings for another franchise' });
    }
    // Verify franchise exists
    const { rows: [franchise] } = await fastify.pg.query('SELECT id FROM franchises WHERE id = $1', [franchiseId]);
    if (!franchise) return reply.code(404).send({ error: 'Franchise not found' });
    const { name, base_price, is_premium, is_available } = request.body;
    const { rows: [topping] } = await fastify.pg.query(
      'INSERT INTO toppings (franchise_id, name, base_price, is_premium, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [franchiseId, name, base_price || 1.50, is_premium || false, is_available !== undefined ? is_available : true]
    );
    return reply.code(201).send(topping);
  });

  // POST /api/admin/toppings — Create topping (legacy, franchise_id in body)
  fastify.post('/toppings', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    if (request.franchise_id && request.body.franchise_id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create toppings for another franchise' });
    }
    const { franchise_id, name, base_price, is_premium } = request.body;
    const { rows: [topping] } = await fastify.pg.query(
      'INSERT INTO toppings (franchise_id, name, base_price, is_premium) VALUES ($1, $2, $3, $4) RETURNING *',
      [franchise_id, name, base_price || 1.50, is_premium || false]
    );
    return reply.code(201).send(topping);
  });

  // PUT /api/admin/toppings/:id
  fastify.put('/toppings/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
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
    if (!requireWrite(request, reply)) return;
    const { rows: [topping] } = await fastify.pg.query(
      'UPDATE toppings SET is_available = false WHERE id = $1 RETURNING *', [request.params.id]
    );
    if (!topping) return reply.code(404).send({ error: 'Topping not found' });
    return { message: 'Topping deactivated', id: topping.id };
  });

  // ==========================================
  // SPECIALS MANAGEMENT
  // ==========================================

  // GET /api/admin/franchises/:franchiseId/specials (tenant-filtered)
  fastify.get('/franchises/:franchiseId/specials', async (request, reply) => {
    if (request.franchise_id && request.params.franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot access another franchise' });
    }
    const { rows } = await fastify.pg.query(
      'SELECT * FROM specials WHERE franchise_id = $1 ORDER BY name', [request.params.franchiseId]
    );
    return { specials: rows };
  });

  // POST /api/admin/franchises/:franchiseId/specials — Create special under franchise
  fastify.post('/franchises/:franchiseId/specials', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    const franchiseId = request.params.franchiseId;
    if (request.franchise_id && franchiseId !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create specials for another franchise' });
    }
    // Verify franchise exists
    const { rows: [franchise] } = await fastify.pg.query('SELECT id FROM franchises WHERE id = $1', [franchiseId]);
    if (!franchise) return reply.code(404).send({ error: 'Franchise not found' });
    const { name, description, discount_type, discount_value, applies_to, applies_to_id,
            day_of_week, start_time, end_time, start_date, end_date, is_active } = request.body;
    const { rows: [special] } = await fastify.pg.query(
      `INSERT INTO specials (franchise_id, name, description, discount_type, discount_value, applies_to, applies_to_id,
        day_of_week, start_time, end_time, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [franchiseId, name, description, discount_type || 'percentage', discount_value,
       applies_to || 'order', applies_to_id || null,
       day_of_week ? JSON.stringify(day_of_week) : null, start_time || null, end_time || null,
       start_date || null, end_date || null, is_active !== undefined ? is_active : true]
    );
    return reply.code(201).send(special);
  });

  // POST /api/admin/specials — Create special (legacy, franchise_id in body)
  fastify.post('/specials', async (request, reply) => {
    if (!requireWrite(request, reply)) return;
    if (request.franchise_id && request.body.franchise_id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create specials for another franchise' });
    }
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

  // PUT /api/admin/specials/:id
  fastify.put('/specials/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify special belongs to tenant
    if (request.franchise_id) {
      const { rows: specCheck } = await fastify.pg.query(
        'SELECT id FROM specials WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!specCheck.length) return reply.code(404).send({ error: 'Special not found' });
    }

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

  // DELETE /api/admin/specials/:id — Delete special
  fastify.delete('/specials/:id', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify special belongs to tenant
    if (request.franchise_id) {
      const { rows: specCheck } = await fastify.pg.query(
        'SELECT id FROM specials WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!specCheck.length) return reply.code(404).send({ error: 'Special not found' });
    }

    const { rowCount } = await fastify.pg.query('DELETE FROM specials WHERE id = $1', [request.params.id]);
    if (!rowCount) return reply.code(404).send({ error: 'Special not found' });
    return { message: 'Special deleted', id: request.params.id };
  });

  // ==========================================
  // STOCK MANAGEMENT
  // ==========================================

  // GET /api/admin/locations/:locationId/stock (tenant-filtered)
  fastify.get('/locations/:locationId/stock', async (request, reply) => {
    // Verify location belongs to tenant
    if (request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [request.params.locationId, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(404).send({ error: 'Location not found' });
    }

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

  // POST /api/admin/locations/:locationId/stock — Update stock (tenant-filtered)
  fastify.post('/locations/:locationId/stock', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    // Verify location belongs to tenant
    if (request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [request.params.locationId, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(404).send({ error: 'Location not found' });
    }

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

  // DELETE /api/admin/locations/:locationId/stock/:stockId
  fastify.delete('/locations/:locationId/stock/:stockId', async (request, reply) => {
    if (!requireWrite(request, reply)) return;

    const { rows: [row] } = await fastify.pg.query(
      'DELETE FROM location_stock WHERE id = $1 AND location_id = $2 RETURNING *',
      [request.params.stockId, request.params.locationId]
    );
    if (!row) return reply.code(404).send({ error: 'Stock entry not found' });
    return { message: 'Stock entry removed', id: row.id };
  });

  // ==========================================
  // API KEY MANAGEMENT (admin only)
  // ==========================================

  // GET /api/admin/api-keys — List API keys for this franchise
  fastify.get('/api-keys', async (request, reply) => {
    if (!request.api_key_permissions || !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Admin permission required' });
    }

    const { rows } = await fastify.pg.query(
      `SELECT id, key_prefix, name, franchise_id, permissions, rate_limit, is_active, last_used_at, created_at, expires_at
       FROM api_keys WHERE franchise_id = $1 ORDER BY created_at DESC`,
      [request.franchise_id]
    );
    return { api_keys: rows };
  });

  // POST /api/admin/api-keys — Create a new API key
  fastify.post('/api-keys', async (request, reply) => {
    if (!request.api_key_permissions || !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Admin permission required' });
    }

    const crypto = require('crypto');
    const { name, permissions = ['read'], rate_limit = 100, expires_at } = request.body;

    if (!name) return reply.code(400).send({ error: 'Name is required' });

    // Generate a random API key: sk_live_<32 random chars>
    const randomBytes = crypto.randomBytes(24).toString('base64url');
    const rawKey = `sk_live_${randomBytes}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    const { rows: [apiKey] } = await fastify.pg.query(
      `INSERT INTO api_keys (key_hash, key_prefix, name, franchise_id, permissions, rate_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, key_prefix, name, franchise_id, permissions, rate_limit, is_active, created_at, expires_at`,
      [keyHash, keyPrefix, name, request.franchise_id, JSON.stringify(permissions), rate_limit, expires_at || null]
    );

    // Return the raw key ONCE — this is the only time it will be visible
    return reply.code(201).send({
      ...apiKey,
      key: rawKey,
      warning: 'Store this key securely. It will not be shown again.',
    });
  });

  // DELETE /api/admin/api-keys/:id — Deactivate an API key
  fastify.delete('/api-keys/:id', async (request, reply) => {
    if (!request.api_key_permissions || !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Admin permission required' });
    }

    const { rows: [key] } = await fastify.pg.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 AND franchise_id = $2 RETURNING id, name, key_prefix',
      [request.params.id, request.franchise_id]
    );
    if (!key) return reply.code(404).send({ error: 'API key not found' });
    return { message: 'API key deactivated', id: key.id, name: key.name, prefix: key.key_prefix };
  });
};