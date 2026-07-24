require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const postgres = require('@fastify/postgres');
const authPlugin = require('./middleware/auth');
const rateLimitPlugin = require('./middleware/rateLimit');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const locationRoutes = require('./routes/locations');
const callRoutes = require('./routes/calls');
const dashboardRoutes = require('./routes/dashboard');
const retellRoutes = require('./routes/retell');
const vapiRoutes = require('./routes/vapi');
const posRoutes = require('./routes/pos');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const { getAdapter, listAdapters } = require('./pos');
const { setupLLMWebSocket } = require('./llm-websocket');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://sliceline:sliceline_dev@localhost:5432/sliceline';

async function start() {
  const fastify = Fastify({ logger: true });

  // Core plugins
  await fastify.register(cors, { origin: true });
  await fastify.register(postgres, { connectionString: DATABASE_URL });

  // Auth & Rate Limiting (must be before routes)
  await fastify.register(authPlugin);
  await fastify.register(rateLimitPlugin);

  // Decorate fastify with POS adapter registry for use in route handlers
  fastify.decorate('posGetAdapter', getAdapter);
  fastify.decorate('posListAdapters', listAdapters);

  // Routes
  fastify.register(orderRoutes, { prefix: '/api/orders' });
  fastify.register(menuRoutes, { prefix: '/api/menu' });
  fastify.register(locationRoutes, { prefix: '/api/locations' });
  fastify.register(callRoutes, { prefix: '/api/calls' });
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  fastify.register(retellRoutes, { prefix: '/api/retell' });
  fastify.register(vapiRoutes, { prefix: '/api/vapi' });
  fastify.register(posRoutes, { prefix: '/api/pos' });
  fastify.register(adminRoutes, { prefix: '/api/admin' });
  fastify.register(customerRoutes, { prefix: '/api/customers' });

  // Health check (public — no auth required)
  fastify.get('/health', async () => ({ status: 'ok', service: 'sliceline' }));

  // Vapi web call widget (public — serves HTML)
  fastify.get('/call', async (request, reply) => {
    reply.type('text/html').send(CALL_HTML);
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`SliceLine API listening on port ${PORT}`);

    // Set up WebSocket for Retell Custom LLM (must be after listen so server is ready)
    setupLLMWebSocket(fastify);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();