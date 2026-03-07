# Bulletproof Body App

## What This Is

Interactive takeout food swap tool / lead magnet for Bulletproof Body coaching business.

Users pick DoorDash/UberEats meals they normally order, see healthier swap options from the SAME restaurants, and get a personalized fat loss projection based on their body (RMR calc). Value first, email capture second.

## Key Files

- `SPEC.md` — Full product spec (UX flow, database schema, architecture, priorities)
- `src/` — Application source code
- `data/` — Food database seed files

## Tech Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS + Framer Motion
- **Database:** PostgreSQL (Render) or SQLite (local dev)
- **Email:** Resend API
- **Hosting:** Render (auto-deploy from GitHub)
- **Analytics:** Built-in funnel_events table

## Quick Start

```bash
npm install
npm run dev        # Local dev server
npm run seed       # Seed food database
npm run deploy     # Push to production
```

## Design Principles

1. Mobile-first (Instagram bio → phone)
2. Value before capture (<10s to first insight)
3. Apple aesthetic (white space, clean type, smooth animations)
4. Data-driven (real RMR math, not generic advice)
5. Worst-case planning (sedentary assumption)

## Origin

Morning Download 2026-03-06. The "STOP MEAL PREPPING" reel (802 views) validated the message. This tool converts that attention into leads.
