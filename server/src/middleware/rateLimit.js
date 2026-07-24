/**
 * Simple sliding-window rate limiter using in-memory Map.
 *
 * Per API key, tracks request timestamps within a 1-minute window.
 * Resets on server restart (acceptable for now — Redis upgrade later).
 *
 * Returns 429 with Retry-After header when limit is exceeded.
 */

// In-memory store: Map<apiKeyId, number[]>
// Each entry is an array of timestamps (ms) within the current window
const requestWindows = new Map();

// Clean up stale entries every 2 minutes
const CLEANUP_INTERVAL = 120_000;
let cleanupTimer = null;

function cleanup() {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  for (const [keyId, timestamps] of requestWindows.entries()) {
    // Remove timestamps older than 1 minute
    const fresh = timestamps.filter(t => t > oneMinuteAgo);
    if (fresh.length === 0) {
      requestWindows.delete(keyId);
    } else {
      requestWindows.set(keyId, fresh);
    }
  }
}

/**
 * Fastify plugin for per-API-key rate limiting.
 */
module.exports = async function rateLimitPlugin(fastify, opts) {
  // Start cleanup timer
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL);
  cleanupTimer.unref(); // Don't keep process alive for this

  const DEFAULT_RATE_LIMIT = parseInt(process.env.DEFAULT_RATE_LIMIT || '100', 10);

  fastify.addHook('onRequest', async (request, reply) => {
    // Skip CORS preflight
    if (request.method === 'OPTIONS') return;

    // Skip public paths (same set as auth middleware)
    const PUBLIC_PATHS = [
      '/health',
      '/api/vapi/webhook',
      '/api/vapi/tool-call',
      '/api/retell/webhook',
    ];
    if (PUBLIC_PATHS.some(p => request.url.startsWith(p))) return;

    // If no auth context (shouldn't happen if auth runs first), skip
    const keyId = request.api_key_id;
    if (!keyId) return;

    const limit = request.api_key_rate_limit || DEFAULT_RATE_LIMIT;
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Get or create window for this key
    let timestamps = requestWindows.get(keyId) || [];

    // Filter to only requests within the last minute
    timestamps = timestamps.filter(t => t > oneMinuteAgo);

    // Check if over limit
    if (timestamps.length >= limit) {
      // Calculate when the oldest request in the window will expire
      const oldestInWindow = timestamps[0];
      const retryAfter = Math.ceil((oldestInWindow + 60_000 - now) / 1000);

      reply.header('Retry-After', String(Math.max(retryAfter, 1)));
      reply.header('X-RateLimit-Limit', String(limit));
      reply.header('X-RateLimit-Remaining', '0');

      return reply.code(429).send({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit is ${limit} per minute. Retry after ${retryAfter}s.`,
        retry_after_seconds: Math.max(retryAfter, 1),
      });
    }

    // Record this request
    timestamps.push(now);
    requestWindows.set(keyId, timestamps);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', String(limit));
    reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - timestamps.length)));
  });
};