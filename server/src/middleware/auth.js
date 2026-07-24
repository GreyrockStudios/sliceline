const crypto = require('crypto');

// Paths that skip authentication entirely
const PUBLIC_PATHS = [
  '/health',
  '/api/vapi/webhook',       // Vapi webhook — needs unauthenticated access
  '/api/vapi/tool-call',     // Vapi tool calls — Retell also uses this format
  '/api/retell/webhook',     // Retell webhook
];

/**
 * Fastify plugin for API Key authentication.
 *
 * Supports two header formats:
 *   Authorization: Bearer sk_live_xxx
 *   x-api-key: sk_live_xxx
 *
 * On success, attaches:
 *   request.franchise_id       — UUID of the franchise
 *   request.api_key_id         — UUID of the api_key row
 *   request.api_key_permissions — array of permission strings
 *   request.api_key_name        — human-readable label
 */
module.exports = async function authPlugin(fastify, opts) {
  fastify.decorateRequest('franchise_id', null);
  fastify.decorateRequest('api_key_id', null);
  fastify.decorateRequest('api_key_permissions', null);
  fastify.decorateRequest('api_key_name', null);

  fastify.addHook('onRequest', async (request, reply) => {
    // Skip CORS preflight
    if (request.method === 'OPTIONS') return;

    // Skip public paths
    if (PUBLIC_PATHS.some(p => request.url.startsWith(p))) return;

    // Extract API key from headers
    let apiKey = null;

    // Authorization: Bearer sk_live_xxx
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7).trim();
    }

    // x-api-key header (fallback)
    if (!apiKey && request.headers['x-api-key']) {
      apiKey = request.headers['x-api-key'].trim();
    }

    // No key provided
    if (!apiKey) {
      return reply.code(401).send({
        error: 'Authentication required',
        message: 'Provide an API key via Authorization: Bearer <key> or x-api-key header',
      });
    }

    // Hash the key and look it up
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.slice(0, 8);

    try {
      const { rows } = await fastify.pg.query(
        `SELECT id, key_hash, key_prefix, name, franchise_id, permissions, rate_limit, is_active, expires_at
         FROM api_keys WHERE key_hash = $1`,
        [keyHash]
      );

      if (rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid API key' });
      }

      const key = rows[0];

      // Check if key is active
      if (!key.is_active) {
        return reply.code(403).send({ error: 'API key has been deactivated' });
      }

      // Check if key has expired
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        return reply.code(403).send({ error: 'API key has expired' });
      }

      // Update last_used_at (fire and forget — don't block the request)
      fastify.pg.query(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
        [key.id]
      ).catch(() => {}); // ignore errors

      // Attach tenant context to request
      request.franchise_id = key.franchise_id;
      request.api_key_id = key.id;
      request.api_key_permissions = key.permissions || ['read'];
      request.api_key_name = key.name;
      request.api_key_rate_limit = key.rate_limit || 100;

    } catch (err) {
      fastify.log.error({ err }, 'Auth lookup error');
      return reply.code(500).send({ error: 'Authentication error' });
    }
  });
};