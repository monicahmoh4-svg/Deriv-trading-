# Deriv Terminal - third-party Deriv trading app

A token-based third-party trading app for Deriv synthetic indices: users sign up,
link their own Deriv account with an API token (never a password), see live prices,
and place manual trades. Built to deploy as two independent services - **frontend
on Vercel**, **backend on Render**.

## Architecture

```
React (Vercel)  <-- REST + Socket.IO -->  Express/Node (Render)  <-- WebSocket -->  Deriv API
                                                |
                                          PostgreSQL (Render)
```

- **Frontend**: React + Vite. Talks to the backend over REST for auth/trades, and over
  Socket.IO for live ticks.
- **Backend**: Express API + a `DerivConnection` class per logged-in user that holds one
  authenticated WebSocket to `wss://ws.derivws.com`. Handles reconnects with exponential
  backoff, request/response correlation, encryption of stored tokens, and risk checks
  before every trade.
- **Database**: PostgreSQL - users, encrypted Deriv tokens, trades, per-user risk settings.
- Deriv **passwords are never collected**. Only an encrypted API token ever touches the database.

## What's actually built right now

- Signup/login (JWT), Deriv account linking via API token, encrypted token storage (AES-256-GCM)
- Live tick streaming (Socket.IO bridge to a per-user Deriv WebSocket)
- Manual trading: proposal → buy → contract tracking, trade history
- Risk checks before every buy: max stake, max trades/day, daily loss limit
- A dashboard styled after your reference screenshot: top nav with tabs, live ticker
  strip across multiple synthetic indices (fetched live from Deriv, not hardcoded),
  quick-action tiles, a "live market signals" panel, and a risk disclaimer banner
- **Bot Builder / Bulk Trader / AI Bots / Copy Trader / Analysis Tools** are present in the
  nav as "Coming soon" pages - this matches the phased plan you described (manual trading
  first, automation layered in after)

One deliberate change from the reference screenshot: the "Live Trading Signals" cards show
**historical last-digit frequency** (over/under 5, odd/even, most/least frequent digit) instead
of a "confidence %" framing. Deriv's synthetic indices run on a published, audited random number
generator - there's no real predictive edge to claim, and presenting plain frequency stats as a
"confidence score" would be misleading. The stats are real and computed live from the actual tick
stream; they're just honestly labeled.

## Local development

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (see below)
npm install
psql "$DATABASE_URL" -f migrations/001_init.sql
npm run dev             # http://localhost:4000

# Frontend
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to localhost:4000
```

## Register your own Deriv app (do this before going live)

The code defaults to Deriv's public demo `app_id=1089`, which is fine for local testing but
**not for production** - it's shared by everyone and may be rate-limited or restricted.

1. Log in at https://api.deriv.com/dashboard (or https://developers.deriv.com).
2. Register a new application - set the redirect/allowed URL to your Vercel frontend URL.
3. Copy the generated `app_id` into `DERIV_APP_ID` on Render.

## Deploying the backend on Render

1. Push this repo to GitHub.
2. In Render: **New > Blueprint**, point it at the repo. It will read `backend/render.yaml`
   and provision the web service + a managed Postgres database automatically.
   (No blueprint support, or want to do it by hand? **New > Web Service**, root directory
   `backend`, build command `npm install`, start command `node src/server.js`, then add a
   separate **New > PostgreSQL** and copy its connection string into `DATABASE_URL`.)
3. After the first deploy, open a shell for the service (or run locally against the Render
   `DATABASE_URL`) and run the migration:
   ```bash
   psql "$DATABASE_URL" -f migrations/001_init.sql
   ```
4. Set the environment variables below in the Render dashboard.
5. Note your backend's `*.onrender.com` URL - you'll need it for the frontend.

### Backend environment variables (Render)

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Render sets this automatically - leave it |
| `DATABASE_URL` | from your Render Postgres instance (auto-filled if using the blueprint) |
| `JWT_SECRET` | a long random string - `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `ENCRYPTION_KEY` | **exactly 64 hex chars** - `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DERIV_APP_ID` | your own registered app_id (see above); `1089` works for testing only |
| `FRONTEND_URL` | your Vercel URL, e.g. `https://your-app.vercel.app` (used for CORS) |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |

## Deploying the frontend on Vercel

1. Import the repo into Vercel, set the **root directory to `frontend`**.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`
   (already configured in `frontend/vercel.json`, which also adds the SPA rewrite so
   client-side routes work on refresh).
3. Set the environment variables below, then deploy.

### Frontend environment variables (Vercel)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

After both are live, go back to Render and double check `FRONTEND_URL` matches your real
Vercel URL exactly (including `https://`), or the browser will block API calls with a CORS error.

## Security notes

- Tokens are encrypted with AES-256-GCM before they ever touch the database (`src/utils/encryption.js`).
- The logger redacts token/password fields by key name (`src/utils/logger.js`) - don't bypass it
  with raw `console.log` on request bodies.
- Auth, trade, and general API rate limits are separate (`src/middleware/rateLimiter.js`) so a
  runaway trading loop can't be used to brute-force login or hammer Deriv.
- `helmet` + scoped CORS are on by default; HTTPS is handled by Render/Vercel's edge.

## Known limitations / what's next

- **Single instance only**: the per-user `DerivConnection` map lives in the Node process's
  memory (`src/services/connectionManager.js`). Fine for one Render instance; if you ever scale
  to multiple instances you'll need sticky sessions or to move connection state to Redis.
- **Token method only**: this ships Option A (paste an API token) per your own phased plan.
  The OAuth-style "Connect with Deriv" redirect flow (Option B) is a clean next step and would
  let you support multiple linked accounts per user.
- **Manual trading only**: Bot Builder, Bulk Trader, AI Bots, and Copy Trader are nav placeholders.
  Layering in real automation means adding a background worker that runs strategies against the
  same `DerivConnection`/risk-check path manual trades already use - the trade execution and risk
  layers underneath don't change.
- **Compliance**: because trades execute on the user's own Deriv account via their own token, this
  app never custodies client funds - it's closer to a trading terminal than a broker. If you start
  offering trade signals or automated strategies as advice rather than tools, look into whether that
  triggers investment-advice licensing requirements in the jurisdictions you operate in.

## Project layout

```
backend/
  src/
    config/db.js              Postgres pool
    middleware/                auth (JWT), rate limiters
    services/
      derivConnection.js      one WebSocket session per user, with reconnect
      connectionManager.js    userId -> DerivConnection map
    models/                    users, deriv_accounts, trades, risk_settings (raw SQL)
    routes/                    auth, deriv (connect/account), trade, market
    sockets/index.js           Socket.IO auth + tick/contract bridge
    utils/                     AES-256-GCM encryption, redacting logger
  migrations/001_init.sql
  render.yaml

frontend/
  src/
    context/                   Auth, Socket (multiplexed ticks), Account
    components/                TopNav, TickerStrip, SignalsPanel, TickChart,
                                TradeHistory, RiskDisclaimer
    pages/                      Login, Signup, ConnectDeriv, Dashboard, Trade, ComingSoon
  vercel.json
```
