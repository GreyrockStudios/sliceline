-- SliceLine Database Schema
-- Supports franchise routing, per-location menus, order management, and call transcripts

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- FRANCHISE & LOCATIONS
-- ============================================

CREATE TABLE franchises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  store_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT true,
  delivery_radius_km INTEGER DEFAULT 8,
  -- Hours of operation (JSON array of weekly schedule)
  -- [{day: 0, open: "11:00", close: "23:00", is_closed: false}, ...]
  -- day: 0=Sun, 1=Mon, ..., 6=Sat
  hours JSONB DEFAULT '[
    {"day": 0, "open": "11:00", "close": "22:00", "is_closed": false},
    {"day": 1, "open": "11:00", "close": "23:00", "is_closed": false},
    {"day": 2, "open": "11:00", "close": "23:00", "is_closed": false},
    {"day": 3, "open": "11:00", "close": "23:00", "is_closed": false},
    {"day": 4, "open": "11:00", "close": "23:00", "is_closed": false},
    {"day": 5, "open": "11:00", "close": "24:00", "is_closed": false},
    {"day": 6, "open": "11:00", "close": "24:00", "is_closed": false}
  ]'::jsonb,
  -- Phone greeting played/spoken when call connects
  phone_greeting TEXT DEFAULT 'Thank you for calling Demo Pizza! How can I help you today?',
  -- Delivery configuration
  delivery_enabled BOOLEAN DEFAULT true,
  delivery_fee DECIMAL(5, 2) DEFAULT 0,
  delivery_min_order DECIMAL(8, 2) DEFAULT 0,
  -- Delivery zones: [{radius_km: 5, fee: 3.00}, {radius_km: 8, fee: 5.00}]
  delivery_zones JSONB DEFAULT '[{"radius_km": 5, "fee": 3.00}, {"radius_km": 8, "fee": 5.00}]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, store_number)
);

CREATE INDEX idx_locations_franchise ON locations(franchise_id);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE is_active = true;

-- ============================================
-- MENU
-- ============================================

-- Menu categories (Pizzas, Sides, Drinks, etc.)
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, slug)
);

-- Menu items (base definition — prices can be overridden per location)
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  base_price DECIMAL(8, 2) NOT NULL,
  sizes JSONB DEFAULT '[]',  -- [{name: "Small", price: 12.99}, {name: "Medium", price: 15.99}, ...]
  is_available BOOLEAN DEFAULT true,
  -- Time availability: when this item is available
  -- null = always available, [{day: 1, start: "11:00", end: "14:00"}] = weekday lunch only
  available_times JSONB DEFAULT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, slug)
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_franchise ON menu_items(franchise_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available) WHERE is_available = true;

-- Per-location price overrides and availability
CREATE TABLE location_menu_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  price_override DECIMAL(8, 2),
  sizes_override JSONB,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, menu_item_id)
);

-- Toppings
CREATE TABLE toppings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  base_price DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
  is_premium BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, name)
);

-- Per-location topping overrides
CREATE TABLE location_topping_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  price_override DECIMAL(5, 2),
  is_available BOOLEAN DEFAULT true,
  UNIQUE(location_id, topping_id)
);

-- Pizza toppings (which toppings come on each menu item by default)
-- This is the critical link: a pizza's availability depends on its default toppings being in stock
-- When a topping is out of stock, any pizza that requires it becomes unavailable
-- Customers can also add/remove toppings when ordering
CREATE TABLE menu_item_toppings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES toppings(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,  -- true = core ingredient (out of stock = pizza unavailable), false = default but removable
  display_order INTEGER DEFAULT 0,
  UNIQUE(menu_item_id, topping_id)
);

CREATE INDEX idx_menu_item_toppings_item ON menu_item_toppings(menu_item_id);
CREATE INDEX idx_menu_item_toppings_topping ON menu_item_toppings(topping_id);

-- ============================================
-- INVENTORY / STOCK TRACKING
-- ============================================

-- Per-location stock status for menu items and toppings
CREATE TABLE location_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,  -- 'menu_item' or 'topping'
  item_id UUID NOT NULL,  -- references menu_items.id or toppings.id
  stock_status VARCHAR(20) NOT NULL DEFAULT 'in_stock',  -- in_stock, low_stock, out_of_stock, discontinued
  quantity INTEGER,  -- null = unlimited, 0 = out, >0 = count remaining
  expected_restock_at TIMESTAMPTZ,  -- when it's expected back (for agent to say "back by Thursday")
  notes TEXT,  -- e.g. "seasonal", "supplier delay"
  updated_by VARCHAR(50) DEFAULT 'system',  -- 'system', 'manager', 'agent'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, item_type, item_id)
);

CREATE INDEX idx_location_stock_location ON location_stock(location_id);
CREATE INDEX idx_location_stock_status ON location_stock(stock_status) WHERE stock_status != 'in_stock';

-- ============================================
-- SPECIALS / PROMOTIONS
-- ============================================

-- Specials / promotions (franchise-wide defaults)
CREATE TABLE specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',  -- percentage, fixed, buy_one_get_one
  discount_value DECIMAL(8, 2) NOT NULL,
  applies_to VARCHAR(20) DEFAULT 'order',  -- order, category, item, delivery
  applies_to_id UUID,  -- reference to category or item if applicable
  day_of_week INTEGER[],  -- 0=Sun, 1=Mon, ..., null = all days
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-location specials (overrides + location-only deals)
-- A location can: opt out of a franchise special, or have its own unique special
CREATE TABLE location_specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  special_id UUID REFERENCES specials(id) ON DELETE CASCADE,  -- null = location-exclusive special
  is_excluded BOOLEAN DEFAULT false,  -- true = this location doesn't participate in the franchise special
  price_override DECIMAL(8, 2),  -- location-specific price adjustment
  custom_description TEXT,  -- override the franchise description for this location
  -- For location-exclusive specials (special_id is null):
  name VARCHAR(255),
  description TEXT,
  discount_type VARCHAR(20) DEFAULT 'percentage',
  discount_value DECIMAL(8, 2),
  applies_to VARCHAR(20) DEFAULT 'order',
  applies_to_id UUID,
  day_of_week INTEGER[],
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_location_specials_location ON location_specials(location_id);
CREATE INDEX idx_location_specials_special ON location_specials(special_id);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  default_location_id UUID REFERENCES locations(id),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  customer_id UUID REFERENCES customers(id),
  call_id UUID,  -- link to call transcript
  
  -- Customer info (denormalized for speed)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  delivery_address TEXT,
  delivery_instructions TEXT,
  
  order_type VARCHAR(20) NOT NULL DEFAULT 'pickup',  -- pickup, delivery
  status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending, confirmed, preparing, ready, completed, cancelled
  
  subtotal DECIMAL(8, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(8, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(8, 2) NOT NULL DEFAULT 0,
  total DECIMAL(8, 2) NOT NULL DEFAULT 0,
  special_id UUID REFERENCES specials(id),
  
  -- POS integration
  pos_status VARCHAR(30) DEFAULT 'pending',  -- pending, submitted, accepted, rejected
  pos_order_id VARCHAR(255),
  pos_submitted_at TIMESTAMPTZ,
  
  estimated_ready_time TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_location ON orders(location_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Order line items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name VARCHAR(255) NOT NULL,
  size VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(8, 2) NOT NULL,
  total_price DECIMAL(8, 2) NOT NULL,
  customizations JSONB DEFAULT '{}',  -- {toppings: [...], crust: "...", sauce: "..."}
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- CALLS & TRANSCRIPTS
-- ============================================

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retell_call_id VARCHAR(255) UNIQUE,
  location_id UUID REFERENCES locations(id),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  
  caller_phone VARCHAR(20),
  caller_name VARCHAR(255),
  
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',  -- in_progress, completed, failed, abandoned
  direction VARCHAR(10) DEFAULT 'inbound',
  
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Transcript storage
  transcript_url TEXT,  -- Retell URL if available
  transcript_text TEXT,  -- Full transcript text
  
  -- Summary / analysis
  order_accuracy_verified BOOLEAN,
  verification_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_location ON calls(location_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_started ON calls(started_at DESC);
CREATE INDEX idx_calls_retell ON calls(retell_call_id);

-- Individual transcript segments (for search and review)
CREATE TABLE call_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  speaker VARCHAR(20) NOT NULL,  -- 'agent' or 'customer'
  text TEXT NOT NULL,
  timestamp_ms INTEGER,
  intent VARCHAR(100),  -- detected intent: greeting, menu_inquiry, place_order, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_segments_call ON call_segments(call_id);

-- ============================================
-- VIEWS
-- ============================================

-- Live dashboard view per location
CREATE VIEW location_dashboard AS
SELECT 
  l.id AS location_id,
  l.name AS location_name,
  l.store_number,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('pending', 'confirmed', 'preparing')) AS active_orders,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'in_progress') AS active_calls,
  COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= NOW() - INTERVAL '24 hours') AS orders_last_24h,
  COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= NOW() - INTERVAL '24 hours'), 0) AS revenue_last_24h,
  (SELECT COUNT(*) FROM location_stock ls WHERE ls.location_id = l.id AND ls.stock_status = 'out_of_stock') AS out_of_stock_items
FROM locations l
LEFT JOIN orders o ON o.location_id = l.id
LEFT JOIN calls c ON c.location_id = l.id
WHERE l.is_active = true
GROUP BY l.id, l.name, l.store_number;

-- Stock alerts view (for dashboard + agent awareness)
CREATE VIEW stock_alerts AS
SELECT 
  ls.id,
  ls.location_id,
  l.name AS location_name,
  l.store_number,
  ls.item_type,
  CASE 
    WHEN ls.item_type = 'menu_item' THEN mi.name
    WHEN ls.item_type = 'topping' THEN t.name
  END AS item_name,
  ls.stock_status,
  ls.quantity,
  ls.expected_restock_at,
  ls.notes,
  ls.updated_at
FROM location_stock ls
JOIN locations l ON l.id = ls.location_id
LEFT JOIN menu_items mi ON mi.id = ls.item_id AND ls.item_type = 'menu_item'
LEFT JOIN toppings t ON t.id = ls.item_id AND ls.item_type = 'topping'
WHERE ls.stock_status != 'in_stock'
ORDER BY ls.updated_at DESC;