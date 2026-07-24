const { v4: uuidv4 } = require('uuid');

module.exports = async function (fastify, opts) {
  // GET /api/locations — List all locations (tenant-filtered when authenticated)
  fastify.get('/', async (request, reply) => {
    const { franchise_id, city, is_active } = request.query;

    let query = 'SELECT id, franchise_id, store_number, name, phone, email, street, city, state, zip, latitude, longitude, timezone, is_active, delivery_radius_km FROM locations';
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Tenant isolation: always filter by authenticated franchise
    if (request.franchise_id) {
      conditions.push(`franchise_id = $${paramIdx++}`);
      params.push(request.franchise_id);
    } else if (franchise_id) {
      conditions.push(`franchise_id = $${paramIdx++}`);
      params.push(franchise_id);
    }

    if (city) { conditions.push(`city ILIKE $${paramIdx++}`); params.push(`${city}%`); }
    if (is_active !== undefined) { conditions.push(`is_active = $${paramIdx++}`); params.push(is_active === 'true'); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY store_number';

    const { rows } = await fastify.pg.query(query, params);
    return rows;
  });

  // GET /api/locations/:id — Get location details (tenant-filtered)
  fastify.get('/:id', async (request, reply) => {
    const query = request.franchise_id
      ? 'SELECT * FROM locations WHERE id = $1 AND franchise_id = $2'
      : 'SELECT * FROM locations WHERE id = $1';
    const params = request.franchise_id
      ? [request.params.id, request.franchise_id]
      : [request.params.id];

    const { rows } = await fastify.pg.query(query, params);
    if (!rows.length) return reply.code(404).send({ error: 'Location not found' });
    return rows[0];
  });

  // POST /api/locations/nearest — Find nearest location(s) (tenant-filtered)
  fastify.post('/nearest', async (request, reply) => {
    let { latitude, longitude, address, radius_km, limit } = request.body;

    // Geocode address if no coordinates provided
    if ((!latitude || !longitude) && address) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return reply.code(501).send({
          error: 'Geocoding not configured. Set GOOGLE_MAPS_API_KEY or provide latitude and longitude.'
        });
      }
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=ca`;
        const resp = await fetch(geocodeUrl);
        const data = await resp.json();
        if (data.status === 'OK' && data.results.length) {
          latitude = data.results[0].geometry.location.lat;
          longitude = data.results[0].geometry.location.lng;
        } else {
          return reply.code(404).send({ error: 'Could not geocode that address. Please try a more specific address.' });
        }
      } catch (err) {
        return reply.code(500).send({ error: 'Geocoding service error. Please try again or provide coordinates.' });
      }
    }

    if (!latitude || !longitude) {
      return reply.code(400).send({ error: 'Provide latitude and longitude, or address for geocoding.' });
    }

    const maxRadius = radius_km || 50;
    const maxResults = limit || 5;

    // If tenant-scoped, only search within their franchise
    let query, params;
    if (request.franchise_id) {
      query = `
        SELECT id, store_number, name, phone, street, city, state, zip,
               latitude, longitude, timezone, delivery_radius_km,
               delivery_enabled, delivery_fee, delivery_min_order, delivery_zones,
               hours, phone_greeting,
               ROUND((2 * 6371 * ASIN(
                 SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                      COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                      POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
               ))::numeric, 2) AS distance_km
        FROM locations
        WHERE is_active = true AND franchise_id = $4
          AND (2 * 6371 * ASIN(
                 SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                      COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                      POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
               ) <= $3)
        ORDER BY distance_km ASC
        LIMIT $5`;
      params = [latitude, longitude, maxRadius, request.franchise_id, maxResults];
    } else {
      query = `
        SELECT id, store_number, name, phone, street, city, state, zip,
               latitude, longitude, timezone, delivery_radius_km,
               delivery_enabled, delivery_fee, delivery_min_order, delivery_zones,
               hours, phone_greeting,
               ROUND((2 * 6371 * ASIN(
                 SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                      COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                      POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
               ))::numeric, 2) AS distance_km
        FROM locations
        WHERE is_active = true
          AND (2 * 6371 * ASIN(
                 SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                      COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                      POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
               ) <= $3)
        ORDER BY distance_km ASC
        LIMIT $4`;
      params = [latitude, longitude, maxRadius, maxResults];
    }

    const { rows } = await fastify.pg.query(query, params);

    // Add delivery info and open/closed status
    const now = new Date();
    const results = rows.map(loc => {
      const dayHours = (loc.hours || []).find(h => h.day === now.getDay());
      const currentTime = now.toTimeString().slice(0, 5);
      const isOpen = dayHours && !dayHours.is_closed && currentTime >= (dayHours.open || '00:00') && currentTime <= (dayHours.close || '23:59');
      const deliveryInfo = { can_deliver: false, delivery_fee: 0, delivery_min_order: 0 };
      if (loc.delivery_enabled && loc.distance_km <= (loc.delivery_radius_km || 8)) {
        deliveryInfo.can_deliver = true;
        deliveryInfo.delivery_min_order = Number(loc.delivery_min_order || 0);
        const zones = loc.delivery_zones || [];
        const applicableZone = zones.sort((a, b) => (a.radius_km || 0) - (b.radius_km || 0)).find(z => loc.distance_km <= (z.radius_km || 0));
        deliveryInfo.delivery_fee = applicableZone ? Number(applicableZone.fee || 0) : Number(loc.delivery_fee || 0);
      }
      return { ...loc, is_open: isOpen, delivery: deliveryInfo };
    });

    return { locations: results };
  });

  // POST /api/locations — Create a new location (tenant-scoped)
  fastify.post('/', async (request, reply) => {
    // Require write permission
    if (request.api_key_permissions && !request.api_key_permissions.includes('write') && !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const franchise_id = request.franchise_id || request.body.franchise_id;

    // If authenticated, force franchise_id to the authenticated user's franchise
    if (request.franchise_id && request.body.franchise_id && request.body.franchise_id !== request.franchise_id) {
      return reply.code(403).send({ error: 'Cannot create locations for another franchise' });
    }

    const { store_number, name, phone, email, street, city, state, zip, latitude, longitude, timezone, delivery_radius_km } = request.body;

    const { rows } = await fastify.pg.query(
      `INSERT INTO locations (franchise_id, store_number, name, phone, email, street, city, state, zip, latitude, longitude, timezone, delivery_radius_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [franchise_id, store_number, name, phone, email, street, city, state, zip, latitude, longitude, timezone || 'America/New_York', delivery_radius_km || 8]
    );

    return reply.code(201).send(rows[0]);
  });

  // PATCH /api/locations/:id — Update a location (tenant-filtered)
  fastify.patch('/:id', async (request, reply) => {
    // Require write permission
    if (request.api_key_permissions && !request.api_key_permissions.includes('write') && !request.api_key_permissions.includes('admin')) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    // Verify location belongs to tenant
    if (request.franchise_id) {
      const { rows: locCheck } = await fastify.pg.query(
        'SELECT id FROM locations WHERE id = $1 AND franchise_id = $2',
        [request.params.id, request.franchise_id]
      );
      if (!locCheck.length) return reply.code(404).send({ error: 'Location not found' });
    }

    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(request.body)) {
      if (['name', 'phone', 'email', 'street', 'city', 'state', 'zip', 'latitude', 'longitude', 'timezone', 'is_active', 'delivery_radius_km'].includes(key)) {
        fields.push(`${key} = $${paramIdx++}`);
        values.push(value);
      }
    }

    if (!fields.length) return reply.code(400).send({ error: 'No valid fields to update' });

    fields.push(`updated_at = NOW()`);
    values.push(request.params.id);

    const { rows } = await fastify.pg.query(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (!rows.length) return reply.code(404).send({ error: 'Location not found' });
    return rows[0];
  });
};