// SliceLine Customer API
module.exports = async function (fastify, opts) {
  // GET /api/customers — Lookup customer by phone or name
  fastify.get('/', async (request, reply) => {
    const { phone, name, limit = 10 } = request.query;

    if (phone) {
      // Flexible phone matching: strip formatting, match by last 10 digits or partial
      const digits = phone.replace(/[^0-9]/g, '');
      const { rows } = await fastify.pg.query(
        `SELECT * FROM customers WHERE
         REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') ILIKE $1
         ORDER BY total_orders DESC LIMIT $2`,
        [`%${digits}%`, limit]
      );
      return { customers: rows };
    }

    if (name) {
      const { rows } = await fastify.pg.query(
        'SELECT * FROM customers WHERE name ILIKE $1 ORDER BY total_orders DESC LIMIT $2',
        [`%${name}%`, limit]
      );
      return { customers: rows };
    }

    // Return recent customers
    const { rows } = await fastify.pg.query(
      'SELECT * FROM customers ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return { customers: rows };
  });

  // GET /api/customers/:id — Get customer details with order history
  fastify.get('/:id', async (request, reply) => {
    const { rows: [customer] } = await fastify.pg.query(
      'SELECT * FROM customers WHERE id = $1', [request.params.id]
    );
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    const { rows: orders } = await fastify.pg.query(
      `SELECT id, order_number, status, order_type, total, created_at
       FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [request.params.id]
    );

    customer.orders = orders;
    return customer;
  });

  // POST /api/customers — Create or update customer
  fastify.post('/', async (request, reply) => {
    const { phone, name, email, default_location_id } = request.body;
    if (!phone) return reply.code(400).send({ error: 'Phone number is required' });

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