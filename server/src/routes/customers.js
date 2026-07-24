// SliceLine Customer API — Tenant-filtered
module.exports = async function (fastify, opts) {
  // GET /api/customers — Lookup customer by phone or name (tenant-filtered)
  fastify.get('/', async (request, reply) => {
    const { phone, name, limit = 10 } = request.query;

    // If authenticated, only show customers with orders in this franchise's locations
    const franchiseFilter = request.franchise_id
      ? ` AND id IN (SELECT DISTINCT customer_id FROM orders WHERE location_id IN (SELECT id FROM locations WHERE franchise_id = '${request.franchise_id}'))`
      : '';

    if (phone) {
      // Flexible phone matching: strip formatting, match by last 10 digits or partial
      const digits = phone.replace(/[^0-9]/g, '');
      if (request.franchise_id) {
        const { rows } = await fastify.pg.query(
          `SELECT * FROM customers WHERE
           REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') ILIKE $1
           AND id IN (SELECT DISTINCT customer_id FROM orders WHERE location_id IN (SELECT id FROM locations WHERE franchise_id = $2))
           ORDER BY total_orders DESC LIMIT $3`,
          [`%${digits}%`, request.franchise_id, limit]
        );
        return { customers: rows };
      }
      const { rows } = await fastify.pg.query(
        `SELECT * FROM customers WHERE
         REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') ILIKE $1
         ORDER BY total_orders DESC LIMIT $2`,
        [`%${digits}%`, limit]
      );
      return { customers: rows };
    }

    if (name) {
      if (request.franchise_id) {
        const { rows } = await fastify.pg.query(
          `SELECT * FROM customers WHERE name ILIKE $1
           AND id IN (SELECT DISTINCT customer_id FROM orders WHERE location_id IN (SELECT id FROM locations WHERE franchise_id = $2))
           ORDER BY total_orders DESC LIMIT $3`,
          [`%${name}%`, request.franchise_id, limit]
        );
        return { customers: rows };
      }
      const { rows } = await fastify.pg.query(
        'SELECT * FROM customers WHERE name ILIKE $1 ORDER BY total_orders DESC LIMIT $2',
        [`%${name}%`, limit]
      );
      return { customers: rows };
    }

    // Return recent customers (tenant-filtered)
    if (request.franchise_id) {
      const { rows } = await fastify.pg.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON o.customer_id = c.id
         JOIN locations l ON l.id = o.location_id
         WHERE l.franchise_id = $1
         ORDER BY c.created_at DESC LIMIT $2`,
        [request.franchise_id, limit]
      );
      return { customers: rows };
    }

    const { rows } = await fastify.pg.query(
      'SELECT * FROM customers ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return { customers: rows };
  });

  // GET /api/customers/:id — Get customer details with order history (tenant-filtered)
  fastify.get('/:id', async (request, reply) => {
    const { rows: [customer] } = await fastify.pg.query(
      'SELECT * FROM customers WHERE id = $1', [request.params.id]
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    // Filter orders by franchise if authenticated
    let ordersQuery, ordersParams;
    if (request.franchise_id) {
      ordersQuery = `SELECT id, order_number, status, order_type, total, created_at
                     FROM orders WHERE customer_id = $1 AND location_id IN (SELECT id FROM locations WHERE franchise_id = $2)
                     ORDER BY created_at DESC LIMIT 20`;
      ordersParams = [request.params.id, request.franchise_id];
    } else {
      ordersQuery = `SELECT id, order_number, status, order_type, total, created_at
                     FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`;
      ordersParams = [request.params.id];
    }

    const { rows: orders } = await fastify.pg.query(ordersQuery, ordersParams);
    customer.orders = orders;
    return customer;
  });

  // POST /api/customers — Create or update customer
  fastify.post('/', async (request, reply) => {
    const { phone, name, email, default_location_id } = request.body;
    if (!phone) return reply.code(400).send({ error: 'Phone number is required' });

    // Verify default_location_id belongs to tenant if authenticated
    if (default_location_id && request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [default_location_id, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(403).send({ error: 'Location does not belong to your franchise' });
    }

    // Upsert by phone
    const { rows: [existing] } = await fastify.pg.query(
      'SELECT id FROM customers WHERE phone = $1', [phone]
    );

    if (existing) {
      const updates = [];
      const values = [];
      let idx = 1;
      for (const [key, value] of Object.entries(request.body)) {
        if (['name', 'email', 'default_location_id'].includes(key) && value) {
          updates.push(`${key} = $${idx++}`);
          values.push(value);
        }
      }
      if (updates.length) {
        updates.push('updated_at = NOW()');
        values.push(existing.id);
        const { rows: [updated] } = await fastify.pg.query(
          `UPDATE customers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values
        );
        return updated;
      }
      const { rows: [row] } = await fastify.pg.query('SELECT * FROM customers WHERE id = $1', [existing.id]);
      return row;
    }

    const { rows: [customer] } = await fastify.pg.query(
      `INSERT INTO customers (phone, name, email, default_location_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [phone, name || null, email || null, default_location_id || null]
    );
    return reply.code(201).send(customer);
  });
};