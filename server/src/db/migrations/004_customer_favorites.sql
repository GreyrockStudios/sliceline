-- Migration 004: Customer favorites and reorder support
-- Tracks frequently-ordered item combos for quick reorder suggestions

-- Customer favorites: materialized view of most-ordered items per customer per location
CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  order_count INTEGER NOT NULL DEFAULT 1,
  last_ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Snapshot of what they usually order (size, customizations)
  usual_size VARCHAR(50),
  usual_customizations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, location_id, menu_item_id, usual_size)
);

CREATE INDEX idx_customer_favorites_customer ON customer_favorites(customer_id);
CREATE INDEX idx_customer_favorites_location ON customer_favorites(location_id);

-- Customer addresses (for delivery reorders — remember last delivery address)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]';
-- Format: [{"label": "Home", "street": "...", "city": "...", "state": "...", "zip": "...", "instructions": "...", "last_used": "2026-01-01"}]