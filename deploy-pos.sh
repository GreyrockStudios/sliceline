#!/bin/bash
# Deploy POS adapter framework to Sliceline LXC
# Run this script on the LXC (10.0.0.240) or via SSH
#
# Usage: bash deploy-pos.sh
#
# Prerequisites: SSH access to root@10.0.0.240

set -e

LXC_HOST="root@10.0.0.240"
SLICELINE_DIR="/opt/sliceline"

echo "=== Sliceline POS Adapter Deployment ==="

# 1. Copy updated code to the LXC
echo "[1/5] Syncing code to LXC..."
rsync -avz --exclude 'node_modules' --exclude '.git' \
  "$(dirname "$0")/" "$LXC_HOST:$SLICELINE_DIR/"

# 2. Run database migration
echo "[2/5] Running database migration..."
ssh "$LXC_HOST" "cd $SLICELINE_DIR && docker compose exec -T postgres psql -U sliceline -d sliceline -f /docker-entrypoint-initdb.d/01-init.sql" 2>/dev/null || true
# Run the pos_configs migration
ssh "$LXC_HOST" "cd $SLICELINE_DIR && docker compose exec -T postgres psql -U sliceline -d sliceline" <<'EOF'
-- Run migration 003: pos_configs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pos_configs') THEN
    CREATE TABLE pos_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
      adapter VARCHAR(50) NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(franchise_id, adapter)
    );
    CREATE INDEX idx_pos_configs_franchise ON pos_configs(franchise_id);
    CREATE INDEX idx_pos_configs_adapter ON pos_configs(adapter);
    RAISE NOTICE 'Created pos_configs table';
  ELSE
    RAISE NOTICE 'pos_configs table already exists';
  END IF;
END $$;
EOF

# 3. Rebuild Docker images
echo "[3/5] Rebuilding server Docker image..."
ssh "$LXC_HOST" "cd $SLICELINE_DIR && docker compose build server"

# 4. Restart server container
echo "[4/5] Restarting server container..."
ssh "$LXC_HOST" "cd $SLICELINE_DIR && docker compose up -d server"

# 5. Wait and test
echo "[5/5] Testing POS routes..."
sleep 5

echo ""
echo "Testing: Unknown adapter returns 400..."
curl -sk -X POST https://sliceline.greyrockstudios.com/api/pos/nonexistent/submit \
  -H "Content-Type: application/json" -d '{}' | python3 -m json.tool

echo ""
echo "Testing: Toast adapter with no order returns 400..."
curl -sk -X POST https://sliceline.greyrockstudios.com/api/pos/toast/submit \
  -H "Content-Type: application/json" -d '{}' | python3 -m json.tool

echo ""
echo "Testing: Toast adapter status check..."
curl -sk https://sliceline.greyrockstudios.com/api/pos/toast/status/test-order-123 | python3 -m json.tool

echo ""
echo "Testing: Available adapters..."
curl -sk https://sliceline.greyrockstudios.com/api/pos/ 2>/dev/null || true

echo ""
echo "=== Deployment Complete ==="
echo "Available POS adapters: toast, square, clover"
echo "Routes:"
echo "  POST   /api/pos/:adapter/submit"
echo "  GET    /api/pos/:adapter/status/:posOrderId"
echo "  POST   /api/pos/:adapter/sync-menu/:locationId"
echo "  GET    /api/pos/:adapter/availability/:locationId"
echo "  POST   /api/pos/:adapter/validate"