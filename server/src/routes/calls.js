module.exports = async function (fastify, opts) {
  // GET /api/calls — List call transcripts with filters (tenant-filtered)
  fastify.get('/', async (request, reply) => {
    const { location_id, status, date, limit = 50, offset = 0 } = request.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Tenant isolation: filter by franchise_id if authenticated
    if (request.franchise_id) {
      conditions.push(`l.franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    }

    if (location_id) { conditions.push(`c.location_id = $${paramIdx++}`); params.push(location_id); }
    if (status) { conditions.push(`c.status = $${paramIdx++}`); params.push(status); }
    if (date) { conditions.push(`DATE(c.started_at) = $${paramIdx++}`); params.push(date); }

    let query = `SELECT c.*, l.name AS location_name, l.store_number
                 FROM calls c LEFT JOIN locations l ON l.id = c.location_id`;
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY c.started_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const { rows } = await fastify.pg.query(query, params);
    return { calls: rows };
  });

  // GET /api/calls/:id — Get call transcript + segments (tenant-filtered)
  fastify.get('/:id', async (request, reply) => {
    const conditions = ['c.id = $1'];
    const params = [request.params.id];
    let paramIdx = 2;

    if (request.franchise_id) {
      conditions.push(`l.franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    }

    const { rows: calls } = await fastify.pg.query(
      `SELECT c.*, l.name AS location_name, l.store_number, o.order_number
       FROM calls c
       LEFT JOIN locations l ON l.id = c.location_id
       LEFT JOIN orders o ON o.id = c.order_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (!calls.length) return reply.code(404).send({ error: 'Call not found' });

    const call = calls[0];

    // Get transcript segments
    const { rows: segments } = await fastify.pg.query(
      'SELECT * FROM call_segments WHERE call_id = $1 ORDER BY timestamp_ms ASC',
      [call.id]
    );

    call.segments = segments;

    // Mark as reviewed if someone accesses it (for verification workflow)
    return call;
  });

  // PATCH /api/calls/:id/verify — Mark a call as verified for order accuracy
  fastify.patch('/:id/verify', async (request, reply) => {
    // Require write permission
    if (request.api_key_permissions && !request.api_key_permissions.includes('write') && !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { verified, notes } = request.body;

    // Verify the call belongs to this tenant
    if (request.franchise_id) {
      const { rows: existing } = await fastify.pg.query(
        `SELECT c.id FROM calls c JOIN locations l ON l.id = c.location_id WHERE c.id = $1 AND l.franchise_id = $2`,
        [request.params.id, request.franchise_id]
      );
      if (!existing.length) return reply.code(404).send({ error: 'Call not found' });
    }

    const { rows } = await fastify.pg.query(
      `UPDATE calls SET order_accuracy_verified = $1, verification_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [verified, notes || null, request.params.id]
    );

    if (!rows.length) return reply.code(404).send({ error: 'Call not found' });
    return rows[0];
  });

  // GET /api/calls/:id/transcript — Get just the transcript text (tenant-filtered)
  fastify.get('/:id/transcript', async (request, reply) => {
    const conditions = ['c.id = $1'];
    const params = [request.params.id];
    let paramIdx = 2;

    if (request.franchise_id) {
      conditions.push(`l.franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    }

    const { rows } = await fastify.pg.query(
      `SELECT c.transcript_text FROM calls c LEFT JOIN locations l ON l.id = c.location_id WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (!rows.length) return reply.code(404).send({ error: 'Call not found' });
    return { transcript: rows[0].transcript_text };
  });
};