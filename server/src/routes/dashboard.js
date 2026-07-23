module.exports = async function (fastify, opts) {
  // GET /api/dashboard/:locationId — Live dashboard data for a store
  fastify.get('/:locationId', async (request, reply) => {
    const { locationId } = request.params;

    // Verify location exists
    const { rows: [location] } = await fastify.pg.query('SELECT * FROM locations WHERE id = $1', [locationId]);
    if (!location) return reply.code(404).send({ error: 'Location not found' });

    // Active orders
    const { rows: activeOrders } = await fastify.pg.query(
      `SELECT id, order_number, customer_name, order_type, status, total, created_at, estimated_ready_time
       FROM orders
       WHERE location_id = $1 AND status IN ('pending', 'confirmed', 'preparing', 'ready')
       ORDER BY created_at ASC`,
      [locationId]
    );

    // Attach items to active orders
    for (const order of activeOrders) {
      const { rows: items } = await fastify.pg.query(
        'SELECT name, size, quantity, unit_price, total_price, customizations, special_requests FROM order_items WHERE order_id = $1 ORDER BY created_at',
        [order.id]
      );
      order.items = items;
    }

    // Recent completed orders (last 24h)
    const { rows: recentOrders } = await fastify.pg.query(
      `SELECT id, order_number, customer_name, order_type, status, total, created_at
       FROM orders
       WHERE location_id = $1 AND status IN ('completed', 'cancelled')
         AND created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 20`,
      [locationId]
    );

    // Active calls
    const { rows: activeCalls } = await fastify.pg.query(
      `SELECT id, retell_call_id, caller_phone, caller_name, status, started_at
       FROM calls
       WHERE location_id = $1 AND status = 'in_progress'
       ORDER BY started_at ASC`,
      [locationId]
    );

    // Recent calls (last 24h)
    const { rows: recentCalls } = await fastify.pg.query(
      `SELECT id, retell_call_id, caller_phone, caller_name, status, duration_seconds, started_at, order_accuracy_verified
       FROM calls
       WHERE location_id = $1 AND status != 'in_progress'
         AND started_at >= NOW() - INTERVAL '24 hours'
       ORDER BY started_at DESC LIMIT 20`,
      [locationId]
    );

    // Stats
    const { rows: [stats] } = await fastify.pg.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('completed')) AS orders_completed_24h,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS orders_cancelled_24h,
         COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) AS revenue_24h,
         AVG(total) FILTER (WHERE status = 'completed') AS avg_order_value
       FROM orders
       WHERE location_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [locationId]
    );

    // Average call duration (last 24h)
    const { rows: [callDur] } = await fastify.pg.query(
      `SELECT COALESCE(AVG(duration_seconds), 0) AS avg_call_duration
       FROM calls
       WHERE location_id = $1 AND status = 'completed'
         AND started_at >= NOW() - INTERVAL '24 hours'`,
      [locationId]
    );

    // Stock alerts
    const { rows: stockAlerts } = await fastify.pg.query(
      `SELECT ls.item_type, ls.item_id, ls.stock_status, ls.quantity, ls.notes, ls.expected_restock_at,
              CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
       FROM location_stock ls
       LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
       LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
       WHERE ls.location_id = $1 AND ls.stock_status != 'in_stock'
       ORDER BY ls.updated_at DESC`,
      [locationId]
    );

    // Active specials
    const { rows: specials } = await fastify.pg.query(
      `SELECT s.* FROM specials s
       WHERE s.franchise_id = $1 AND s.is_active = true
       AND (s.start_date IS NULL OR s.start_date <= CURRENT_DATE)
       AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)`,
      [location.franchise_id]
    );

    return {
      location: {
        id: location.id,
        name: location.name,
        store_number: location.store_number,
        phone: location.phone,
        address: `${location.street}, ${location.city}, ${location.state} ${location.zip}`,
      },
      active_orders: activeOrders,
      recent_orders: recentOrders,
      active_calls: activeCalls,
      recent_calls: recentCalls,
      stats: {
        orders_completed_24h: parseInt(stats?.orders_completed_24h || 0),
        orders_cancelled_24h: parseInt(stats?.orders_cancelled_24h || 0),
        revenue_24h: parseFloat(stats?.revenue_24h || 0),
        avg_order_value: parseFloat(stats?.avg_order_value || 0),
        avg_call_duration: parseFloat(callDur?.avg_call_duration || stats?.avg_call_duration || 0),
      },
      stock_alerts: stockAlerts,
      active_specials: specials,
    };
  });

  // GET /api/dashboard/:locationId/stats — Quick stats endpoint
  fastify.get('/:locationId/stats', async (request, reply) => {
    const { locationId } = request.params;

    const { rows: [orderStats] } = await fastify.pg.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')) AS active_orders,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS orders_last_24h,
         COALESCE(SUM(total) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS revenue_last_24h
       FROM orders WHERE location_id = $1`,
      [locationId]
    );

    const { rows: [callStats] } = await fastify.pg.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'in_progress') AS active_calls
       FROM calls WHERE location_id = $1`,
      [locationId]
    );

    return {
      active_orders: parseInt(orderStats?.active_orders || 0),
      active_calls: parseInt(callStats?.active_calls || 0),
      orders_last_24h: parseInt(orderStats?.orders_last_24h || 0),
      revenue_last_24h: parseFloat(orderStats?.revenue_last_24h || 0),
    };
  });

  // GET /api/dashboard/:locationId/stream — SSE for real-time updates
  fastify.get('/:locationId/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const locationId = request.params.locationId;

    // Send initial heartbeat
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const { rows: [stats] } = await fastify.pg.query(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')) AS active_orders,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS orders_last_24h
           FROM orders WHERE location_id = $1`,
          [locationId]
        );
        const { rows: activeOrders } = await fastify.pg.query(
          `SELECT id, order_number, customer_name, order_type, status, total, created_at
           FROM orders WHERE location_id = $1 AND status IN ('pending', 'confirmed', 'preparing', 'ready')
           ORDER BY created_at ASC`, [locationId]
        );
        reply.raw.write(`data: ${JSON.stringify({
          type: 'update',
          active_orders: parseInt(stats?.active_orders || 0),
          orders: activeOrders.map(o => ({
            id: o.id, order_number: o.order_number, customer_name: o.customer_name,
            order_type: o.order_type, status: o.status, total: Number(o.total), created_at: o.created_at
          }))
        })}\n\n`);
      } catch (err) {
        // Connection likely closed
      }
    }, 5000);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
};