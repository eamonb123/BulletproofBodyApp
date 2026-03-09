# Bulletproof Body — Company Vision

> Source of truth for the `/ask-company` skill.
> Last updated: 2026-03-09

---

## What We Are (One Sentence)

Bulletproof Body is a concierge nutrition platform that optimizes everything you already eat — snacks, groceries, takeout, restaurants — and delivers it to your door so you lose fat without changing your life.

## The Elevator Pitch (Two Sentences)

We take everything you already eat, find where the hidden calories are, and swap them for smarter versions that taste the same — then deliver it all to your door with one click. You get a free personalized tool that shows you exactly where the fat is hiding, and a coaching experience that does the rest for you.

## Business Model Analogies

| Analogy | How It Maps |
|---------|-------------|
| **Spotify for Food** | Curated, personalized nutrition. We build the playlist (your meals). You just press play (eat). |
| **Concierge Doctor, but for Nutrition** | Premium always-on access. Text your question, get an answer. No appointments, no waiting rooms. |
| **A Nutritionist Inside Your Grocery Cart** | We live in your DoorDash, your Instacart, your snack drawer. Every order is optimized before you place it. |
| **Tesla Autopilot for Fat Loss** | The system drives. You supervise. It gets smarter the more you use it. |

## The Funnel

```
Free Software Tool (lead magnet / trust builder)
        ↓
    VSL (education + concierge wellness frame)
        ↓
    Strategy Call (qualify + close)
        ↓
Gold ($7k / 12-week sprint)  OR  Silver ($500/mo x 12 months)
```

The app is **free**. It's the entry point — a trust builder that proves the methodology works before anyone pays a dime. Revenue comes from coaching, not software.

## Coaching Tiers

### Gold — Concierge Sprint ($7,000 / 12 weeks)
- Eamon personally builds and manages your food ecosystem
- Weekly 1:1 coaching calls
- Unlimited text access (async, on-demand)
- Equipment shipped (scale, tracker)
- Personalized client dashboard in the app
- Fastest path to results

### Silver — 12-Month Container ($500/mo x 12 months)
- Same system and methodology as Gold
- Community replaces 1:1 (Slack community, group calls)
- Mon 5pm / Wed 5pm / Fri noon group call schedule
- Community coaching and support
- Self-paced with guided accountability

**Coaching delivery lives in EPM (EamonianProgramMaster)**, not this app. The app is the free tool and lead magnet. EPM handles client management, check-ins, and coaching operations.

## Revenue Model

| Stream | Description |
|--------|-------------|
| **Gold Coaching** | $7,000 per 12-week concierge sprint |
| **Silver Coaching** | $500/mo x 12 months community container |
| **Affiliate Revenue (Future)** | 3-15% commission on Instacart orders, 1-4% on Walmart |

## What Makes This Different

1. **We don't give you a meal plan.** We optimize YOUR meals — the ones you already eat and love.
2. **We don't remove anything.** We swap. Same craving, fewer calories, more protein.
3. **We deliver it to your door.** One click. No grocery store trips. No meal prep.
4. **The system gets smarter.** Every swap you accept, every meal you log, the ecosystem learns your preferences.
5. **No calls required.** The software does the heavy lifting. Coaching is async and on-demand.
6. **Built for busy professionals.** 2 minutes to place an order, not 2 hours to meal prep.

## The Customer Journey

```
1. DISCOVER (Free Tool)
   - Use the free Bulletproof Body app
   - Pick meals you already eat → see where the fat is hiding
   - Get personalized swap recommendations + fat loss projections
   - Experience the methodology firsthand — no commitment
   → Output: Trust. Proof the system works. VSL link.

2. EDUCATE (VSL)
   - Watch the VSL (concierge wellness frame)
   - Understand why diets fail and why this is different
   - See what the full coaching experience looks like
   → Output: Book a strategy call

3. COMMIT (Strategy Call → Gold or Silver)
   - Strategy call to qualify and close
   - Gold: 12-week sprint, Eamon builds everything
   - Silver: 12-month container, community-driven
   → Output: Client onboarded into EPM

4. ONBOARD (Week 1-2, inside EPM)
   - Photo everything you eat (no changes)
   - Log why you eat it (convenience? craving? love?)
   - Daily weigh-ins (just data, no judgment)
   → Output: Your maintenance calories + leak/gem map

5. BUILD ECOSYSTEM (Week 3)
   - Eamon/system builds your personalized food ecosystem
   - Every snack, every restaurant, every grocery staple — mapped and optimized
   - Side-by-side visual comparisons for every swap
   - You choose which swaps to accept (toggle on/off)
   → Output: Your personalized ecosystem

6. ACTIVATE (Week 4+)
   - One-click ordering for groceries and snacks (Instacart/Walmart)
   - Pre-logged meals in Trainerize app (tap to log)
   - Daily target: eat what you want, stop at your number
   - Weekly check-ins track progress
   → Output: 1 lb fat loss per week, sustainably

7. REFINE (Ongoing)
   - New restaurants? We add them.
   - New cravings? We find swaps.
   - Life changes? We adjust.
   - The ecosystem evolves with you.
```

## Core Philosophy

- **No judgment.** Your current eating is not wrong. It's just unconscious.
- **Honor what they love.** If they love spice, the swap is spicy. If they love crunch, it crunches.
- **Convenience over willpower.** We optimize where they already eat. We don't suggest meal prep.
- **Data over feelings.** RMR is math. 3,500 cal = 1 lb. The scale is data.
- **The deficit is found, not forced.** 500 cal/day from what you already eat.
- **Built by them, for them.** Every client's ecosystem is unique.

## Current Implementation State

### Built and Working
- Fast Food Bible (Chipotle, CAVA, Panda Express — 137 verified ingredients)
- Snack Bible with personalization (client profiles, frequency toggles, cumulative impact)
- Lead Magnet gamified experience (pick meal → see swap → projection graph)
- One-click shopping links (Instacart search, Walmart)
- VSL script v1 complete
- MCP server for data operations

### Needs to Ship (Deploy Live)
- Domain + hosting configured on Render
- Email delivery (Resend API) for lead capture
- VSL link working and accessible from the app
- One lead magnet flow picked and polished end-to-end

### In Progress
- Grocery Store Bible (framing/spec done, no data yet)
- Grocery Order Optimizer (framing done)
- Restaurant Bible / Wild West engine (spec done, no live parser yet)

### Future / Not Started
- Instacart Developer Platform integration (shoppable lists API)
- Trainerize sync for pre-logged custom meals
- Client dashboard (personalized web page per Gold client — only when needed)
- Mobile app wrapper

## The Software Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS + Framer Motion
- **Database:** SQLite (local) / PostgreSQL (production)
- **Food Data:** 137+ verified ingredients, 30+ template meals, 3 restaurants
- **Ordering:** Instacart (search deep links now, API later), Walmart affiliate
- **Email:** Resend API (planned)
- **Hosting:** Render
- **Coaching Integration:** EPM (EamonianProgramMaster) for all client delivery
- **Community:** Slack (already exists)
- **Weekly Check-in Form:** Already exists in EPM

## Key Files for Context

| File | What It Contains |
|------|-----------------|
| `MISSION.md` | Full philosophy, VSL transcript, Phase 1/2 methodology |
| `PRODUCT_MODEL.md` | UX principles, interaction contract, guardrails |
| `SPEC.md` | Technical product spec (database schema, API routes) |
| `HANDOFF.md` | Current session state, what's built, what's next |
| `RESTAURANT_BIBLE_SYSTEM.md` | 10:1 rule, oil buffers, waiter-ready scripts |
| `GROCERY_STORE_BIBLE.md` | Grocery vector architecture |
| `VSL_SCRIPT_CURRENT.md` | Current VSL video script |
| `PLANNING.md` | Full planning document |
