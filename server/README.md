# SliceLine API Server

Fastify-based API server handling Retell webhooks, menu management, order processing, franchise routing, and call transcript storage.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RETELL_API_KEY` | Yes* | Retell AI API key (*required for production, works in mock mode without) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment mode |

## API Endpoints

### Retell Integration
- `POST /api/retell/webhook` — Retell call events (create_transcript, call_ended)
- `POST /api/retell/tool-call` — Retell agent function calling

### Orders
- `GET /api/orders` — List orders (filter by location, status, date)
- `GET /api/orders/:id` — Get order details
- `POST /api/orders` — Create new order
- `PATCH /api/orders/:id/status` — Update order status

### Menu
- `GET /api/menu/:locationId` — Get menu for a specific location
- `POST /api/menu/items` — Add menu item
- `PUT /api/menu/items/:id` — Update menu item
- `DELETE /api/menu/items/:id` — Remove menu item
- `GET /api/menu/specials/:locationId` — Get current specials

### Locations
- `GET /api/locations` — List all franchise locations
- `GET /api/locations/:id` — Get location details
- `POST /api/locations/nearest` — Find nearest location by address/coordinates

### Calls
- `GET /api/calls` — List call transcripts (filter by location, date)
- `GET /api/calls/:id` — Get call transcript + metadata

### Dashboard
- `GET /api/dashboard/:locationId` — Live dashboard data (active orders, calls, stats)