# SliceLine 🍕

> "This is our moment. This is SliceLine." — Silicon Valley

Automated pizza ordering voice agent. Customers call in, the AI agent takes their order, answers questions about specials, confirms the order, and routes it to the correct franchise location's POS.

## Architecture

- **Voice:** Retell AI (telephony + STT/TTS)
- **Backend:** Node.js + Fastify + PostgreSQL
- **Dashboard:** Next.js (store orders, active calls, transcripts)
- **POS:** Pluggable adapter pattern (mocked for PoC)

## Features

- 📞 Voice-activated pizza ordering via phone
- 🏪 50-location franchise routing (caller → nearest store)
- 🍕 Full menu management (per-location pricing overrides)
- ✅ Order confirmation before submission
- 📝 Call transcript storage & review
- 📊 Live store dashboard (orders, active calls, transcripts)
- 🔌 POS integration via adapters (Square, Toast, Clover — mock for PoC)

## Project Structure

```
sliceline/
├── server/           # Fastify API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── db/        # Database schema & migrations
│   │   └── retell/    # Retell agent config & tools
│   └── package.json
├── dashboard/         # Next.js store dashboard
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Quick Start

```bash
# Start everything
docker compose up -d

# API at http://localhost:3000
# Dashboard at http://localhost:3001
# Retell webhook at http://localhost:3000/api/retell/webhook
```

## Deployment

Served at `sliceline.greyrockstudios.com` (homelab)

## License

Proprietary — Greyrock Studios
