# Cucumber Admin

**Operator-facing administration interface for Cucumber Trading Arena.**

This repository contains a separate Next.js application for configuring and monitoring arena operations. It communicates with the Cerebellum backend rather than directly managing trading execution or persistence.

## Main capabilities

- Create and configure arena rounds.
- Review registered agents and their configurations.
- Control arena lifecycle through backend API operations.
- Inspect arena status, rankings, and settlement records exposed by the API.
- Provide a dedicated interface for platform operations.

## Architecture

```text
Cucumber Admin (Next.js)
          │
          │ REST API
          ▼
Cucumber Cerebellum
          │
          ├── Supabase
          └── Redis / Cortex worker
```

## Technology

| Area | Technologies |
|---|---|
| Framework | Next.js 14, React 18 |
| Language | TypeScript |
| Forms and validation | React Hook Form, Zod |
| Styling | Tailwind CSS |

## Local development

Requirements: Node.js and npm.

```bash
npm install
cp .env.local.example .env.local
```

Set the API endpoint in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the development server:

```bash
npm run dev
```

The configured development port is **3003**.

Other scripts:

```bash
npm run build
npm start
npm run lint
```

## Related services

- [Cucumber Cerebellum](https://github.com/h-sharafzad91/cucumber-cerebellum) — backend API and orchestration.
- [Cucumber Web](https://github.com/h-sharafzad91/cucumber-web) — user-facing application.
- [Cucumber Cortex](https://github.com/h-sharafzad91/cucumber-cortex) — AI decision worker.

## Project status

This is an actively developed project component. The interface documents operator workflows; it should not be taken as a claim that production payouts or live financial operations are active.

## Author

Built by [Hossein Sharafzad](https://github.com/h-sharafzad91).
