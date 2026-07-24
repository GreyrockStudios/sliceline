'use strict';

const { getAdapter, listAdapters } = require('../pos');

/**
 * POS Integration Routes
 *
 * Routes:
 *   POST   /api/pos/:adapter/submit            — Submit order to POS
 *   GET    /api/pos/:adapter/status/:posOrderId — Check order status in POS
 *   POST   /api/pos/:adapter/sync-menu/:locationId — Sync menu from POS
 *   GET    /api/pos/:adapter/availability/:locationId — Check POS availability
 *   POST   /api/pos/:adapter/validate          — Validate order before submission
 */
module.exports = async function (fastify, opts) {

  // ─── Shared preHandler: validate adapter + load config from DB ────────

  fastify.addHook('preHandler', async (request, reply) => {
    const adapterName = request.params.adapter;
    const available = listAdapters();

    if (!available.includes(adapterName.toLowerCase())) {
      return reply.code(400).send({
        error: `Unknown POS adapter: "${adapterName}"`,
        available,
      });
    }

    // Look up franchise from request or query
    // POS config is per-franchise, so we need to identify the franchise
    let franchiseId = request.franchise_id || request.query.franchise_id || request.body?.franchise_id;

    // If we have a location_id, resolve its franchise
    if (!franchiseId && (request.query.location_id || request.body?.location_id)) {
      const locId = request.query.location_id || request.body?.location_id;
      try {
        const { rows } = await fastify.pg.query(
          'SELECT franchise_id FROM locations WHERE id = $1',
          [locId]
        );
        if (rows.length) franchiseId = rows[0].franchise_id;
      } catch (err) {
        fastify.log.warn({ err }, 'Failed to look up franchise from location_id');
      }
    }

    // Load POS config for this franchise + adapter
    let posConfig = {};
    if (franchiseId) {
      try {
        const { rows } = await fastify.pg.query(
          `SELECT config FROM pos_configs
           WHERE franchise_id = $1 AND adapter = $2 AND is_active = true
           LIMIT 1`,
          [franchiseId, adapterName.toLowerCase()]
        );
        if (rows.length) posConfig = rows[0].config || {};
      } catch (err) {
        fastify.log.warn({ err, adapter: adapterName, franchiseId }, 'Failed to load POS config from DB');
      }
    }

    // Merge: DB config < environment variables < request body config
    // Environment variable fallback: POS_{ADAPTER}_{KEY}
    const envPrefix = `POS_${adapterName.toUpperCase()}_`;
    const envConfig = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(envPrefix)) {
        const configKey = key.slice(envPrefix.length).toLowerCase();
        envConfig[configKey] = value;
      }
    }

    const mergedConfig = {
      ...posConfig,
      ...envConfig,
      ...(request.body?.config || {}),
    };

    request.posAdapter = getAdapter(adapterName, mergedConfig);
    request.posConfig = mergedConfig;
    request.franchise_id = franchiseId;
  });

  // ─── POST /api/pos/:adapter/submit ──────────────────────────────────

  fastify.post('/:adapter/submit', async (request, reply) => {
    const { order_id } = request.body || {};

    if (!order_id) {
      return reply.code(400).send({ error: 'order_id is required' });
    }

    // Load order from DB
    const { rows: orders } = await fastify.pg.query(
      `SELECT o.*, json_agg(json_build_object(
          'id', oi.id, 'name', oi.name, 'quantity', oi.quantity,
          'unit_price', oi.unit_price, 'total_price', oi.total_price,
          'size', oi.size, 'customizations', oi.customizations,
          'special_requests', oi.special_requests, 'menu_item_id', oi.menu_item_id
        )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [order_id]
    );

    if (!orders.length) {
      return reply.code(404).send({ error: 'Order not found' });
    }

    const order = orders[0];

    try {
      const result = await request.posAdapter.submitOrder(order);

      // Update order with POS reference
      await fastify.pg.query(
        `UPDATE orders SET pos_status = 'submitted', pos_order_id = $1, pos_submitted_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [result.posOrderId, order_id]
      );

      return {
        success: true,
        order_id,
        pos_order_id: result.posOrderId,
        status: result.status,
        raw: result.raw,
      };
    } catch (err) {
      fastify.log.error({ err, order_id, adapter: request.params.adapter }, 'POS submit failed');

      // Mark POS submission as failed but don't block the order
      await fastify.pg.query(
        `UPDATE orders SET pos_status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [order_id]
      );

      return reply.code(502).send({
        error: 'POS submission failed',
        message: err.message,
        order_id,
      });
    }
  });

  // ─── GET /api/pos/:adapter/status/:posOrderId ──────────────────────

  fastify.get('/:adapter/status/:posOrderId', async (request, reply) => {
    const { posOrderId } = request.params;

    try {
      const result = await request.posAdapter.getOrderStatus(posOrderId);
      return { pos_order_id: posOrderId, ...result };
    } catch (err) {
      fastify.log.error({ err, posOrderId, adapter: request.params.adapter }, 'POS status check failed');
      return reply.code(502).send({
        error: 'POS status check failed',
        message: err.message,
      });
    }
  });

  // ─── POST /api/pos/:adapter/sync-menu/:locationId ──────────────────

  fastify.post('/:adapter/sync-menu/:locationId', async (request, reply) => {
    const { locationId } = request.params;

    try {
      const result = await request.posAdapter.syncMenu(locationId);

      // Update last_sync_at in pos_configs
      if (request.franchise_id) {
        await fastify.pg.query(
          `UPDATE pos_configs SET last_sync_at = NOW(), updated_at = NOW()
           WHERE franchise_id = $1 AND adapter = $2`,
          [request.franchise_id, request.params.adapter.toLowerCase()]
        );
      }

      return {
        success: true,
        location_id: locationId,
        categories_count: result.categories.length,
        items_count: result.items.length,
        ...result,
      };
    } catch (err) {
      fastify.log.error({ err, locationId, adapter: request.params.adapter }, 'POS menu sync failed');
      return reply.code(502).send({
        error: 'POS menu sync failed',
        message: err.message,
      });
    }
  });

  // ─── GET /api/pos/:adapter/availability/:locationId ─────────────────

  fastify.get('/:adapter/availability/:locationId', async (request, reply) => {
    const { locationId } = request.params;

    try {
      const result = await request.posAdapter.getAvailability(locationId);
      return { location_id: locationId, ...result };
    } catch (err) {
      fastify.log.error({ err, locationId, adapter: request.params.adapter }, 'POS availability check failed');
      return reply.code(502).send({
        error: 'POS availability check failed',
        message: err.message,
      });
    }
  });

  // ─── POST /api/pos/:adapter/validate ────────────────────────────────

  fastify.post('/:adapter/validate', async (request, reply) => {
    const { order_id, order } = request.body || {};

    // Either pass an order_id to load from DB, or pass the order directly
    let orderData = order;

    if (order_id && !orderData) {
      const { rows: orders } = await fastify.pg.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id]
      );
      if (!orders.length) {
        return reply.code(404).send({ error: 'Order not found' });
      }
      orderData = orders[0];
    }

    if (!orderData) {
      return reply.code(400).send({ error: 'order_id or order object is required' });
    }

    try {
      const result = await request.posAdapter.validateOrder(orderData);
      return result;
    } catch (err) {
      fastify.log.error({ err, adapter: request.params.adapter }, 'POS order validation failed');
      return reply.code(502).send({
        error: 'POS order validation failed',
        message: err.message,
      });
    }
  });
};