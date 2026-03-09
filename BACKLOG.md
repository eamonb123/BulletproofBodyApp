# Bulletproof Body — Product Backlog

> **Updated:** 2026-03-09
> **Priority system:** P0 (this week) → P1 (next 2 weeks) → P2 (this month) → P3 (future)
> **Rule:** Ideas come in raw. This file extracts what matters and ranks it.
> **Model:** The app is FREE. Revenue comes from coaching (Gold $7k/12wk, Silver $500/mo x 12). No subscriptions, no Stripe, no paid features.

---

## Active Sprint (This Week)

### P0 — Must Do Now (Deploy Live)

| # | Task | Why It's P0 | Source | Status |
|---|------|-------------|--------|--------|
| 1 | **Deploy live** (domain, Render hosting, production DB) | Nothing matters if no one can use it. The tool needs to be live and accessible. | Deploy priority 3/9 | TODO |
| 2 | **Email delivery (Resend API)** | Leads save but emails don't send. Blocks lead capture → nurture → VSL. | HANDOFF.md (carried) | TODO |
| 3 | **VSL link working and accessible from app** | The free tool must funnel to the VSL. If the link is broken or missing, the funnel is broken. | Funnel correction 3/9 | TODO |
| 4 | **Pick and polish ONE lead magnet flow** | Three flows exist (Fast Food, Snack, general). Pick the strongest one and make it bulletproof end-to-end. Ship one thing well. | Funnel correction 3/9 | TODO |

### P1 — High Priority (Next 2 Weeks)

| # | Task | Why It's P1 | Source | Status |
|---|------|-------------|--------|--------|
| 5 | **VSL re-script for concierge wellness frame** | Current VSL v1 needs to educate on the concierge experience BEFORE the strategy call. Reframe around "we do it for you." | Offer Spec 3/9 | TODO |
| 6 | **Connect VSL CTA to real booking link** | VSL must end with a working strategy call booking link (Calendly or equivalent). Without this, the funnel dead-ends. | Funnel correction 3/9 | TODO |
| 7 | **Testimonial lens shift** | All organic marketing should reflect the concierge experience, not just transformation numbers. Update extraction criteria. | Offer Spec 3/9 | TODO |

### P2 — This Month

| # | Task | Why It's P2 | Source | Status |
|---|------|-------------|--------|--------|
| 8 | **Trainerize sync for pre-logged meals** | Once swaps are approved, create custom meals in Trainerize. One-click logging. | MISSION.md (core promise) | TODO |
| 9 | **Instacart Developer Platform application** | Move from search links to real shoppable lists API. ~3 weeks to production access. | MISSION.md | TODO |
| 10 | **Restaurant Bible live parser** | Cool enhancement but not blocking the funnel | HANDOFF.md | TODO |

### P3 — Future / Parked

| # | Task | Why P3 | Source | Status |
|---|------|--------|--------|--------|
| 11 | Client dashboard (`/client/[id]`) | Only needed when Gold clients need a personalized web page. Coaching delivery lives in EPM. | PERSONAL_SWAP_DASHBOARD.md | PARKED |
| 12 | Weekly check-in form | Already exists in EPM. No need to rebuild. | Offer Spec 3/9 | PARKED |
| 13 | Equipment sync (fitness tracker + scale) | Nice differentiator for Gold but not blocking anything now | Offer Spec 3/9 | PARKED |
| 14 | Community platform | Community already exists in Slack. No need to build or integrate another platform. | Offer Spec 3/9 | PARKED |
| 15 | Grocery Order Optimizer (full cart) | Needs Instacart API first | MISSION.md | PARKED |
| 16 | Progress tracking / weekly dashboard | Important but needs client dashboard first | MISSION.md | PARKED |
| 17 | Mobile app wrapper | Web-first is fine for now | - | PARKED |
| 18 | Time-vs-Money Calculator | Objection handler, not core product | MISSION.md | PARKED |

---

## Idea Inbox

Raw ideas land here. Each gets analyzed, mapped to a task above (or creates a new one), and prioritized.

### 2026-03-09 — Business Model Correction

**Source:** Eamon clarification 2026-03-09

**Key corrections:**

1. **The app is FREE.** No $10/mo tier. No paid features. No Stripe. The software is a trust builder and lead magnet, not a revenue source.

2. **Corrected funnel:** Free Software Tool → VSL → Strategy Call → Gold ($7k/12wk) or Silver ($500/mo x 12)
   - Impact: Removed "Map free vs paid features" (everything is free)
   - Impact: Removed subscription/payment integration (no Stripe needed)
   - Impact: P0 is now about deploying live, not feature gating

3. **Coaching delivery lives in EPM (EamonianProgramMaster)**, not this app
   - Impact: Client dashboard moved to P3 (only when Gold clients need it)
   - Impact: Weekly form moved to P3 (already exists in EPM)

4. **Community already exists in Slack.** No need to build or integrate another platform.
   - Impact: Community platform moved to P3

5. **Deploy live is THE priority.** Domain, email, VSL link, one polished lead magnet flow.

### 2026-03-09 — Offer Structure Spec (Superseded)

**Source:** `BulletproofBusinessOS/docs/plans/2026-03-09-offer-structure-spec.md`

**Note:** The offer spec originally included a $10/mo tier and Stripe integration. These have been corrected per Eamon's clarification above. The Gold/Silver tiers and concierge wellness framing remain accurate.

**Retained extractions:**

1. **Gold = concierge sprint (12 weeks, $7k):** Eamon builds everything, weekly 1:1s, unlimited texts, equipment shipped
   - Impact: This is the premium offer. Delivery is in EPM.

2. **Silver = 12-month container ($500/mo x 12):** Same system, community (Slack) replaces 1:1
   - Impact: Group call scheduling (Mon 5pm / Wed 5pm / Fri noon) — operations, not code

3. **Marketing insight:** People buy quick fix, stay for community
   - Impact: Lead magnet should emphasize speed/ease, not community

4. **VSL needs concierge wellness frame** (P1)

---

## Priority Logic

**How tasks get ranked:**

1. **P0 = Deploy live + funnel works end-to-end.** If someone can't use the free tool and reach the VSL, nothing else matters.
2. **P1 = Improve the funnel.** Better VSL, working booking link, better marketing lens.
3. **P2 = Enhance the product experience.** Important but not blocking lead flow.
4. **P3 = Future vision.** Park it. Don't think about it until P0-P2 are done.

**The question for every new idea:** "Does this help us get the free tool live and funnel people to a strategy call?"
- Yes → P0 or P1
- Kinda → P2
- Not yet → P3

---

## Completed

| Task | Completed | Notes |
|------|-----------|-------|
| Lead Magnet (gamified swap experience) | 2026-03-08 | 3 restaurants, working flow |
| Fast Food Bible (search reference) | 2026-03-08 | 50 restaurants, 1,684 ingredients |
| Snack Bible (personalization) | 2026-03-08 | 44 items, 22 swaps, client profiles |
| One-click shopping links | 2026-03-08 | Instacart search + Walmart |
| VSL script v1 | 2026-03-08 | Full script written |
| MCP server | 2026-03-07 | bulletproof-body tools |
