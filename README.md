# Cucumber Admin

Admin dashboard for Cucumber Trading Arena - the control panel for arena management and system configuration. This is a separate application from the public-facing frontend, intended for platform operators to manage arenas, monitor agents, and process payouts.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CUCUMBER TRADING ARENA                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────┐                                │
│   │ cucumber-web │         │              │                                │
│   │ (Public UI)  │         │    Admin     │                                │
│   │   Port 3000  │         │    Users     │                                │
│   └──────────────┘         └──────┬───────┘                                │
│          │                        │                                         │
│          │                        │                                         │
│          │                        ▼                                         │
│          │                 ┌──────────────┐                                │
│          │                 │              │                                │
│          │                 │  ★ cucumber- │                                │
│          │                 │    admin ★   │                                │
│          │                 │  (THIS REPO) │                                │
│          │                 │   Port 3002  │                                │
│          │                 │              │                                │
│          │                 └──────┬───────┘                                │
│          │                        │                                         │
│          │ REST API               │ REST API                                │
│          │ WebSocket              │                                         │
│          ▼                        ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    cucumber-cerebellum                           │      │
│   │                    (Node.js/TypeScript)                         │      │
│   │                        Port 3001                                 │      │
│   │                                                                  │      │
│   │  Admin operations:                                               │      │
│   │  • Create/configure arenas                                       │      │
│   │  • Start/stop rounds                                             │      │
│   │  • Settle rounds & process payouts                               │      │
│   │  • Monitor agents                                                 │      │
│   │  • View system metrics                                           │      │
│   │                                                                  │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                         │                       │                           │
│                         ▼                       ▼                           │
│                  ┌──────────────┐        ┌──────────────┐                  │
│                  │  PostgreSQL  │        │    Redis     │                  │
│                  └──────────────┘        └──────────────┘                  │
│                                                │                            │
│                                                ▼                            │
│                                         ┌──────────────┐                   │
│                                         │cucumber-cortex│                  │
│                                         │   Port 8000  │                   │
│                                         └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Repository (cucumber-admin)

A separate admin interface for:
- **Creating and configuring trading arenas**: Set up new competition rounds with all parameters (duration, prize pool, trading pair, participant limits)
- **Setting min/max tick intervals for arenas**: Define the allowed range for agent tick speeds. Agents outside this range cannot join (e.g., arena allows 10s-120s, agent with 5s tick cannot join)
- **Starting, pausing, and stopping rounds**: Control the lifecycle of competitions. Starting a round activates all per-agent tick schedulers
- **Settling rounds and processing prize payouts**: After a round ends, calculate final rankings based on PnL and distribute prizes according to payout structure
- **Monitoring agents and system health**: View all registered agents, their configurations, and current status
- **Managing arena economics (buy-in, prize pools)**: Configure entry fees, seed the prize pool, set protocol fee percentage

## Communication Flow

### REST API (→ Cerebellum)
```
cucumber-admin  ────HTTP────►  cucumber-cerebellum
        │                            │
        │ POST /v1/rounds           │ Create arena with tick bounds
        │   { min_tick_interval,    │
        │     max_tick_interval,    │
        │     buy_in_fee,           │
        │     prize_pool_seed }     │
        │                            │
        │ POST /v1/rounds/:id/start │ Start tick schedulers
        │ POST /v1/rounds/:id/stop  │ Stop round
        │ POST /v1/rounds/:id/settle│ Calculate payouts
        │                            │
        │ GET /v1/agents            │ List all agents
        │ PUT /v1/agents/:id/activate│ Enable/disable
        │                            │
        │ GET /v1/arena/:id/payouts │ View payout records
        └────────────────────────────┘
```

## Project Structure

```
cucumber-admin/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx               # Dashboard home
│   │   │
│   │   ├── arenas/
│   │   │   ├── page.tsx           # Arena list
│   │   │   ├── create/
│   │   │   │   └── page.tsx       # Create new arena ★
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Arena detail/control
│   │   │       └── payouts/
│   │   │           └── page.tsx   # Payout records
│   │   │
│   │   ├── agents/
│   │   │   └── page.tsx           # Agent management
│   │   │
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── AdminNav.tsx       # Admin navigation
│   │   └── TradingPairCombobox.tsx# Trading pair selector
│   │
│   └── lib/
│       ├── api.ts                 # Cerebellum API client
│       └── utils.ts               # Utility functions
│
├── .env.local.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Key Pages

### Arena Creation (`/arenas/create`)

Configure new trading arenas with:

| Field | Description | Default |
|-------|-------------|---------|
| `name` | Arena display name | Required |
| `trading_pair` | Asset to trade (BTC/USDT, ETH/USDC, SOL/USDT, etc.) | ETH/USDC |
| `banner_url` | Arena banner image URL | Optional |
| `min_tick_interval` | Minimum agent tick (seconds) | 10 |
| `max_tick_interval` | Maximum agent tick (seconds) | 120 |
| `initial_balance` | Starting balance per agent | 1000 |
| `buy_in_fee` | Entry fee per agent | 0 |
| `prize_pool_seed` | Base prize pool | 0 |
| `duration_minutes` | Round duration | 60 |
| `agent_limit` | Max participants | 10 |

### Arena Control (`/arenas/[id]`)

Live arena dashboard with:
- Real-time countdown timer to arena end
- Live leaderboard with P&L rankings
- Market price display for trading pair
- Participant list with current positions

Manage active arenas:
- **Start**: Activates per-agent tick schedulers - each agent begins receiving ticks at their configured interval. The round is now "active" and trading begins
- **Pause**: Temporarily stops all agent ticks - useful for investigating issues or scheduled maintenance. Agents don't receive market updates while paused
- **Resume**: Resumes tick processing after a pause - agents continue from where they left off
- **Stop**: Ends the round permanently - no more trading allowed. Round status changes to "completed". Prepares for settlement
- **Settle**: Calculates final PnL rankings and distributes prize pool according to payout structure. Creates payout records in database

**Arena Lifecycle:**
```
pending → active → (pause ↔ resume) → completed → settled
   │         │                              │          │
   └─ Start ─┘                              └─ Stop ───┘
                                                   └─ Settle ─┘
```

### Payout View (`/arenas/[id]/payouts`)

View settlement results:
- Winner rankings
- Payout amounts per agent
- Total prize pool distribution

### Agent Management (`/agents`)

- View all registered agents
- Toggle agent active/inactive status
- View agent configurations
- Monitor agent risk settings

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development

```bash
npm run dev
```

Opens on [http://localhost:3002](http://localhost:3002)

## Build & Production

```bash
npm run build
npm start
```

## Security Considerations

This admin panel should be deployed separately from the public frontend:

| Deployment | Security Level |
|------------|----------------|
| `admin.cucumber.trade` (separate host) | Recommended |
| Internal VPN only | Most secure |
| `cucumber.trade/admin` (same app) | Not recommended |

### Access Control

For MVP, consider:
- Environment variable password protection
- IP whitelisting
- VPN requirement

For production:
- Admin wallet signature verification
- OAuth/SSO integration
- Role-based access control

## Arena Configuration

### Tick Interval Settings

When creating an arena, you set the allowed tick interval range:

```
┌─────────────────────────────────────────────────────────────┐
│                    ARENA TICK BOUNDS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  min_tick_interval: 10s    max_tick_interval: 120s          │
│           │                          │                       │
│           ▼                          ▼                       │
│  ├────────┼──────────────────────────┼────────────────────┤ │
│  5s      10s           60s          120s               300s │
│           │             │            │                       │
│           │    Agent A: 30s          │                       │
│           │             │            │                       │
│           │             └─ Agent B: 60s                      │
│           │                          │                       │
│           └── Agent C: 15s           │                       │
│                                      │                       │
│  Agents MUST have tick_interval within [min, max] to join   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Prize Pool Economics

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIZE POOL                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total Pool = prize_pool_seed + (participants × buy_in_fee) │
│                                                              │
│  Example:                                                    │
│    Seed: $100                                                │
│    Buy-in: $10                                               │
│    Participants: 5                                           │
│    Protocol fee: 10%                                         │
│                                                              │
│    Gross Pool: $100 + (5 × $10) = $150                      │
│    Net Pool (after 10% fee): $135                           │
│                                                              │
│  Payout Structure:                                           │
│    1st place: 70% = $94.50                                  │
│    2nd place: 30% = $40.50                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Related Repositories

| Repository | Description | Communication |
|------------|-------------|---------------|
| [cucumber-cerebellum](https://github.com/h-sharafzad91/cucumber-cerebellum) | Backend API | REST (same as web) |
| [cucumber-web](https://github.com/h-sharafzad91/cucumber-web) | User frontend | (separate deployment) |
| [cucumber-cortex](https://github.com/h-sharafzad91/cucumber-cortex) | AI agent | (no direct communication) |

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Radix UI** (components)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Cerebellum API URL | Required |

## Admin Operations Quick Reference

| Operation | Endpoint | Effect |
|-----------|----------|--------|
| Create Arena | `POST /v1/rounds` | Creates new round with settings |
| Start Round | `POST /v1/rounds/:id/start` | Starts all agent tick timers |
| Pause Round | `POST /v1/arena/:id/pause` | Pauses tick scheduler |
| Resume Round | `POST /v1/arena/:id/resume` | Resumes tick scheduler |
| Stop Round | `POST /v1/rounds/:id/stop` | Ends round, stops all timers |
| Settle Round | `POST /v1/rounds/:id/settle` | Calculates winners, creates payouts |

## Railway Deployment

### 1. Connect Repository
1. Go to [Railway](https://railway.app) and open your Cucumber project
2. Click "New Service" → "GitHub Repo"
3. Select `h-sharafzad91/cucumber-admin`

### 2. Configure Environment Variables
In Railway dashboard, add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://cucumber-cerebellum-production.up.railway.app` | Your Cerebellum Railway URL |

### 3. Build Settings
Railway auto-detects Next.js. Verify these settings:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Watch Paths**: Leave default

### 4. Domain Setup
Admin should be deployed on a separate domain from the public frontend:

| Option | Domain Example | Security |
|--------|----------------|----------|
| Railway subdomain | `cucumber-admin-production.up.railway.app` | Basic |
| Custom subdomain | `admin.cucumber.trade` | Recommended |
| Private (no public domain) | VPN access only | Most secure |

**Recommended:** Use a non-obvious domain name for admin panel.

### 5. Access Control (Production)
For production deployments, implement access control:

```
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN ACCESS OPTIONS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Option 1: IP Whitelisting                                  │
│  └─► Configure Railway to only accept connections from      │
│      specific IP addresses (use Cloudflare Access)          │
│                                                              │
│  Option 2: VPN-Only Access                                  │
│  └─► Don't assign public domain                             │
│  └─► Access via Railway private networking + VPN            │
│                                                              │
│  Option 3: Password Protection (MVP)                        │
│  └─► Add environment variable ADMIN_PASSWORD                │
│  └─► Implement basic auth middleware                        │
│                                                              │
│  Option 4: Wallet Signature (Production)                    │
│  └─► Require admin wallet to sign message                   │
│  └─► Verify signature before granting access                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Railway Architecture (Admin Position)
```
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY PROJECT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  cucumber-web   │    │ ★ cucumber-    │                │
│  │   (Next.js)     │    │    admin ★     │                │
│  │  Public Domain  │    │   (Next.js)     │                │
│  │                 │    │  Admin Domain   │                │
│  │  app.cucumber.  │    │  (Restricted)   │                │
│  │    trade        │    │                 │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      ▼                                       │
│           ┌─────────────────┐                               │
│           │cucumber-cerebellum│                              │
│           │   (Node.js)     │                               │
│           │  Public Domain  │                               │
│           └────────┬────────┘                               │
│                    │                                         │
│        ┌───────────┼───────────┐                            │
│        ▼           ▼           ▼                            │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────┐             │
│  │PostgreSQL│ │  Redis   │ │ cucumber-cortex │             │
│  │ (Plugin) │ │ (Plugin) │ │   (Python)      │             │
│  └──────────┘ └──────────┘ └─────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Order
Deploy Admin LAST after all other services are running:
1. PostgreSQL plugin
2. Redis plugin
3. cucumber-cerebellum
4. cucumber-cortex
5. cucumber-web
6. cucumber-admin ← This service (last)

### Security Checklist
Before going live with admin panel:
- [ ] Use non-obvious domain name
- [ ] Implement access control (IP/VPN/password)
- [ ] Enable HTTPS only
- [ ] Set up monitoring/alerting for admin actions
- [ ] Consider audit logging for sensitive operations
