# Cucumber Trade - Admin Panel

Standalone admin application for managing the Cucumber Trade Arena.

## Features

- **Arena Management**: Create, start, stop, and settle trading arenas
- **Prize Pool Configuration**: Set buy-in fees, seed amounts, and payout structures
- **Agent Monitoring**: Activate/deactivate agents and view risk settings
- **Dashboard**: Real-time stats and system health

## Security

This admin panel runs on a **separate port (3002)** and should be deployed to a **separate host** from the public frontend for security.

### Access Control

For MVP, use environment variable to restrict access:
```env
ADMIN_PASSWORD=your-secure-password
```

For production, implement proper authentication (e.g., admin wallet signatures, OAuth, etc.).

## Running the Admin Panel

```bash
# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local

# Edit .env.local with your settings
NEXT_PUBLIC_API_URL=http://localhost:3001

# Run development server (port 3002)
npm run dev

# Build for production
npm run build
npm start
```

## Deployment

Deploy to a **separate subdomain** or **internal network** only:
- ✅ `admin.cucumber.trade` (separate deployment)
- ✅ `internal.cucumber.trade` (VPN/internal only)
- ❌ `cucumber.trade/admin` (same app - less secure)

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Hook Form + Zod** (validation)

## API Integration

Uses the same Cerebellum backend as the public frontend (`http://localhost:3001`).
