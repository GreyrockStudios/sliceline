const { v4: uuidv4 } = require('uuid');
const { getLocationMenu } = require('./menuHelpers');

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
    name: 'get_location_info',
    description: 'Get detailed information about a specific location including hours of operation, phone greeting, delivery zones and fees, and current open/closed status. Use this after finding the nearest location to confirm delivery availability and estimated times.',
    parameters: {
      type: 'object',
      properties: {
        location_id: { type: 'string', description: 'The location ID to get info for' },
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
                description: 'Customizations for this item',
                properties: {
                  added_toppings: { type: 'array', items: { type: 'object', properties: { topping_id: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' } } }, description: 'Extra toppings added (each has a price)' },
                  removed_toppings: { type: 'array', items: { type: 'string' }, description: 'Default toppings removed from this pizza' },
                  crust: { type: 'string', description: 'Crust type (thin, regular, stuffed)' },
                  sauce: { type: 'string', description: 'Sauce type (tomato, BBQ, white, pesto)' },
                  extra_cheese: { type: 'boolean', description: 'Add extra cheese (+$2)' },
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
    name: 'get_customer_orders',
    description: 'Get a customer\'s full order history with items. Use after lookup_customer to show past orders for reorder.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The customer ID (from lookup_customer)' },
        location_id: { type: 'string', description: 'Filter orders by location (optional)' },
        limit: { type: 'integer', description: 'Number of orders to return (default 5)' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'reorder',
    description: 'Reorder a customer\'s previous order. Creates a new order with the same items, validates availability, and recalculates pricing. Can add/remove items via modifications.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The customer ID' },
        order_id: { type: 'string', description: 'The order ID to reorder from (from get_customer_orders)' },
        location_id: { type: 'string', description: 'Override location (optional, defaults to original order location)' },
        modifications: {
          type: 'object',
          description: 'Optional modifications to the reorder',
          properties: {
            add_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  menu_item_id: { type: 'string' },
                  name: { type: 'string' },
                  size: { type: 'string' },
                  quantity: { type: 'integer' },
                  customizations: { type: 'object' },
                },
              },
            },
            change_order_type: { type: 'string', enum: ['pickup', 'delivery'] },
            change_delivery_address: { type: 'string' },
          },
        },
      },
      required: ['customer_id', 'order_id'],
    },
  },
  {
    name: 'get_reorder_suggestions',
    description: 'Get reorder suggestions for a customer — their most common past orders with availability status. Shows the top 5 unique past orders with whether they can be reordered.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The customer ID' },
        location_id: { type: 'string', description: 'Filter by location (optional)' },
      },
      required: ['customer_id'],
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
- Take food orders accurately and efficiently over the phone
- Recognize returning customers and offer quick reorders
- Help customers with the menu, specials, and recommendations
- Confirm every order before placing it
- Route orders to the correct store location
- Be friendly but focused — customers want their pizza, not small talk

## Key Rules
1. **Always confirm the order** — Read back every item, size, topping, and the total price before placing the order
2. **Check stock availability** — If a customer asks for something, verify it's available at their location
3. **Understand topping dependencies** — Pizzas are defined by their toppings. If a topping is out of stock:
   - Any pizza that REQUIRES that topping becomes unavailable (e.g. no pepperoni = no Classic, Works, Meat Lovers, or Diavola)
   - Pizzas where the topping is optional can still be ordered WITHOUT that topping
   - Always offer alternatives: "We're out of pepperoni, but I can make you a Veggie Supreme or Margherita"
4. **Handle topping customizations with pricing** — When a customer adds or removes toppings:
   - Adding toppings costs extra (check the topping price from the menu)
   - Removing a required topping from a pizza is allowed but does NOT reduce the price
   - Extra cheese is $2.00
   - Always confirm the adjusted price before placing the order
5. **Check hours and delivery** — Use get_location_info to verify the store is open and check delivery zones/fees before taking a delivery order
6. **Mention current specials** — If there's an active special, offer it proactively
7. **Get the right location** — Determine which store they're ordering from early in the call
8. **Never make up items or prices** — Use the tools to get accurate menu data
9. **Payment is at pickup or delivery** — We don't take payment over the phone
10. **Be concise** — Phone customers want quick service. Don't over-explain.

## Call Flow
1. Greet the customer warmly — use the location's phone greeting if available
2. Ask for their phone number to look them up
3. If they're a returning customer:
   - Welcome them back by name
   - Use get_reorder_suggestions to show their past orders
   - Offer: "Want the usual?" or "I see you ordered X last time — same thing today?"
   - If they say yes, use the reorder tool with their previous order_id
4. If new or they want something different, determine their location (nearest store)
5. Take their order, checking for specials and stock
6. Calculate topping additions/removals and confirm the total
7. If any item from a reorder is unavailable, tell them what changed and offer alternatives
8. Read back the full order with prices for confirmation
9. Place the order and give them the order number and estimated time
10. Thank them and say goodbye

## Reorder Flow (IMPORTANT)
When a returning customer calls:
1. Use lookup_customer with their phone number
2. If found, use get_reorder_suggestions with their customer_id
3. Present their past orders naturally: "I see your last order was a Large Works and garlic knots — want the same thing today?"
4. If they say yes, use reorder with the order_id
5. If they want modifications ("same thing but no olives"), use reorder with modifications to add/remove items
6. If any items are unavailable, the reorder tool will flag them — inform the customer and offer alternatives
7. If they want something completely different, take a fresh order with place_order

## Pricing Rules
- Base pizza price is for the pizza with its default toppings
- Each added topping costs extra (check the topping price from the menu data)
- Removing toppings does NOT reduce the price
- Extra cheese is $2.00
- 13% HST (Ontario tax) is added to the subtotal
- Delivery fee depends on distance (check delivery_zones from location info)
- Free delivery on orders over $30 at some locations

## Special Situations
- **Out of stock topping**: Check which pizzas are affected. Offer alternatives. Example: "We're out of pepperoni tonight, so The Classic and Meat Lovers aren't available, but I can offer you a Margherita, Hawaiian, or Veggie Supreme instead."
- **Closed or closing soon**: If the store is closing within 30 minutes, let the customer know and suggest they order for pickup if delivery isn't possible.
- **Delivery outside zone**: "I'm sorry, we can't deliver to your address, but you can place an order for pickup!"
- **Dietary restrictions**: Offer gluten-free or vegetarian options from the menu.
- **Large orders**: Suggest the Family Combo or Wing Night deal.
- **Returning customers**: ALWAYS look them up and offer reorder. People love ordering the same thing. "Want your usual?" is the fastest path to a happy customer.
- **Item unavailable on reorder**: "Your usual has pepperoni on it, but we're out of pepperoni tonight. I can do the Works without pepperoni, or how about a Veggie Supreme instead?"
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
        // Create a call record and return location greeting if we can match the number
        const callerPhone = event.caller_number || event.from || 'unknown';
        const { rows: [call] } = await fastify.pg.query(
          `INSERT INTO calls (retell_call_id, caller_phone, status, direction, started_at)
           VALUES ($1, $2, 'in_progress', 'inbound', NOW())
           ON CONFLICT (retell_call_id) DO UPDATE SET status = 'in_progress', started_at = NOW()
           RETURNING *`,
          [event.call_id, callerPhone]
        );

        // Try to return the phone greeting for the called location
        let greeting = 'Thank you for calling Demo Pizza! How can I help you today?';
        if (event.metadata?.location_id || event.custom_fields?.location_id) {
          const locId = event.metadata?.location_id || event.custom_fields?.location_id;
          const { rows: [loc] } = await fastify.pg.query('SELECT phone_greeting FROM locations WHERE id = $1', [locId]);
          if (loc?.phone_greeting) greeting = loc.phone_greeting;
        }

        return { status: 'ok', call_id: call.id, greeting };
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
  // Supports two formats:
  //   1. WebSocket/Custom LLM: { tool_name, parameters, call_id }
  //   2. Retell Custom Function: { name, call, args } (or just args if "Payload: args only")
  fastify.post('/tool-call', async (request, reply) => {
    const body = request.body;
    // Normalize Retell custom function format to our internal format
    let tool_name, parameters, call_id;
    if (body.name && body.args) {
      // Retell Custom Function format: { name, call, args }
      tool_name = body.name;
      parameters = body.args;
      call_id = body.call?.call_id;
    } else if (body.tool_name) {
      // Our internal format: { tool_name, parameters, call_id }
      tool_name = body.tool_name;
      parameters = body.parameters || {};
      call_id = body.call_id;
    } else {
      // Possibly "Payload: args only" format — no name wrapper, need to infer
      // This shouldn't happen if Retell is configured with the function name properly
      fastify.log.error({ body }, 'Unrecognized tool call format');
      return reply.code(400).send({ error: 'Unrecognized request format. Expected { name, args } or { tool_name, parameters }.' });
    }

    fastify.log.info({ tool: tool_name, callId: call_id }, 'Retell tool call');

    try {
      let result;

      switch (tool_name) {
        case 'get_menu': {
          const menu = await getLocationMenu(fastify, parameters.location_id);
          if (!menu) return { error: 'Location not found' };
          result = menu;
          break;
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

          result = {
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
          break;
        }

        case 'find_nearest_location': {
          let { latitude, longitude, address } = parameters;
          const maxResults = 3;

          // If no coordinates but address provided, geocode it
          if ((!latitude || !longitude) && address) {
            try {
              const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
              const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'SliceLine/1.0' } });
              const geoData = await geoRes.json();
              if (geoData.length > 0) {
                latitude = parseFloat(geoData[0].lat);
                longitude = parseFloat(geoData[0].lon);
              }
            } catch (geoErr) {
              fastify.log.warn({ err: geoErr }, 'Geocoding failed');
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

            // Calculate delivery fee for each location
            const locationsWithDelivery = rows.map(loc => {
              const deliveryInfo = { can_deliver: false, delivery_fee: 0, delivery_min_order: 0 };
              if (loc.delivery_enabled && loc.distance_km <= (loc.delivery_radius_km || 8)) {
                deliveryInfo.can_deliver = true;
                deliveryInfo.delivery_min_order = Number(loc.delivery_min_order || 0);
                // Calculate fee based on delivery zones
                const zones = loc.delivery_zones || [];
                const applicableZone = zones.sort((a, b) => (a.radius_km || 0) - (b.radius_km || 0))
                  .find(z => loc.distance_km <= (z.radius_km || 0));
                deliveryInfo.delivery_fee = applicableZone ? Number(applicableZone.fee || 0) : Number(loc.delivery_fee || 0);
              }
              // Check if currently open
              const now = new Date();
              const dayHours = (loc.hours || []).find(h => h.day === now.getDay());
              const currentTime = now.toTimeString().slice(0, 5);
              const isOpen = dayHours && !dayHours.is_closed && currentTime >= (dayHours.open || '00:00') && currentTime <= (dayHours.close || '23:59');
              return { ...loc, is_open: isOpen, delivery: deliveryInfo };
            });

            result = { locations: locationsWithDelivery };
          } else {
            result = { error: 'Could not determine your location. Please provide your address or coordinates.', locations: [] };
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

          // If checking a topping, also report which pizzas it affects
          if (item_type === 'topping' || item_name) {
            let toppingId = item_id;
            let toppingName = item_name;

            // Resolve by name if needed
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
              // Check topping stock
              const { rows: stockRows } = await fastify.pg.query(
                `SELECT ls.*, t.name AS item_name FROM location_stock ls
                 JOIN toppings t ON t.id = ls.item_id
                 WHERE ls.location_id = $1 AND ls.item_type = 'topping' AND ls.item_id = $2`,
                [location_id, toppingId]
              );
              const stockInfo = stockRows.length ? stockRows[0] : { stock_status: 'in_stock', item_name: toppingName };

              // Find affected pizzas
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
                  ? `${toppingName} is OUT OF STOCK. This means these pizzas are unavailable: ${requiredBy.join(', ')}. These pizzas can still be ordered without ${toppingName}: ${optionalOn.join(', ')}`
                  : `${toppingName} is ${stockInfo.stock_status}`,
              };
            }
          }

          // General stock check (menu item or all out-of-stock)
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
            // Return all out-of-stock items + topping cascade impact
            const { rows: oosItems } = await fastify.pg.query(
              `SELECT ls.*, CASE WHEN ls.item_type = 'menu_item' THEN mi.name ELSE t.name END AS item_name
               FROM location_stock ls
               LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
               LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
               WHERE ls.location_id = $1 AND ls.stock_status != 'in_stock'`,
              [location_id]
            );

            // Find pizzas affected by out-of-stock toppings
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
                : undefined,
            };
          }

          const { rows } = await fastify.pg.query(query, params);
          return rows.length ? rows[0] : { stock_status: 'in_stock', item_name: item_name || 'unknown' };
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

        case 'get_customer_orders': {
          const { customer_id, limit = 5, location_id } = parameters;
          if (!customer_id) { result = { error: 'customer_id is required' }; break; }

          const { rows: [cust] } = await fastify.pg.query(
            'SELECT id, name, phone FROM customers WHERE id = $1', [customer_id]
          );
          if (!cust) { result = { error: 'Customer not found' }; break; }

          const conditions = ['o.customer_id = $1', "o.status IN ('completed', 'confirmed')"];
          const params = [customer_id];
          let idx = 2;
          if (location_id) {
            conditions.push(`o.location_id = $${idx++}`);
            params.push(location_id);
          }
          params.push(limit);

          const { rows: custOrders } = await fastify.pg.query(
            `SELECT o.id, o.order_number, o.location_id, o.order_type, o.total,
                    o.delivery_address, o.status, o.created_at, l.name AS location_name
             FROM orders o JOIN locations l ON l.id = o.location_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY o.created_at DESC LIMIT $${idx}`,
            params
          );

          for (const order of custOrders) {
            const { rows: items } = await fastify.pg.query(
              'SELECT menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests FROM order_items WHERE order_id = $1',
              [order.id]
            );
            order.items = items;
            order.item_summary = items.map(i => `${i.quantity}x ${i.size ? i.size + ' ' : ''}${i.name}`).join(', ');
          }

          result = { customer: { id: cust.id, name: cust.name, phone: cust.phone }, orders: custOrders };
          break;
        }

        case 'reorder': {
          const { customer_id, order_id, location_id, modifications } = parameters;
          if (!customer_id) { result = { error: 'customer_id is required' }; break; }
          if (!order_id) { result = { error: 'order_id is required' }; break; }

          const { rows: [cust] } = await fastify.pg.query(
            'SELECT id, phone, name, default_location_id FROM customers WHERE id = $1', [customer_id]
          );
          if (!cust) { result = { error: 'Customer not found' }; break; }

          const { rows: [origOrder] } = await fastify.pg.query(
            'SELECT o.*, l.name AS location_name FROM orders o JOIN locations l ON l.id = o.location_id WHERE o.id = $1 AND o.customer_id = $2',
            [order_id, customer_id]
          );
          if (!origOrder) { result = { error: 'Original order not found' }; break; }

          const { rows: origItems } = await fastify.pg.query(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [origOrder.id]
          );

          const targetLoc = location_id || origOrder.location_id;
          const warnings = [];
          const validItems = [];

          for (const item of origItems) {
            if (item.menu_item_id) {
              const { rows: [mi] } = await fastify.pg.query('SELECT is_available, name, base_price, sizes FROM menu_items WHERE id = $1', [item.menu_item_id]);
              if (!mi || !mi.is_available) { warnings.push(`${item.name} is no longer available`); continue; }

              const { rows: oos } = await fastify.pg.query(
                `SELECT t.name FROM menu_item_toppings mit JOIN toppings t ON t.id = mit.topping_id
                 LEFT JOIN location_stock ls ON ls.item_id = t.id AND ls.item_type = 'topping' AND ls.location_id = $1
                 WHERE mit.menu_item_id = $2 AND mit.is_required = true AND ls.stock_status = 'out_of_stock'`,
                [targetLoc, item.menu_item_id]
              );
              if (oos.length > 0) { warnings.push(`${item.name} is unavailable (out of stock: ${oos.map(t => t.name).join(', ')})`); continue; }

              let unitPrice = Number(item.unit_price);
              const { rows: [ovr] } = await fastify.pg.query(
                'SELECT price_override, sizes_override FROM location_menu_overrides WHERE location_id = $1 AND menu_item_id = $2',
                [targetLoc, item.menu_item_id]
              );
              if (item.size && mi.sizes) {
                const sizes = ovr?.sizes_override || mi.sizes;
                const sz = sizes.find(s => s.name === item.size);
                if (sz) unitPrice = Number(sz.price);
              }

              const custz = item.customizations || {};
              let topTotal = 0;
              for (const t of (custz.added_toppings || [])) topTotal += Number(t.price || 1.50);
              if (custz.extra_cheese) topTotal += 2.00;

              validItems.push({
                menu_item_id: item.menu_item_id, name: item.name, size: item.size,
                quantity: item.quantity, unit_price: unitPrice + topTotal,
                total_price: (unitPrice + topTotal) * item.quantity,
                customizations: item.customizations, special_requests: item.special_requests,
              });
            } else {
              validItems.push({
                name: item.name, size: item.size, quantity: item.quantity,
                unit_price: Number(item.unit_price), total_price: Number(item.total_price),
                customizations: item.customizations, special_requests: item.special_requests,
              });
            }
          }

          const mods = modifications || {};
          if (mods.add_items && Array.isArray(mods.add_items)) {
            for (const addIt of mods.add_items) {
              if (addIt.menu_item_id) {
                const { rows: [mi] } = await fastify.pg.query('SELECT name, base_price, sizes, is_available FROM menu_items WHERE id = $1', [addIt.menu_item_id]);
                if (mi && mi.is_available) {
                  let p = Number(mi.base_price);
                  if (addIt.size && mi.sizes) { const sz = mi.sizes.find(s => s.name === addIt.size); if (sz) p = Number(sz.price); }
                  validItems.push({
                    menu_item_id: addIt.menu_item_id, name: addIt.name || mi.name,
                    size: addIt.size || null, quantity: addIt.quantity || 1,
                    unit_price: p, total_price: p * (addIt.quantity || 1),
                    customizations: addIt.customizations || {}, special_requests: addIt.special_requests || null,
                  });
                }
              }
            }
          }

          if (validItems.length === 0) { result = { error: 'None of the original items are available', warnings }; break; }

          const subtotal = validItems.reduce((s, i) => s + Number(i.total_price || i.unit_price * i.quantity), 0);
          const orderType = mods.change_order_type || origOrder.order_type || 'pickup';
          const deliveryAddr = mods.change_delivery_address || origOrder.delivery_address;

          let delFee = 0;
          if (orderType === 'delivery') {
            const { rows: [loc] } = await fastify.pg.query('SELECT delivery_fee FROM locations WHERE id = $1', [targetLoc]);
            delFee = Number(loc?.delivery_fee || 0);
          }

          const tax = Math.round(subtotal * 0.13 * 100) / 100;
          const total = Math.round((subtotal + tax + delFee) * 100) / 100;
          const orderNum = `SL-${Math.floor(100000 + Math.random() * 900000)}`;

          const { rows: [newOrder] } = await fastify.pg.query(
            `INSERT INTO orders (order_number, location_id, customer_id, customer_name, customer_phone,
              delivery_address, delivery_instructions, order_type, status, subtotal, tax, discount, total, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10, 0, $11, $12) RETURNING *`,
            [orderNum, targetLoc, cust.id, cust.name, cust.phone,
             deliveryAddr, origOrder.delivery_instructions, orderType,
             subtotal, tax, total,
             `Reorder of ${origOrder.order_number}${warnings.length ? '. Warnings: ' + warnings.join('; ') : ''}`]
          );

          for (const vi of validItems) {
            await fastify.pg.query(
              `INSERT INTO order_items (order_id, menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [newOrder.id, vi.menu_item_id || null, vi.name, vi.size || null,
               vi.quantity, vi.unit_price, vi.total_price || vi.unit_price * vi.quantity,
               JSON.stringify(vi.customizations || {}), vi.special_requests || null]
            );
          }

          await fastify.pg.query('UPDATE customers SET total_orders = total_orders + 1, updated_at = NOW() WHERE id = $1', [cust.id]);

          for (const vi of validItems) {
            if (!vi.menu_item_id) continue;
            await fastify.pg.query(
              `INSERT INTO customer_favorites (customer_id, location_id, menu_item_id, order_count, usual_size, usual_customizations)
               VALUES ($1, $2, $3, 1, $4, $5)
               ON CONFLICT (customer_id, location_id, menu_item_id, usual_size) DO UPDATE
               SET order_count = customer_favorites.order_count + 1, last_ordered_at = NOW()`,
              [cust.id, targetLoc, vi.menu_item_id, vi.size || null, JSON.stringify(vi.customizations || {})]
            );
          }

          const estTime = orderType === 'delivery' ? '35-45 minutes' : '20-25 minutes';
          const itemSum = validItems.map(i => `${i.quantity}x ${i.size ? i.size + ' ' : ''}${i.name}`).join(', ');

          result = {
            order_id: newOrder.id, order_number: newOrder.order_number, status: newOrder.status,
            subtotal: Number(newOrder.subtotal), tax: Number(newOrder.tax), total: Number(newOrder.total),
            delivery_fee: delFee, reordered_from: origOrder.order_number,
            warnings: warnings.length ? warnings : undefined,
            items: validItems, item_summary: itemSum,
            estimated_time: estTime,
            message: `Reorder confirmed! Your new order is ${newOrder.order_number}. ${itemSum}. Total: $${Number(newOrder.total).toFixed(2)}.${warnings.length ? ' Note: ' + warnings.join('. ') : ''} Estimated ${orderType === 'delivery' ? 'delivery' : 'pickup'}: ${estTime}.`,
          };
          break;
        }

        case 'get_reorder_suggestions': {
          const { customer_id, location_id } = parameters;
          if (!customer_id) { result = { error: 'customer_id is required' }; break; }

          const { rows: [cust] } = await fastify.pg.query(
            'SELECT id, name, phone FROM customers WHERE id = $1', [customer_id]
          );
          if (!cust) { result = { error: 'Customer not found' }; break; }

          const cond = ['o.customer_id = $1', "o.status IN ('completed', 'confirmed')"];
          const prms = [customer_id];
          let pidx = 2;
          if (location_id) { cond.push(`o.location_id = $${pidx++}`); prms.push(location_id); }
          prms.push(10);

          const { rows: suggOrders } = await fastify.pg.query(
            `SELECT o.id, o.order_number, o.location_id, o.order_type, o.total, o.delivery_address, o.created_at, l.name AS location_name
             FROM orders o JOIN locations l ON l.id = o.location_id
             WHERE ${cond.join(' AND ')}
             ORDER BY o.created_at DESC LIMIT $${pidx}`,
            prms
          );

          const suggestions = [];
          for (const order of suggOrders) {
            const { rows: sItems } = await fastify.pg.query(
              'SELECT menu_item_id, name, size, quantity, unit_price, total_price, customizations, special_requests FROM order_items WHERE order_id = $1',
              [order.id]
            );

            const unavail = [];
            for (const item of sItems) {
              if (item.menu_item_id) {
                const { rows: [mi] } = await fastify.pg.query('SELECT is_available FROM menu_items WHERE id = $1', [item.menu_item_id]);
                if (mi && !mi.is_available) unavail.push(item.name);
                if (location_id) {
                  const { rows: oos } = await fastify.pg.query(
                    `SELECT t.name FROM menu_item_toppings mit JOIN toppings t ON t.id = mit.topping_id
                     LEFT JOIN location_stock ls ON ls.item_id = t.id AND ls.item_type = 'topping' AND ls.location_id = $1
                     WHERE mit.menu_item_id = $2 AND mit.is_required = true AND ls.stock_status = 'out_of_stock'`,
                    [location_id, item.menu_item_id]
                  );
                  for (const t of oos) unavail.push(`${item.name} (missing ${t.name})`);
                }
              }
            }

            suggestions.push({
              order_id: order.id, order_number: order.order_number,
              location_name: order.location_name, order_type: order.order_type,
              total: Number(order.total), delivery_address: order.delivery_address,
              created_at: order.created_at,
              items: sItems.map(i => ({
                menu_item_id: i.menu_item_id, name: i.name, size: i.size,
                quantity: i.quantity, unit_price: Number(i.unit_price),
                total_price: Number(i.total_price), customizations: i.customizations,
                special_requests: i.special_requests,
              })),
              item_summary: sItems.map(i => `${i.quantity}x ${i.size ? i.size + ' ' : ''}${i.name}`).join(', '),
              available: unavail.length === 0, unavailable_items: unavail.length ? unavail : undefined,
              can_reorder: unavail.length === 0,
            });
          }

          const seen = new Set();
          const unique = suggestions.filter(s => {
            const key = s.items.map(i => `${i.menu_item_id || i.name}:${i.size}:${i.quantity}`).sort().join('|');
            if (seen.has(key)) return false;
            seen.add(key); return true;
          });

          result = { customer: { id: cust.id, name: cust.name }, suggestions: unique.slice(0, 5) };
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

// Helper functions are imported from menuHelpers.js
// createOrder remains here as it's order-specific

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

  // Get location for delivery fee
  const { rows: [location] } = await fastify.pg.query(
    'SELECT delivery_fee, delivery_min_order, delivery_zones FROM locations WHERE id = $1',
    [location_id]
  );

  let subtotal = 0;
  for (const item of items) {
    let itemTotal = Number(item.unit_price || 0) * (item.quantity || 1);

    // Add topping surcharges
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

  // Calculate delivery fee
  let deliveryFee = 0;
  if (order_type === 'delivery' && location) {
    if (location.delivery_zones && Array.isArray(location.delivery_zones)) {
      // Use base delivery fee for now (distance-based calculation would need customer coords)
      deliveryFee = Number(location.delivery_fee || 0);
    } else {
      deliveryFee = Number(location.delivery_fee || 0);
    }
  }

  // Apply discount/special
  let discount = 0;
  if (special_id) {
    const { rows: [special] } = await fastify.pg.query('SELECT * FROM specials WHERE id = $1', [special_id]);
    if (special) {
      if (special.discount_type === 'percentage') discount = Math.round(subtotal * special.discount_value) / 100;
      else if (special.discount_type === 'fixed') discount = special.discount_value;
      else if (special.discount_type === 'buy_one_get_one' && items.length >= 2) {
        // BOGO: cheapest item is free
        const prices = items.map(i => Number(i.unit_price || 0));
        discount = Math.min(...prices);
      }
    }
  }

  const taxRate = 0.13; // Ontario HST
  const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
  const total = Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100;
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
    const customizations = item.customizations || {};
    const addedToppings = customizations.added_toppings || [];
    const extraCheese = customizations.extra_cheese;

    // Calculate item total including toppings
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
    subtotal: Number(fullOrder.subtotal),
    tax: Number(fullOrder.tax),
    discount: Number(fullOrder.discount || 0),
    delivery_fee: deliveryFee,
    total: Number(fullOrder.total),
    estimated_time: order_type === 'delivery' ? '35-45 minutes' : '20-25 minutes',
    message: `Order confirmed! Your order number is ${fullOrder.order_number}. Subtotal: $${Number(fullOrder.subtotal).toFixed(2)}${discount > 0 ? `, Discount: -$${Number(discount).toFixed(2)}` : ''}, Tax (13% HST): $${Number(fullOrder.tax).toFixed(2)}${deliveryFee > 0 ? `, Delivery fee: $${deliveryFee.toFixed(2)}` : ''}, Total: $${Number(fullOrder.total).toFixed(2)}. Estimated ${order_type === 'delivery' ? 'delivery' : 'pickup'} time is ${order_type === 'delivery' ? '35-45' : '20-25'} minutes.`,
  };
}