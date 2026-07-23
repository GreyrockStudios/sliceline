const { v4: uuidv4 } = require('uuid');
const { getLocationMenu } = require('./menuHelpers');

module.exports = async function (fastify, opts) {
  // GET /api/menu/:locationId — Get full menu for a location (with overrides, stock, topping deps)
  fastify.get('/:locationId', async (request, reply) => {
    const menu = await getLocationMenu(fastify, request.params.locationId);
    if (!menu) return reply.code(404).send({ error: 'Location not found' });
    return menu;
  });

  // GET /api/menu/:locationId/specials — Get current specials for a location
  fastify.get('/:locationId/specials', async (request, reply) => {
    const menu = await getLocationMenu(fastify, request.params.locationId);
    if (!menu) return reply.code(404).send({ error: 'Location not found' });

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const activeSpecials = menu.specials.filter(s => {
      if (s.day_of_week && s.day_of_week.length && !s.day_of_week.includes(dayOfWeek)) return false;
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
    const { items } = request.body;
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

  // GET /api/menu/:locationId/topping-impact — Which pizzas are affected by a topping being out of stock?
  fastify.get('/:locationId/topping-impact', async (request, reply) => {
    const locationId = request.params.locationId;
    
    // Get all out-of-stock toppings at this location
    const { rows: oosToppings } = await fastify.pg.query(
      `SELECT ls.*, t.name AS topping_name
       FROM location_stock ls
       JOIN toppings t ON t.id = ls.item_id
       WHERE ls.location_id = $1 AND ls.item_type = 'topping' AND ls.stock_status = 'out_of_stock'`,
      [locationId]
    );

    if (!oosToppings.length) {
      return { out_of_stock_toppings: [], affected_pizzas: [] };
    }

    const oosIds = oosToppings.map(t => t.item_id);

    // Find pizzas that require any of these toppings
    const { rows: affectedPizzas } = await fastify.pg.query(
      `SELECT mi.id, mi.name, mi.slug, mit.topping_id, t.name AS topping_name, mit.is_required
       FROM menu_item_toppings mit
       JOIN menu_items mi ON mi.id = mit.menu_item_id
       JOIN toppings t ON t.id = mit.topping_id
       WHERE mit.topping_id = ANY($1)
       ORDER BY mi.name`,
      [oosIds]
    );

    // Group by pizza
    const pizzaMap = new Map();
    for (const row of affectedPizzas) {
      if (!pizzaMap.has(row.id)) {
        pizzaMap.set(row.id, { id: row.id, name: row.name, slug: row.slug, unavailable_toppings: [] });
      }
      if (row.is_required) {
        pizzaMap.get(row.id).unavailable_toppings.push(row.topping_name);
      }
    }

    const result = [...pizzaMap.values()];
    // Pizzas with any required topping out of stock are unavailable
    const unavailable = result.filter(p => p.unavailable_toppings.length > 0);
    const available_with_removal = result.filter(p => p.unavailable_toppings.length === 0);

    return {
      out_of_stock_toppings: oosToppings.map(t => ({ id: t.item_id, name: t.topping_name, notes: t.notes, expected_restock: t.expected_restock_at })),
      unavailable_pizzas: unavailable,
      available_with_topping_removed: available_with_removal,
    };
  });
};