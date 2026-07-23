module.exports = async function (fastify, opts) {
  // GET /api/calls — List call transcripts with filters
  fastify.get('/', async (request, reply) => {
    const { location_id, status, date, limit = 50, offset = 0 } = request.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

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

  // GET /api/calls/:id — Get call transcript + segments
  fastify.get('/:id', async (request, reply) => {
    const { rows: calls } = await fastify.pg.query(
      `SELECT c.*, l.name AS location_name, l.store_number, o.order_number
       FROM calls c
       LEFT JOIN locations l ON l.id = c.location_id
       LEFT JOIN orders o ON o.id = c.order_id
       WHERE c.id = $1`,
      [request.params.id]
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
    const { verified, notes } = request.body;

    const { rows } = await fastify.pg.query(
      `UPDATE calls SET order_accuracy_verified = $1, verification_notes = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [verified, notes || null, request.params.id]
    );

    if (!rows.length) return reply.code(404).send({ error: 'Call not found' });
    return rows[0];
  });

  // GET /api/calls/:id/transcript — Get just the transcript text
  fastify.get('/:id/transcript', async (request, reply) => {
    const { rows } = await fastify.pg.query(
      'SELECT transcript_text FROM calls WHERE id = $1',
      [request.params.id]
    );

    if (!rows.length) return reply.code(404).send({ error: 'Call not found' });
    return { transcript: rows[0].transcript_text };
  });
};