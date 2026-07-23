require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const postgres = require('@fastify/postgres');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const locationRoutes = require('./routes/locations');
const callRoutes = require('./routes/calls');
const dashboardRoutes = require('./routes/dashboard');
const retellRoutes = require('./routes/retell');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://sliceline:sliceline_dev@localhost:5432/sliceline';

async function start() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });
  await fastify.register(postgres, { connectionString: DATABASE_URL });

  // Routes
  fastify.register(orderRoutes, { prefix: '/api/orders' });
  fastify.register(menuRoutes, { prefix: '/api/menu' });
  fastify.register(locationRoutes, { prefix: '/api/locations' });
  fastify.register(callRoutes, { prefix: '/api/calls' });
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  fastify.register(retellRoutes, { prefix: '/api/retell' });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', service: 'sliceline' }));

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`SliceLine API listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();