-- SliceLine POS Integration Configuration
-- Migration 003

-- Per-franchise POS adapter configuration
-- Stores adapter-specific credentials and settings as JSONB
CREATE TABLE IF NOT EXISTS pos_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
  adapter VARCHAR(50) NOT NULL,  -- 'toast', 'square', 'clover'
  config JSONB NOT NULL DEFAULT '{}',  -- adapter-specific config (encrypted secrets stored here)
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id, adapter)
);

CREATE INDEX IF NOT EXISTS idx_pos_configs_franchise ON pos_configs(franchise_id);
CREATE INDEX IF NOT EXISTS idx_pos_configs_adapter ON pos_configs(adapter);