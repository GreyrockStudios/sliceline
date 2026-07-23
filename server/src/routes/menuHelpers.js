// SliceLine Menu Helpers — shared between menu route and retell route
// Handles: menu fetching, topping dependency resolution, stock cascading

/**
 * Get the full menu for a location, with overrides, stock, and topping dependencies applied.
 * 
 * Key logic:
 * - If a REQUIRED topping on a pizza is out of stock → pizza is marked unavailable
 * - default_toppings array is included on each item so the agent knows what's on each pizza
 * - unavailable_reason explains WHY a pizza is unavailable (which toppings)
 */
async function getLocationMenu(fastify, locationId) {
  const locResult = await fastify.pg.query('SELECT franchise_id FROM locations WHERE id = $1', [locationId]);
  if (!locResult.rows.length) return null;
  const franchiseId = locResult.rows[0].franchise_id;

  // Categories
  const catsResult = await fastify.pg.query(
    'SELECT * FROM menu_categories WHERE franchise_id = $1 AND is_active = true ORDER BY display_order',
    [franchiseId]
  );

  // Menu items
  const itemsResult = await fastify.pg.query(
    `SELECT mi.* FROM menu_items mi
     WHERE mi.franchise_id = $1 AND mi.is_available = true ORDER BY mi.display_order`,
    [franchiseId]
  );

  // Location overrides
  const overridesResult = await fastify.pg.query(
    'SELECT * FROM location_menu_overrides WHERE location_id = $1', [locationId]
  );
  const overrides = new Map(overridesResult.rows.map(o => [o.menu_item_id, o]));

  // Menu item stock
  const stockResult = await fastify.pg.query(
    `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'menu_item' AND stock_status != 'in_stock'`,
    [locationId]
  );
  const stock = new Map(stockResult.rows.map(s => [s.item_id, s]));

  // Default toppings for menu items (pizza recipes)
  const mitResult = await fastify.pg.query(
    `SELECT mit.*, t.name AS topping_name, t.base_price, t.is_premium
     FROM menu_item_toppings mit
     JOIN toppings t ON t.id = mit.topping_id
     WHERE mit.menu_item_id = ANY($1)
     ORDER BY mit.display_order`,
    [itemsResult.rows.map(i => i.id)]
  );
  const itemToppings = new Map();
  for (const row of mitResult.rows) {
    if (!itemToppings.has(row.menu_item_id)) itemToppings.set(row.menu_item_id, []);
    itemToppings.get(row.menu_item_id).push({
      topping_id: row.topping_id,
      name: row.topping_name,
      is_required: row.is_required,
      price: row.base_price,
      is_premium: row.is_premium,
    });
  }

  // Toppings (available for add-on)
  const toppingsResult = await fastify.pg.query(
    'SELECT * FROM toppings WHERE franchise_id = $1 AND is_available = true ORDER BY is_premium, name',
    [franchiseId]
  );

  // Topping overrides
  const topOverridesResult = await fastify.pg.query(
    'SELECT * FROM location_topping_overrides WHERE location_id = $1', [locationId]
  );
  const topOverrides = new Map(topOverridesResult.rows.map(o => [o.topping_id, o]));

  // Topping stock
  const topStockResult = await fastify.pg.query(
    `SELECT * FROM location_stock WHERE location_id = $1 AND item_type = 'topping' AND stock_status != 'in_stock'`,
    [locationId]
  );
  const topStock = new Map(topStockResult.rows.map(s => [s.item_id, s]));

  // Build set of topping IDs that are out of stock
  const outOfStockToppings = new Set();
  for (const [tid, ts] of topStock) {
    if (ts.stock_status === 'out_of_stock') outOfStockToppings.add(tid);
  }

  // Build toppings list with overrides and stock
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

  // Build items with overrides, stock, and topping dependencies
  const items = itemsResult.rows.map(item => {
    const override = overrides.get(item.id);
    const stockInfo = stock.get(item.id);
    const defaultToppings = itemToppings.get(item.id) || [];

    // Skip discontinued items
    if (stockInfo && stockInfo.stock_status === 'discontinued') return null;

    // Item-level out of stock
    if (stockInfo && stockInfo.stock_status === 'out_of_stock') {
      return {
        ...item,
        is_available: false,
        stock_status: stockInfo.stock_status,
        stock_notes: stockInfo.notes,
        expected_restock: stockInfo.expected_restock_at,
        default_toppings: defaultToppings,
      };
    }

    // Low stock
    if (stockInfo && stockInfo.stock_status === 'low_stock') {
      return {
        ...item,
        stock_status: 'low_stock',
        stock_quantity: stockInfo.quantity,
        stock_notes: stockInfo.notes,
        default_toppings: defaultToppings,
      };
    }

    // Check if any REQUIRED topping is out of stock → pizza unavailable
    const unavailableRequiredToppings = defaultToppings
      .filter(dt => dt.is_required && outOfStockToppings.has(dt.topping_id))
      .map(dt => dt.name);

    if (unavailableRequiredToppings.length > 0) {
      const itemObj = override
        ? { ...item, base_price: override.price_override || item.base_price, sizes: override.sizes_override || item.sizes }
        : { ...item };
      itemObj.is_available = false;
      itemObj.unavailable_reason = `Out of stock: ${unavailableRequiredToppings.join(', ')}`;
      itemObj.default_toppings = defaultToppings;
      return itemObj;
    }

    // Available — apply price override if exists
    if (override) {
      return {
        ...item,
        base_price: override.price_override || item.base_price,
        sizes: override.sizes_override || item.sizes,
        is_available: override.is_available !== false,
        default_toppings: defaultToppings,
      };
    }

    return { ...item, default_toppings: defaultToppings };
  }).filter(Boolean);

  // Specials
  const specialsResult = await fastify.pg.query(
    `SELECT s.* FROM specials s
     WHERE s.franchise_id = $1 AND s.is_active = true
     AND (s.start_date IS NULL OR s.start_date <= CURRENT_DATE)
     AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)`,
    [franchiseId]
  );

  const exclusionsResult = await fastify.pg.query(
    'SELECT special_id FROM location_specials WHERE location_id = $1 AND is_excluded = true',
    [locationId]
  );
  const excludedIds = new Set(exclusionsResult.rows.map(e => e.special_id));
  const franchiseSpecials = specialsResult.rows.filter(s => !excludedIds.has(s.id));

  const locationSpecialsResult = await fastify.pg.query(
    `SELECT id, name, description, discount_type, discount_value, applies_to, applies_to_id,
            day_of_week, start_time, end_time, start_date, end_date
     FROM location_specials
     WHERE location_id = $1 AND is_active = true AND special_id IS NULL
     AND (start_date IS NULL OR start_date <= CURRENT_DATE)
     AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
    [locationId]
  );

  // Group items by category
  const menu = catsResult.rows.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id),
  }));

  return {
    location_id: locationId,
    categories: menu,
    toppings,
    specials: [...franchiseSpecials, ...locationSpecialsResult.rows],
  };
}

module.exports = { getLocationMenu };