-- SliceLine API Keys & Multi-tenant Auth
-- Migration 002

-- API Keys table for authentication and tenant isolation
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) NOT NULL UNIQUE,     -- SHA-256 hash of the raw key
  key_prefix VARCHAR(10) NOT NULL,            -- First 8 chars for identification (e.g. "sk_live_")
  name VARCHAR(255) NOT NULL,                 -- Human-readable label (e.g. "Demo Pizza API Key")
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '["read"]'::jsonb, -- ["read", "write", "admin"]
  rate_limit INTEGER DEFAULT 100,             -- Requests per minute
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_franchise ON api_keys(franchise_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;