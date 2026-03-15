# Bulletproof Body App

## What This Is

Interactive takeout food swap tool / lead magnet for Bulletproof Body coaching business.

Users pick DoorDash/UberEats meals they normally order, see healthier swap options from the SAME restaurants, and get a personalized fat loss projection based on their body (RMR calc). Value first, email capture second.

## Key Files

- `SPEC.md` — Full product spec (UX flow, database schema, architecture, priorities)
- `src/` — Application source code
- `data/` — Food database seed files

## Semantic Search & Embeddings

All food items in `bulletproof_body.db` are embedded into ChromaDB at `chroma_db/` for semantic search. The Food Ecosystem Dashboard uses this to find relevant swap suggestions when building a client's food plan.

**After inserting ANY new food items** (snacks, meals, restaurants, grocery items), re-run:
```bash
python3 scripts/embed_foods.py
```

This is idempotent (uses upsert). Takes ~10 seconds. Currently 1,222 items embedded.

**Key files:**
- `scripts/embed_foods.py` — Embedding script (full re-embed + single item function)
- `scripts/food_search.py` — Semantic search module
- `chroma_db/` — ChromaDB persistent storage
- `/api/ecosystem/extract` — Uses semantic search for swap suggestions
- `/api/ecosystem/semantic-search` — Direct semantic search endpoint

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

## Session Continuity

**Always read `HANDOFF.md` at the start of every session.** It contains:
- What was built last session
- What's NOT finished (pick up here)
- Key architecture decisions
- Current database schema

If `HANDOFF.md` exists, read it before doing anything else.

## Origin

Morning Download 2026-03-06. The "STOP MEAL PREPPING" reel (802 views) validated the message. This tool converts that attention into leads.
