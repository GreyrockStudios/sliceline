const { v4: uuidv4 } = require('uuid');
const { getAdapter, listAdapters } = require('../pos');

// SliceLine Vapi AI Integration
// Handles: Vapi custom function tool calls
// Vapi sends: { message: { toolCallList: [{ id, name, arguments }] } }
// Expects response: { results: [{ toolCallId, result/error }] } with HTTP 200

// Import shared tool handlers from retell.js
// We'll re-use the same switch-case logic but wrapped for Vapi format

module.exports = async function (fastify, opts) {
  // POST /api/vapi/tool-call — Handle Vapi custom function tool calls
  // Vapi sends tool calls in different formats depending on configuration:
  //   Format 1 (message): { message: { type: "tool-calls", toolCallList: [{ id, name, arguments }] } }
  //   Format 2 (direct):  { id, name, arguments, ... } — single tool call at top level
  //   Format 3 (function-call): { type: "function-call", function: { name, arguments }, call: { id } }
  fastify.post('/tool-call', async (request, reply) => {
    const body = request.body;

    // Log the full request body for debugging
    fastify.log.info({ body: JSON.stringify(body).substring(0, 2000) }, 'Vapi raw request');

    // Vapi sends tool calls with function name nested inside a "function" object:
    //   { id, type: "function", function: { name, arguments } }
    // We normalize to { id, name, arguments } for our handler.
    function normalizeToolCall(tc) {
      if (!tc) return null;
      // Already flat format
      if (tc.name && typeof tc.name === 'string') return tc;
      // Nested format: { function: { name, arguments } }
      if (tc.function?.name) {
        return {
          id: tc.id || 'unknown',
          name: tc.function.name,
          arguments: tc.function.arguments || {}
        };
      }
      return null;
    }

    // Try multiple formats to extract tool calls
    let rawList = [];

    // Format 1: { message: { toolCallList: [...] } } — Vapi's actual format
    if (body?.message?.toolCallList?.length) {
      rawList = body.message.toolCallList;
    }
    // Format 2: { message: { toolCalls: [...] } } — alternate key
    else if (body?.message?.toolCalls?.length) {
      rawList = body.message.toolCalls;
    }
    // Format 3: Single tool call at top level { id, name/function, ... }
    else if (body?.name || body?.function?.name) {
      rawList = [body];
    }
    // Format 4: { type: "function-call", ... }
    else if (body?.type === 'function-call' || body?.message?.type === 'function-call') {
      rawList = [body?.message || body];
    }
    // Format 5: Array of tool calls directly
    else if (Array.isArray(body) && (body[0]?.name || body[0]?.function?.name)) {
      rawList = body;
    }

    // Normalize all tool calls
    const toolCallList = rawList.map(normalizeToolCall).filter(Boolean);

    if (!toolCallList.length) {
      fastify.log.error({ body: JSON.stringify(body).substring(0, 1000) }, 'Could not parse Vapi tool call format');
      return reply.code(200).send({
        results: [{
          toolCallId: 'unknown',
          error: 'Could not parse tool call. Check server logs for raw request format.'
        }]
      });
    }

    fastify.log.info({ toolCount: toolCallList.length, tools: toolCallList.map(t => t.name) }, 'Vapi tool calls');

    const results = [];

    for (const toolCall of toolCallList) {
      const { id: toolCallId, name: tool_name, arguments: parameters } = toolCall;

      try {
        const result = await executeTool(fastify, tool_name, parameters || {});
        // Vapi expects result to be a string (single-line, no \n)
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

        results.push({
          toolCallId,
          result: resultStr
        });
      } catch (err) {
        fastify.log.error({ err, tool: tool_name }, 'Vapi tool call error');
        results.push({
          toolCallId,
          error: `Error executing ${tool_name}: ${err.message}`
        });
      }
    }

    return reply.code(200).send({ results });
  });

  // GET /api/vapi/health — Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'sliceline-vapi' };
  });
};

// Shared tool execution logic (same as retell.js but as a standalone function)
async function executeTool(fastify, tool_name, parameters) {
  const { getLocationMenu } = require('./menuHelpers');

  switch (tool_name) {
    case 'get_menu': {
      const menu = await getLocationMenu(fastify, parameters.location_id);
      if (!menu) return { error: 'Location not found' };
      return menu;
    }

    case 'get_location_info': {
      const { rows: [loc] } = await fastify.pg.query('SELECT * FROM locations WHERE id = $1', [parameters.location_id]);
      if (!loc) return { error: 'Location not found' };

      const now = new Date();
      const dayHours = (loc.hours || []).find(h => h.day === now.getDay());
      const currentTime = now.toTimeString().slice(0, 5);
      const isOpen = dayHours && !dayHours.is_closed && currentTime >= (dayHours.open || '00:00') && currentTime <= (dayHours.close || '23:59');

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formattedHours = (loc.hours || []).map(h => {
        const day = dayNames[h.day] || 'Unknown';
        if (h.is_closed) return `${day}: Closed`;
        return `${day}: ${h.open} - ${h.close}`;
      });

      return {
        id: loc.id, name: loc.name, store_number: loc.store_number,
        phone: loc.phone,
        address: `${loc.street}, ${loc.city}, ${loc.state} ${loc.zip}`,
        is_open: isOpen, current_time: currentTime, hours: formattedHours,
        phone_greeting: loc.phone_greeting || 'Thank you for calling Demo Pizza! How can I help you today?',
        delivery: {
          enabled: loc.delivery_enabled,
          fee: Number(loc.delivery_fee || 0),
          min_order: Number(loc.delivery_min_order || 0),
          zones: loc.delivery_zones || [],
          radius_km: loc.delivery_radius_km || 8,
        },
      };
    }

    case 'find_nearest_location': {
      let { latitude, longitude, address } = parameters;
      const maxResults = 3;
      // Clean up address for geocoding (strip apt numbers, normalize abbreviations)
      let cleanAddress = address ? address
        .replace(/\b(?:apt|unit|suite|#)\s*\d+\b/gi, '')
        .replace(/\bave\b/gi, 'avenue')
        .replace(/\bst\b/gi, 'street')
        .replace(/\bdr\b/gi, 'drive')
        .replace(/\brd\b/gi, 'road')
        .replace(/\bblvd\b/gi, 'boulevard')
        .replace(/\s+/g, ' ')
        .trim()
        : '';

      // If no coordinates but address provided, geocode it
      if ((!latitude || !longitude) && address) {

        // Try geocoding with progressive fallbacks
        const geoQueries = [
          cleanAddress,  // e.g. "150 marketplace avenue ottawa"
          cleanAddress.split(',').slice(0, 1).join(',').trim(),  // Just the street part
          cleanAddress.split(' ').slice(-1)[0] + ' ottawa canada',  // Last word + city fallback
        ];

        // Add Canada/Ontario context if not present
        if (!cleanAddress.toLowerCase().includes('ottawa') && !cleanAddress.toLowerCase().includes('canada')) {
          geoQueries.unshift(cleanAddress + ' ottawa canada');
        }

        for (const query of geoQueries) {
          try {
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=ca`;
            const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'SliceLine/1.0' } });
            const geoData = await geoRes.json();
            if (geoData.length > 0) {
              // Prefer results in Ontario
              const ontarioResult = geoData.find(r => r.display_name.includes('Ontario'));
              const result = ontarioResult || geoData[0];
              latitude = parseFloat(result.lat);
              longitude = parseFloat(result.lon);
              fastify.log.info({ query, lat: latitude, lon: longitude, display: result.display_name }, 'Geocoding success');
              break;
            }
          } catch (geoErr) {
            fastify.log.warn({ err: geoErr, query }, 'Geocoding attempt failed');
          }
        }
      }

      if (latitude && longitude) {
        const { rows } = await fastify.pg.query(`
          SELECT id, store_number, name, phone, street, city, state, zip,
                 latitude, longitude, timezone, delivery_radius_km,
                 delivery_enabled, delivery_fee, delivery_min_order, delivery_zones,
                 hours, phone_greeting,
                 ROUND((2 * 6371 * ASIN(
                   SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                        COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                        POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
                 ))::numeric, 2) AS distance_km
          FROM locations WHERE is_active = true
          ORDER BY distance_km ASC LIMIT $3
        `, [latitude, longitude, maxResults]);

        const locationsWithDelivery = rows.map(loc => {
          const deliveryInfo = { can_deliver: false, delivery_fee: 0, delivery_min_order: 0 };
          if (loc.delivery_enabled && loc.distance_km <= (loc.delivery_radius_km || 8)) {
            deliveryInfo.can_deliver = true;
            deliveryInfo.delivery_min_order = Number(loc.delivery_min_order || 0);
            const zones = loc.delivery_zones || [];
            const applicableZone = zones.sort((a, b) => (a.radius_km || 0) - (b.radius_km || 0))
              .find(z => loc.distance_km <= (z.radius_km || 0));
            deliveryInfo.delivery_fee = applicableZone ? Number(applicableZone.fee || 0) : Number(loc.delivery_fee || 0);
          }
          const now = new Date();
          const dayHours = (loc.hours || []).find(h => h.day === now.getDay());
          const currentTime = now.toTimeString().slice(0, 5);
          const isOpen = dayHours && !dayHours.is_closed && currentTime >= (dayHours.open || '00:00') && currentTime <= (dayHours.close || '23:59');
          return { ...loc, is_open: isOpen, delivery: deliveryInfo };
        });

        return { locations: locationsWithDelivery, geocoded_address: cleanAddress, original_address: address, note: 'Use the full delivery address (including apartment/unit number) when placing the order.' };
      } else {
        return { error: 'Could not determine your location. Please provide your full address including city (e.g. "150 Marketplace Ave, Ottawa").', locations: [] };
      }
    }

    case 'get_specials': {
      const locResult = await fastify.pg.query('SELECT franchise_id FROM locations WHERE id = $1', [parameters.location_id]);
      if (!locResult.rows.length) return { error: 'Location not found', specials: [] };

      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);

      const exclusions = await fastify.pg.query(
        'SELECT special_id FROM location_specials WHERE location_id = $1 AND is_excluded = true',
        [parameters.location_id]
      );
      const excludedIds = new Set(exclusions.rows.map(e => e.special_id));

      const { rows: franchiseSpecials } = await fastify.pg.query(
        `SELECT * FROM specials WHERE franchise_id = $1 AND is_active = true
         AND (start_date IS NULL OR start_date <= CURRENT_DATE)
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
        [locResult.rows[0].franchise_id]
      );

      const activeFranchise = franchiseSpecials.filter(s => {
        if (excludedIds.has(s.id)) return false;
        if (s.day_of_week && s.day_of_week.length && !s.day_of_week.includes(dayOfWeek)) return false;
        if (s.start_time && s.end_time && (currentTime < s.start_time || currentTime > s.end_time)) return false;
        return true;
      });

      const { rows: locationSpecials } = await fastify.pg.query(
        `SELECT id, name, description, discount_type, discount_value, applies_to, applies_to_id,
                day_of_week, start_time, end_time
         FROM location_specials
         WHERE location_id = $1 AND is_active = true AND special_id IS NULL
         AND (start_date IS NULL OR start_date <= CURRENT_DATE)
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
        [parameters.location_id]
      );

      const activeLocation = locationSpecials.filter(s => {
        if (s.day_of_week && s.day_of_week.length && !s.day_of_week.includes(dayOfWeek)) return false;
        if (s.start_time && s.end_time && (currentTime < s.start_time || currentTime > s.end_time)) return false;
        return true;
      });

      return { specials: [...activeFranchise, ...activeLocation] };
    }

    case 'check_stock': {
      const { location_id, item_type, item_id, item_name } = parameters;

      if (item_type === 'topping' || item_name) {
        let toppingId = item_id;
        let toppingName = item_name;

        if (!toppingId && toppingName) {
          const { rows: nameRows } = await fastify.pg.query(
            `SELECT id, name FROM toppings WHERE franchise_id = (SELECT franchise_id FROM locations WHERE id = $1) AND name ILIKE $2`,
            [location_id, `%${toppingName}%`]
          );
          if (nameRows.length) {
            toppingId = nameRows[0].id;
            toppingName = nameRows[0].name;
          }
        }

        if (toppingId) {
          const { rows: stockRows } = await fastify.pg.query(
            `SELECT ls.*, t.name AS item_name FROM location_stock ls
             JOIN toppings t ON t.id = ls.item_id
             WHERE ls.location_id = $1 AND ls.item_type = 'topping' AND ls.item_id = $2`,
            [location_id, toppingId]
          );
          const stockInfo = stockRows.length ? stockRows[0] : { stock_status: 'in_stock', item_name: toppingName };

          const { rows: affectedPizzas } = await fastify.pg.query(
            `SELECT mi.id, mi.name, mit.is_required
             FROM menu_item_toppings mit
             JOIN menu_items mi ON mi.id = mit.menu_item_id
             WHERE mit.topping_id = $1`,
            [toppingId]
          );

          const requiredBy = affectedPizzas.filter(p => p.is_required).map(p => p.name);
          const optionalOn = affectedPizzas.filter(p => !p.is_required).map(p => p.name);

          return {
            ...stockInfo,
            topping_name: toppingName,
            affected_pizzas: {
              unavailable_if_out_of_stock: requiredBy,
              available_with_topping_removed: optionalOn,
            },
            message: stockInfo.stock_status === 'out_of_stock'
              ? `${toppingName} is OUT OF STOCK. Pizzas that require it: ${requiredBy.join(', ')}. Pizzas that can be ordered without it: ${optionalOn.join(', ')}.`
              : `${toppingName} is ${stockInfo.stock_status}`,
          };
        }
      }

      // General stock check
      let query, params;
      if (item_id && item_type === 'menu_item') {
        query = `SELECT ls.*, mi.name AS item_name
                 FROM location_stock ls
                 JOIN menu_items mi ON mi.id = ls.item_id
                 WHERE ls.location_id = $1 AND ls.item_type = 'menu_item' AND ls.item_id = $2`;
        params = [location_id, item_id];
      } else if (item_name && item_type === 'menu_item') {
        query = `SELECT ls.*, mi.name AS item_name
                 FROM location_stock ls
                 JOIN menu_items mi ON mi.id = ls.item_id
                 WHERE ls.location_id = $1 AND ls.item_type = 'menu_item' AND mi.name ILIKE $2`;
        params = [location_id, `%${item_name}%`];
      } else {
        const { rows: oosItems } = await fastify.pg.query(
          `SELECT ls.*, CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
           FROM location_stock ls
           LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
           LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
           WHERE ls.location_id = $1 AND ls.stock_status != 'in_stock'`,
          [location_id]
        );

        const oosToppingIds = oosItems.filter(i => i.item_type === 'topping' && i.stock_status === 'out_of_stock').map(i => i.item_id);
        let toppingImpact = [];
        if (oosToppingIds.length) {
          const { rows } = await fastify.pg.query(
            `SELECT mi.id, mi.name, mit.topping_id, t.name AS topping_name, mit.is_required
             FROM menu_item_toppings mit
             JOIN menu_items mi ON mi.id = mit.menu_item_id
             JOIN toppings t ON t.id = mit.topping_id
             WHERE mit.topping_id = ANY($1) AND mit.is_required = true`,
            [oosToppingIds]
          );
          toppingImpact = rows;
        }

        return {
          out_of_stock: oosItems,
          topping_impact: toppingImpact.length ? toppingImpact : undefined,
          message: toppingImpact.length
            ? `Out-of-stock toppings make these pizzas unavailable: ${[...new Set(toppingImpact.map(i => i.name))].join(', ')}`
            : 'All items are in stock',
        };
      }

      const { rows } = await fastify.pg.query(query, params);
      return rows.length ? rows[0] : { stock_status: 'in_stock', item_name: item_name || 'unknown' };
    }

    case 'place_order': {
      // Handle both old complex format and new simplified format
      let { location_id, customer_name, customer_phone,
        delivery_address, delivery_instructions, order_type,
        items_summary, subtotal, delivery_fee, special_id, notes, items } = parameters;

      // If location_id is missing, try to use a default (Barrhaven)
      if (!location_id) {
        // Try to find Barrhaven location
        const { rows: defaultLocs } = await fastify.pg.query(
          "SELECT id FROM locations WHERE is_active = true ORDER BY store_number LIMIT 1"
        );
        if (defaultLocs.length) {
          location_id = defaultLocs[0].id;
        } else {
          return { error: 'location_id is required. Please confirm which store location.' };
        }
      }

      // If items is provided (old format), use it directly
      // If items_summary is provided (new simplified format), parse it
      if ((!items || !items.length) && items_summary) {
        // Parse items_summary to create order items
        // The LLM sends a summary like "1 Large Pepperoni Pizza with Onions, 1 Bottle Coke"
        // We'll create a simplified order with the summary as notes
        fastify.log.info({ items_summary, subtotal }, 'Place order with simplified items');

        // Calculate total from subtotal if provided, or estimate
        const orderSubtotal = Number(subtotal) || 0;
        const orderDeliveryFee = Number(delivery_fee) || 0;
        const taxRate = 0.13;
        const tax = Math.round(orderSubtotal * taxRate * 100) / 100;
        const total = Math.round((orderSubtotal - 0 + tax + orderDeliveryFee) * 100) / 100;
        const orderNumber = `SL-${Math.floor(100000 + Math.random() * 900000)}`;

        // Find or create customer
        let customerId = null;
        if (customer_phone) {
          const phone = customer_phone.replace(/\D/g, '');
          const { rows: existing } = await fastify.pg.query('SELECT id FROM customers WHERE phone LIKE $1', [`%${phone.slice(-10)}%`]);
          if (existing.length) {
            customerId = existing[0].id;
          } else if (customer_name) {
            const { rows: [newCustomer] } = await fastify.pg.query(
              'INSERT INTO customers (phone, name, default_location_id) VALUES ($1, $2, $3) RETURNING id',
              [phone, customer_name, location_id]
            );
            customerId = newCustomer.id;
          }
        }

        const { rows: [order] } = await fastify.pg.query(
          `INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone,
            delivery_address, delivery_instructions, order_type, status, subtotal, tax, total, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10, $11, $12) RETURNING *`,
          [orderNumber, location_id, customerId, customer_name || 'Walk-in',
            customer_phone, delivery_address || null, delivery_instructions || null,
            order_type || 'delivery', orderSubtotal, tax, total, items_summary]
        );

        // Attempt POS submission (non-blocking)
        submitToPOS(fastify, order.id, location_id).catch(() => {});

        const estimatedTime = (order_type === 'delivery') ? '35-45 minutes' : '20-25 minutes';
        return {
          order_id: order.id,
          order_number: order.order_number,
          status: order.status,
          subtotal: Number(order.subtotal || orderSubtotal),
          tax: Number(order.tax || tax),
          delivery_fee: orderDeliveryFee,
          total: Number(order.total || total),
          estimated_time: estimatedTime,
          message: `Order confirmed! Your order number is ${order.order_number}. ${orderSubtotal > 0 ? `Subtotal: $${orderSubtotal.toFixed(2)}` : ''}${orderDeliveryFee > 0 ? `, Delivery fee: $${orderDeliveryFee.toFixed(2)}` : ''}, Tax: $${tax.toFixed(2)}, Total: $${total.toFixed(2)}. Estimated ${order_type === 'delivery' ? 'delivery' : 'pickup'} time is ${estimatedTime}. Thank you for calling Demo Pizza!`
        };
      }

      // Old format with items array
      if (!items || !items.length) {
        return { error: 'Order must have at least one item. Please provide items_summary or items array.' };
      }

      return await createOrder(fastify, parameters);
    }

    case 'lookup_customer': {
      const { phone } = parameters;
      const { rows } = await fastify.pg.query(
        `SELECT c.*, l.name AS default_location_name
         FROM customers c
         LEFT JOIN locations l ON l.id = c.default_location_id
         WHERE c.phone = $1`,
        [phone]
      );

      if (rows.length) {
        const customer = rows[0];
        const { rows: orders } = await fastify.pg.query(
          `SELECT id, order_number, total, order_type, status, created_at
           FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [customer.id]
        );
        return { customer, recent_orders: orders };
      } else {
        return { customer: null, message: 'New customer — no previous orders found.' };
      }
    }

    default:
      return { error: `Unknown tool: ${tool_name}` };
  }
}

// Helper: Create order (same logic as retell.js)
async function createOrder(fastify, params) {
  const {
    location_id, customer_name, customer_phone,
    delivery_address, delivery_instructions, order_type,
    items, special_id, notes
  } = params;

  if (!location_id) return { error: 'location_id is required' };
  if (!items || !items.length) return { error: 'Order must have at least one item' };

  const { rows: [location] } = await fastify.pg.query(
    'SELECT delivery_fee, delivery_min_order, delivery_zones FROM locations WHERE id = $1',
    [location_id]
  );

  let subtotal = 0;
  for (const item of items) {
    let itemTotal = Number(item.unit_price || 0) * (item.quantity || 1);
    const customizations = item.customizations || {};
    const addedToppings = customizations.added_toppings || [];
    const extraCheese = customizations.extra_cheese;

    for (const t of addedToppings) {
      itemTotal += Number(t.price || 1.50) * (item.quantity || 1);
    }
    if (extraCheese) {
      itemTotal += 2.00 * (item.quantity || 1);
    }
    subtotal += itemTotal;
  }

  let deliveryFee = 0;
  if (order_type === 'delivery' && location) {
    deliveryFee = Number(location.delivery_fee || 0);
  }

  let discount = 0;
  if (special_id) {
    const { rows: [special] } = await fastify.pg.query('SELECT * FROM specials WHERE id = $1', [special_id]);
    if (special) {
      if (special.discount_type === 'percentage') discount = Math.round(subtotal * special.discount_value) / 100;
      else if (special.discount_type === 'fixed') discount = special.discount_value;
    }
  }

  const taxRate = 0.13;
  const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
  const total = Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100;
  const orderNumber = `SL-${Math.floor(100000 + Math.random() * 900000)}`;

  let customerId = null;
  if (customer_phone) {
    const { rows: existing } = await fastify.pg.query('SELECT id FROM customers WHERE phone = $1', [customer_phone]);
    if (existing.length) {
      customerId = existing[0].id;
      await fastify.pg.query('UPDATE customers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = $1', [customerId]);
    } else {
      const { rows: [newCustomer] } = await fastify.pg.query(
        `INSERT INTO customers (phone, name, default_location_id) VALUES ($1, $2, $3) RETURNING id`,
        [customer_phone, customer_name, location_id]
      );
      customerId = newCustomer.id;
    }
  }

  const { rows: [order] } = await fastify.pg.query(
    `INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone,
      delivery_address, delivery_instructions, order_type, status, subtotal, tax, discount, total, special_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10, $11, $12, $13, $14) RETURNING *`,
    [orderNumber, location_id, customerId, customer_name, customer_phone,
     delivery_address || null, delivery_instructions || null, order_type || 'pickup',
     subtotal, tax, discount, total, special_id || null, notes || null]
  );

  for (const item of items) {
    const customizations = item.customizations || {};
    const addedToppings = customizations.added_toppings || [];
    const extraCheese = customizations.extra_cheese;

    let itemUnitPrice = Number(item.unit_price || 0);
    for (const t of addedToppings) {
      itemUnitPrice += Number(t.price || 1.50);
    }
    if (extraCheese) itemUnitPrice += 2.00;

    const itemTotal = itemUnitPrice * (item.quantity || 1);

    await fastify.pg.query(
      `INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [order.id, item.menu_item_id || null, item.name, item.size || null, item.quantity || 1,
       itemUnitPrice, itemTotal,
       JSON.stringify(customizations), item.special_requests || null]
    );
  }

  if (customer_phone) {
    // Update the most recent in-progress call for this phone number
    try {
      await fastify.pg.query(
        `UPDATE calls SET order_id = $1 WHERE caller_phone = $2 AND status = 'in_progress'
         AND id = (SELECT id FROM calls WHERE caller_phone = $2 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1)`,
        [order.id, customer_phone]
      );
    } catch (callErr) {
      fastify.log.warn({ err: callErr }, 'Could not update call record');
    }
  }

  await fastify.pg.query(
    `UPDATE orders SET pos_status = 'pending', updated_at = NOW() WHERE id = $1`,
    [order.id]
  );

  // Attempt POS submission (non-blocking)
  submitToPOS(fastify, order.id, location_id).catch(() => {});

  const { rows: [fullOrder] } = await fastify.pg.query('SELECT * FROM orders WHERE id = $1', [order.id]);
  const { rows: orderItems } = await fastify.pg.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  fullOrder.items = orderItems;

  return {
    order_id: fullOrder.id,
    order_number: fullOrder.order_number,
    status: fullOrder.status,
    subtotal: Number(fullOrder.subtotal),
    tax: Number(fullOrder.tax),
    discount: Number(fullOrder.discount || 0),
    delivery_fee: deliveryFee,
    total: Number(fullOrder.total),
    estimated_time: order_type === 'delivery' ? '35-45 minutes' : '20-25 minutes',
    message: `Order confirmed! Your order number is ${fullOrder.order_number}. Subtotal: $${Number(fullOrder.subtotal).toFixed(2)}${discount > 0 ? `, Discount: -$${Number(discount).toFixed(2)}` : ''}, Tax (13% HST): $${Number(fullOrder.tax).toFixed(2)}${deliveryFee > 0 ? `, Delivery fee: $${deliveryFee.toFixed(2)}` : ''}, Total: $${Number(fullOrder.total).toFixed(2)}. Estimated ${order_type === 'delivery' ? 'delivery' : 'pickup'} time is ${order_type === 'delivery' ? '35-45' : '20-25'} minutes.`,
  };
}

// ─── POS Integration Helper ────────────────────────────────────────────────

/**
 * Attempt to submit a Sliceline order to the configured POS for the franchise.
 * Logs success/failure but never blocks order creation.
 * Updates pos_status and pos_order_id on the order row.
 */
async function submitToPOS(fastify, orderId, locationId) {
  try {
    // Resolve franchise from location
    const { rows: locRows } = await fastify.pg.query(
      'SELECT franchise_id FROM locations WHERE id = $1',
      [locationId]
    );
    if (!locRows.length) return;
    const franchiseId = locRows[0].franchise_id;

    // Check if a POS config exists for this franchise
    const { rows: posConfigs } = await fastify.pg.query(
      "SELECT adapter, config FROM pos_configs WHERE franchise_id = $1 AND is_active = true LIMIT 1",
      [franchiseId]
    );
    if (!posConfigs.length) return; // No POS configured — skip silently

    const { adapter, config } = posConfigs[0];
    const posAdapter = getAdapter(adapter, config);

    // Load the full order
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
      [orderId]
    );
    if (!orders.length) return;

    const order = orders[0];
    const result = await posAdapter.submitOrder(order);

    await fastify.pg.query(
      `UPDATE orders SET pos_status = 'submitted', pos_order_id = $1, pos_submitted_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [result.posOrderId, orderId]
    );

    fastify.log.info({ orderId, posOrderId: result.posOrderId, adapter }, 'Order submitted to POS');
  } catch (err) {
    fastify.log.warn({ err, orderId, locationId }, 'POS submission failed (non-blocking)');
    try {
      await fastify.pg.query(
        "UPDATE orders SET pos_status = 'rejected', updated_at = NOW() WHERE id = $1",
        [orderId]
      );
    } catch (_) { /* best effort */ }
  }
}