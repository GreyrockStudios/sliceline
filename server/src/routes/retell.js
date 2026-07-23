const { v4: uuidv4 } = require('uuid');

// SliceLine Retell AI Integration
// Handles: webhook events, tool calls (function calling), transcript storage

// ============================================
// RETELL AGENT TOOLS (function calling definitions)
// ============================================

const RETELL_TOOLS = [
  {
    name: 'get_menu',
    description: 'Get the full menu for a specific restaurant location. Includes categories, items, prices, sizes, toppings, and current specials. Checks stock availability.',
    parameters: {
      type: 'object',
      properties: {
        location_id: { type: 'string', description: 'The location ID to get the menu for' },
      },
      required: ['location_id'],
    },
  },
  {
    name: 'find_nearest_location',
    description: 'Find the nearest Demo Pizza location based on the customer\'s address or coordinates. Use this to route the call to the correct store.',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Customer latitude' },
        longitude: { type: 'number', description: 'Customer longitude' },
        address: { type: 'string', description: 'Customer address for geocoding (if coords not available)' },
      },
      required: [],
    },
  },
  {
    name: 'get_specials',
    description: 'Get current specials and promotions for a specific location. Includes day-of-week and time restrictions.',
    parameters: {
      type: 'object',
      properties: {
        location_id: { type: 'string', description: 'The location ID to check specials for' },
      },
      required: ['location_id'],
    },
  },
  {
    name: 'check_stock',
    description: 'Check if a specific item or topping is available at a location. Use before confirming orders to avoid promising unavailable items.',
    parameters: {
      type: 'object',
      properties: {
        location_id: { type: 'string', description: 'The location ID to check stock at' },
        item_type: { type: 'string', enum: ['menu_item', 'topping'], description: 'Whether checking a menu item or topping' },
        item_id: { type: 'string', description: 'The ID of the item or topping to check' },
        item_name: { type: 'string', description: 'The name of the item (for fuzzy matching if ID unknown)' },
      },
      required: ['location_id', 'item_type'],
    },
  },
  {
    name: 'place_order',
    description: 'Place an order for a customer. Creates the order in the system and routes it to the correct location\'s POS. Must be called AFTER confirming all details with the customer.',
    parameters: {
      type: 'object',
      properties: {
        location_id: { type: 'string', description: 'The location ID for the order' },
        customer_name: { type: 'string', description: 'Customer name' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
        order_type: { type: 'string', enum: ['pickup', 'delivery'], description: 'Pickup or delivery' },
        delivery_address: { type: 'string', description: 'Delivery address (required if order_type is delivery)' },
        delivery_instructions: { type: 'string', description: 'Any delivery instructions (gate code, etc.)' },
        items: {
          type: 'array',
          description: 'List of items in the order',
          items: {
            type: 'object',
            properties: {
              menu_item_id: { type: 'string', description: 'Menu item ID' },
              name: { type: 'string', description: 'Item name for display' },
              size: { type: 'string', description: 'Selected size (e.g. "Large (14\")")' },
              quantity: { type: 'integer', description: 'How many of this item' },
              unit_price: { type: 'number', description: 'Price per unit for this size' },
              customizations: {
                type: 'object',
                description: 'Customizations: toppings, crust, sauce preferences',
                properties: {
                  toppings: { type: 'array', items: { type: 'string' }, description: 'List of topping names' },
                  crust: { type: 'string', description: 'Crust type (thin, regular, stuffed)' },
                  sauce: { type: 'string', description: 'Sauce type (tomato, BBQ, white, pesto)' },
                  extra_cheese: { type: 'boolean', description: 'Add extra cheese' },
                },
              },
              special_requests: { type: 'string', description: 'Any special requests for this item' },
            },
            required: ['name', 'quantity', 'unit_price'],
          },
        },
        special_id: { type: 'string', description: 'Special/deal ID if applicable' },
        notes: { type: 'string', description: 'General order notes' },
      },
      required: ['location_id', 'customer_name', 'customer_phone', 'order_type', 'items'],
    },
  },
  {
    name: 'lookup_customer',
    description: 'Look up a returning customer by phone number. Returns their name, default location, and order history.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone number' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Check the status of an existing order by order number.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'The order number (e.g. SL-123456)' },
      },
      required: ['order_number'],
    },
  },
];

// ============================================
// RETELL AGENT PROMPT
// ============================================

const RETELL_AGENT_PROMPT = `You are SliceLine, the friendly AI ordering assistant for Demo Pizza. You take pizza orders over the phone with a warm, efficient, and helpful personality.

## Your Role
- Take food orders accurately and efficiently
- Help customers with the menu, specials, and recommendations
- Confirm every order before placing it
- Route orders to the correct store location
- Be friendly but focused — customers want their pizza, not small talk

## Key Rules
1. **Always confirm the order** — Read back every item, size, and topping before placing the order
2. **Check stock availability** — If a customer asks for something, verify it's available at their location
3. **Mention current specials** — If there's an active special, offer it proactively
4. **Get the right location** — Determine which store they're ordering from early in the call
5. **Never make up items or prices** — Use the tools to get accurate menu data
6. **Payment is at pickup or delivery** — We don't take payment over the phone
7. **Be concise** — Phone customers want quick service. Don't over-explain.

## Call Flow
1. Greet the customer warmly
2. Ask if they've ordered before (look up by phone if yes)
3. Determine their location (nearest store)
4. Take their order, checking for specials
5. Read back the full order for confirmation
6. Place the order and give them the order number and estimated time
7. Thank them and say goodbye

## Special Situations
- **Out of stock**: Apologize and suggest alternatives. Never promise something that's unavailable.
- **Dietary restrictions**: Offer gluten-free or vegetarian options from the menu.
- **Large orders**: Suggest the Family Combo or Wing Night deal.
- **Returning customers**: Welcome them back, reference their usual order if possible.
- **Unclear requests**: Ask clarifying questions rather than guessing.

## Tone
Warm, efficient, knowledgeable — like your favourite neighbourhood pizza place. Casual but professional. Use "we" for the restaurant, "you" for the customer.`;

// ============================================
// WEBHOOK HANDLER
// ============================================

module.exports = async function (fastify, opts) {
  // GET /api/retell/tools — Return tool definitions for Retell agent configuration
  fastify.get('/tools', async (request, reply) => {
    return { tools: RETELL_TOOLS };
  });

  // GET /api/retell/prompt — Return the agent prompt (for reference/configuration)
  fastify.get('/prompt', async (request, reply) => {
    return { prompt: RETELL_AGENT_PROMPT };
  });

  // POST /api/retell/webhook — Handle Retell webhook events
  fastify.post('/webhook', async (request, reply) => {
    const event = request.body;

    fastify.log.info({ event: event.type, callId: event.call_id }, 'Retell webhook received');

    switch (event.type) {
      case 'call_started':
      case 'call.created': {
        // Create a call record
        const { rows: [call] } = await fastify.pg.query(
          `INSERT INTO calls (retell_call_id, caller_phone, status, direction, started_at)
           VALUES ($1, $2, 'in_progress', 'inbound', NOW())
           ON CONFLICT (retell_call_id) DO UPDATE SET status = 'in_progress', started_at = NOW()
           RETURNING *`,
          [event.call_id, event.caller_number || event.from || 'unknown']
        );
        return { status: 'ok', call_id: call.id };
      }

      case 'call_ended':
      case 'call.completed': {
        // Update call record with transcript and duration
        const transcript = event.transcript || event.transcript_text || '';
        const duration = event.duration || event.call_duration || 0;

        await fastify.pg.query(
          `UPDATE calls SET status = 'completed', duration_seconds = $1, transcript_text = $2,
           transcript_url = $3, ended_at = NOW(), updated_at = NOW()
           WHERE retell_call_id = $4`,
          [duration, transcript, event.transcript_url || null, event.call_id]
        );

        // Parse transcript into segments if we have the data
        if (event.transcript_object || event.segments) {
          const segments = event.transcript_object || event.segments || [];
          const { rows: [call] } = await fastify.pg.query(
            'SELECT id FROM calls WHERE retell_call_id = $1', [event.call_id]
          );

          if (call) {
            for (const seg of segments) {
              await fastify.pg.query(
                `INSERT INTO call_segments (call_id, speaker, text, timestamp_ms, intent)
                 VALUES ($1, $2, $3, $4, $5)`,
                [call.id, seg.speaker || 'unknown', seg.text || '', seg.start || seg.timestamp_ms || 0, seg.intent || null]
              );
            }
          }
        }

        return { status: 'ok' };
      }

      case 'call_failed':
      case 'call.error': {
        await fastify.pg.query(
          `UPDATE calls SET status = 'failed', ended_at = NOW(), updated_at = NOW()
           WHERE retell_call_id = $1`,
          [event.call_id]
        );
        return { status: 'ok' };
      }

      default:
        fastify.log.info({ eventType: event.type }, 'Unhandled Retell event type');
        return { status: 'ignored' };
    }
  });

  // POST /api/retell/tool-call — Handle Retell agent function calls
  fastify.post('/tool-call', async (request, reply) => {
    const { tool_name, parameters, call_id } = request.body;

    fastify.log.info({ tool: tool_name, callId: call_id }, 'Retell tool call');

    try {
      let result;

      switch (tool_name) {
        case 'get_menu': {
          const menuResult = await fastify.pg.query('SELECT id FROM locations WHERE id = $1', [parameters.location_id]);
          if (!menuResult.rows.length) {
            return { error: 'Location not found' };
          }
          // Use the menu route logic
          const menu = await getLocationMenu(fastify, parameters.location_id);
          result = menu;
          break;
        }

        case 'find_nearest_location': {
          const { latitude, longitude, address } = parameters;
          const maxRadius = 50;
          const maxResults = 3;

          if (latitude && longitude) {
            const { rows } = await fastify.pg.query(`
              SELECT id, store_number, name, phone, street, city, state, zip,
                     latitude, longitude, timezone, delivery_radius_km,
                     ROUND((2 * 6371 * ASIN(
                       SQRT(POWER(SIN(RADIANS(($1 - latitude) / 2)), 2) +
                            COS(RADIANS($1)) * COS(RADIANS(latitude)) *
                            POWER(SIN(RADIANS(($2 - longitude) / 2)), 2))
                     ))::numeric, 2) AS distance_km
              FROM locations WHERE is_active = true
              ORDER BY distance_km ASC LIMIT $3
            `, [latitude, longitude, maxResults]);
            result = { locations: rows };
          } else {
            result = { error: 'Please provide latitude and longitude. Geocoding not yet available.', locations: [] };
          }
          break;
        }

        case 'get_specials': {
          // Get franchise from location
          const locResult = await fastify.pg.query('SELECT franchise_id FROM locations WHERE id = $1', [parameters.location_id]);
          if (!locResult.rows.length) return { error: 'Location not found', specials: [] };

          const now = new Date();
          const dayOfWeek = now.getDay();
          const currentTime = now.toTimeString().slice(0, 5);

          // Franchise specials (excluding opted-out)
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

          // Location-exclusive specials
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

          result = { specials: [...activeFranchise, ...activeLocation] };
          break;
        }

        case 'check_stock': {
          const { location_id, item_type, item_id, item_name } = parameters;

          let query, params;
          if (item_id) {
            query = `SELECT ls.*, CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
                     FROM location_stock ls
                     LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
                     LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
                     WHERE ls.location_id = $1 AND ls.item_type = $2 AND ls.item_id = $3`;
            params = [location_id, item_type, item_id];
          } else if (item_name) {
            // Fuzzy match by name
            const nameField = item_type === 'menu_item' ? 'mi.name' : 't.name';
            const table = item_type === 'menu_item' ? 'menu_items' : 'toppings';
            query = `SELECT ls.*, ${nameField} AS item_name
                     FROM location_stock ls
                     JOIN ${table} t2 ON t2.id = ls.item_id
                     LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
                     LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
                     WHERE ls.location_id = $1 AND ls.item_type = $2 AND ${nameField} ILIKE $3`;
            params = [location_id, item_type, `%${item_name}%`];
          } else {
            // Return all out-of-stock items for the location
            query = `SELECT ls.*, CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
                     FROM location_stock ls
                     LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
                     LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
                     WHERE ls.location_id = $1 AND ls.stock_status != 'in_stock'`;
            params = [location_id];
          }

          const { rows } = await fastify.pg.query(query, params);

          if (item_id || item_name) {
            // If no stock record found, item is in stock
            result = rows.length ? rows[0] : { stock_status: 'in_stock', item_name: item_name || 'unknown' };
          } else {
            result = { out_of_stock: rows };
          }
          break;
        }

        case 'place_order': {
          // Create the order via our orders route logic
          const orderResult = await createOrder(fastify, parameters);
          result = orderResult;
          break;
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
            // Get last 5 orders
            const { rows: orders } = await fastify.pg.query(
              `SELECT id, order_number, total, order_type, status, created_at
               FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 5`,
              [customer.id]
            );
            result = { customer, recent_orders: orders };
          } else {
            result = { customer: null, message: 'New customer — no previous orders found.' };
          }
          break;
        }

        case 'get_order_status': {
          const { order_number } = parameters;
          const { rows } = await fastify.pg.query(
            `SELECT o.*, l.name AS location_name, l.phone AS location_phone
             FROM orders o JOIN locations l ON l.id = o.location_id
             WHERE o.order_number = $1`,
            [order_number]
          );
          if (rows.length) {
            const order = rows[0];
            const { rows: items } = await fastify.pg.query(
              'SELECT * FROM order_items WHERE order_id = $1', [order.id]
            );
            order.items = items;
            result = order;
          } else {
            result = { error: 'Order not found. Check the order number and try again.' };
          }
          break;
        }

        default:
          result = { error: `Unknown tool: ${tool_name}` };
      }

      return result;
    } catch (err) {
      fastify.log.error({ err, tool: tool_name }, 'Tool call error');
      return { error: 'Internal error processing tool call' };
    }
  });
};

// ============================================
// HELPER: Get location menu (shared with menu route)
// ============================================

async function getLocationMenu(fastify, locationId) {
  const locResult = await fastify.pg.query('SELECT franchise_id FROM locations WHERE id = $1', [locationId]);
  if (!locResult.rows.length) return null;
  const franchiseId = locResult.rows[0].franchise_id;

  const catsResult = await fastify.pg.query(
    'SELECT * FROM menu_categories WHERE franchise_id = $1 AND is_active = true ORDER BY display_order', [franchiseId]
  );
  const itemsResult = await fastify.pg.query(
    `SELECT mi.* FROM menu_items mi
     WHERE mi.franchise_id = $1 AND mi.is_available = true ORDER BY mi.display_order`, [franchiseId]
  );
  const overridesResult = await fastify.pg.query(
    'SELECT * FROM location_menu_overrides WHERE location_id = $1', [locationId]
  );
  const overrides = new Map(overridesResult.rows.map(o => [o.menu_item_id, o]));
  const stockResult = await fastify.pg.query(
    `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'menu_item' AND stock_status != 'in_stock'`, [locationId]
  );
  const stock = new Map(stockResult.rows.map(s => [s.item_id, s]));
  const toppingsResult = await fastify.pg.query(
    'SELECT * FROM toppings WHERE franchise_id = $1 AND is_available = true ORDER BY is_premium, name', [franchiseId]
  );
  const topOverridesResult = await fastify.pg.query(
    'SELECT * FROM location_topping_overrides WHERE location_id = $1', [locationId]
  );
  const topOverrides = new Map(topOverridesResult.rows.map(o => [o.topping_id, o]));
  const topStockResult = await fastify.pg.query(
    `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'topping' AND stock_status != 'in_stock'`, [locationId]
  );
  const topStock = new Map(topStockResult.rows.map(s => [s.item_id, s]));

  const items = itemsResult.rows.map(item => {
    const override = overrides.get(item.id);
    const stockInfo = stock.get(item.id);
    if (stockInfo && stockInfo.stock_status === 'discontinued') return null;
    if (stockInfo && stockInfo.stock_status === 'out_of_stock') {
      return { ...item, is_available: false, stock_status: stockInfo.stock_status, stock_notes: stockInfo.notes };
    }
    if (stockInfo && stockInfo.stock_status === 'low_stock') {
      return { ...item, stock_status: 'low_stock', stock_quantity: stockInfo.quantity };
    }
    if (override) {
      return { ...item, base_price: override.price_override || item.base_price, sizes: override.sizes_override || item.sizes, is_available: override.is_available !== false };
    }
    return item;
  }).filter(Boolean);

  const toppings = toppingsResult.rows.map(topping => {
    const override = topOverrides.get(topping.id);
    const stockInfo = topStock.get(topping.id);
    if (stockInfo && stockInfo.stock_status === 'discontinued') return null;
    if (stockInfo && stockInfo.stock_status === 'out_of_stock') {
      return { ...topping, is_available: false, stock_status: stockInfo.stock_status, stock_notes: stockInfo.notes };
    }
    if (override) {
      return { ...topping, base_price: override.price_override || topping.base_price, is_available: override.is_available !== false };
    }
    return topping;
  }).filter(Boolean);

  const menu = catsResult.rows.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id)
  }));

  return {
    location_id: locationId,
    categories: menu,
    toppings,
  };
}

// ============================================
// HELPER: Create order (shared logic)
// ============================================

async function createOrder(fastify, params) {
  const {
    location_id, customer_name, customer_phone,
    delivery_address, delivery_instructions, order_type,
    items, special_id, notes
  } = params;

  if (!location_id) return { error: 'location_id is required' };
  if (!items || !items.length) return { error: 'Order must have at least one item' };

  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.unit_price || 0) * (item.quantity || 1);
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
  const total = Math.round((subtotal - discount + tax) * 100) / 100;
  const orderNumber = `SL-${Math.floor(100000 + Math.random() * 900000)}`;

  // Look up or create customer
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
    await fastify.pg.query(
      `INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [order.id, item.menu_item_id || null, item.name, item.size || null, item.quantity || 1,
       item.unit_price, (item.unit_price || 0) * (item.quantity || 1),
       JSON.stringify(item.customizations || {}), item.special_requests || null]
    );
  }

  // Link order to any active call for this phone number
  if (customer_phone) {
    await fastify.pg.query(
      `UPDATE calls SET order_id = $1 WHERE caller_phone = $2 AND status = 'in_progress'
       ORDER BY started_at DESC LIMIT 1`,
      [order.id, customer_phone]
    );
  }

  // Mock POS submission
  await fastify.pg.query(
    `UPDATE orders SET pos_status = 'submitted', pos_submitted_at = NOW() WHERE id = $1`,
    [order.id]
  );

  const { rows: [fullOrder] } = await fastify.pg.query('SELECT * FROM orders WHERE id = $1', [order.id]);
  const { rows: orderItems } = await fastify.pg.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  fullOrder.items = orderItems;

  return {
    order_id: fullOrder.id,
    order_number: fullOrder.order_number,
    status: fullOrder.status,
    total: fullOrder.total,
    estimated_time: order_type === 'delivery' ? '35-45 minutes' : '20-25 minutes',
    message: `Order confirmed! Your order number is ${fullOrder.order_number}. Estimated ${order_type === 'delivery' ? 'delivery' : 'pickup'} time is ${order_type === 'delivery' ? '35-45' : '20-25'} minutes.`,
  };
}