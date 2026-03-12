# Gold/Silver Alignment Audit

> Marketing promises vs actual delivery. Does the backend match the frontend?
> Source: Session 10 (2026-03-09)
> Cross-references: AWARENESS_LADDER.md, COMPANY_VISION.md, offer-structure-spec, EPM agreements

---

## What the Funnel PROMISES

Based on the awareness ladder (bible → concierge/VSL → strategy call):

| Promise | Where It's Made |
|---------|-----------------|
| 1. "We optimize YOUR food, not give you a meal plan" | Bible swaps, VSL, Concierge, MISSION.md |
| 2. "Same craving, fewer calories" (swap, not remove) | Bible swap cards, VSL myth-busting |
| 3. "I build your ecosystem for you" (Gold) | Concierge page, VSL, offer-structure-spec |
| 4. "Delivery to your door, one-click ordering" | MISSION.md grocery layer, Concierge page |
| 5. "Equipment shipped (scale, tracker)" | COMPANY_VISION.md, offer-structure-spec |
| 6. "Weekly 1:1 calls" | COMPANY_VISION.md, offer-structure-spec |
| 7. "Unlimited text access" | COMPANY_VISION.md, offer-structure-spec |
| 8. "1 lb fat loss per week, sustainably" | VSL, projections in bible |
| 9. "Community 3x/week calls" (both tiers) | COMPANY_VISION.md, offer-structure-spec |
| 10. "Personalized client dashboard in the app" | COMPANY_VISION.md |
| 11. "$10/mo paid tool tier" | offer-structure-spec |

---

## Audit Results

### ALIGNED (Delivery matches promise)

| # | Promise | EPM Delivery | Status |
|---|---------|-------------|--------|
| 1 | Optimize YOUR food | Phase 1 = photo everything, find leaks/gems. Phase 2 = build swap ecosystem from THEIR data | ALIGNED |
| 2 | Swap, not remove | Integrity Rule in MISSION.md. Swap must match craving profile. | ALIGNED |
| 3 | "I build it for you" (Gold) | Gold: Eamon personally builds Trainerize meals, reviews data, sets weekly objectives | ALIGNED |
| 5 | Equipment shipped | Gold agreement: smart scale, food scale, portable travel scale shipped to door | ALIGNED |
| 8 | 1 lb/week fat loss | Phase 2 targets 500 cal/day deficit = 1 lb/week. Math-based, not arbitrary. | ALIGNED |
| 9 | 3x/week group calls | Both tiers get mastermind calls. Silver: Mon/Wed/Fri. Gold: same calls + 1:1. | ALIGNED |

### MISALIGNED (Promise doesn't match delivery)

#### Issue 1: "Weekly 1:1 calls" vs Biweekly

| Marketing Says | EPM Says |
|----------------|----------|
| "Weekly 1:1 coaching calls" (COMPANY_VISION.md) | "Every 2 weeks, 30 min" (gold-vs-silver.md) |
| "Weekly 1:1 calls (15 min, earlier in the day)" (offer-structure-spec) | "Biweekly 1:1 coaching calls (30 minutes)" (gold-continued-agreement) |

**Verdict: MISALIGNED.** The offer-structure-spec says weekly. The actual agreements say biweekly. The concierge page and VSL may also say "weekly." Pick one and make it consistent.

**Recommendation:** If delivery is biweekly, change marketing to "biweekly." If you want weekly, update the agreements. Don't promise weekly and deliver biweekly.

---

#### Issue 2: "Unlimited text access" — channel mismatch

| Marketing Says | EPM Says |
|----------------|----------|
| "Unlimited text access with me (weekdays)" (offer-structure-spec) | "Unlimited daily messaging with Eamon (iMessage)" (gold-continued-agreement) |
| "Unlimited text access (async, on-demand)" (COMPANY_VISION.md) | "Unlimited Trainerize, same-day response" (gold-vs-silver.md) |

**Verdict: MINOR MISALIGNMENT.** Channel is inconsistent (iMessage vs Trainerize). The promise is the same (unlimited, same-day response), but the delivery channel varies by document.

**Recommendation:** Standardize. If iMessage is the actual channel, say iMessage. If Trainerize, say Trainerize. Clients care about response time, not channel name, but internally this should be consistent.

---

#### Issue 3: "Delivery to your door, one-click ordering" — NOT BUILT

| Marketing Says | EPM Says |
|----------------|----------|
| "Deliver it all to your door with one click" (COMPANY_VISION.md elevator pitch) | Not mentioned in any agreement |
| "One-click ordering for groceries and snacks (Instacart/Walmart)" (COMPANY_VISION.md customer journey step 6) | Not a current service |

**Verdict: MISALIGNED (FUTURE).** This is described as a current capability in COMPANY_VISION.md but it's a future feature. Instacart search links exist in the app but there's no API integration, no shoppable lists, no actual delivery orchestration.

**Recommendation:** Remove "deliver it to your door" from marketing until the Instacart Developer Platform integration is live. Keep "one-click shopping links" (which DO exist as search deep links). Don't promise delivery orchestration you can't fulfill.

---

#### Issue 4: "Personalized client dashboard in the app" — NOT BUILT

| Marketing Says | EPM Says |
|----------------|----------|
| "Personalized client dashboard in the app" (COMPANY_VISION.md Gold tier) | Google Sheet Program Tracker (manual) + Trainerize (app) |

**Verdict: MISALIGNED (FUTURE).** The "personalized web page per client" described in MISSION.md ("Here is every single thing you've consumed in every situation of your life") does not exist yet. The current client experience is Google Sheet + Trainerize, not a custom web dashboard.

**Recommendation:** Remove from Gold tier marketing until built. The Google Sheet + Trainerize combo IS the current dashboard. Don't call it an "app dashboard" if it's a spreadsheet.

---

#### Issue 5: "$10/mo paid tool tier" — contradicts "free software"

| offer-structure-spec Says | COMPANY_VISION.md Says |
|---------------------------|----------------------|
| "Paid Tool (~$10/month) — Paid features (same tools my clients get)" | "The app is free. It's the entry point — a trust builder." |
| "FREE TOOL → PAID TOOL ($10/mo) → CONSULTATION CALL → GOLD or SILVER" | "Killed $10/mo tier — software is FREE" (Session 9 HANDOFF) |

**Verdict: CONTRADICTORY.** Session 9 explicitly killed the $10/mo tier. COMPANY_VISION.md reflects this ("software is free"). But the offer-structure-spec (same date, morning download) still includes it. These two docs disagree.

**Recommendation:** The offer-structure-spec needs updating. The $10/mo tier was killed in Session 9. The funnel is: Free Tool → VSL → Strategy Call → Gold/Silver. No paid software tier.

---

#### Issue 6: Call schedule inconsistency

| Source | Schedule |
|--------|----------|
| COMPANY_VISION.md | "Mon 5pm / Wed 5pm / Fri noon" |
| offer-structure-spec | "Mon 5pm / Wed 5pm / Fri noon" |
| TIER_BOUNDARY.md | "Monday AM, Monday PM, Thursday PM" |
| Silver Client Expectation Agreement | "Monday, Wednesday, Friday" |

**Verdict: MINOR MISALIGNMENT.** TIER_BOUNDARY.md has a different schedule (Mon/Thu) than everything else (Mon/Wed/Fri). This may reflect an older schedule that was updated.

**Recommendation:** Update TIER_BOUNDARY.md to Mon/Wed/Fri to match all other docs.

---

### NOT IN MARKETING BUT SHOULD BE

These are powerful delivery elements that the funnel doesn't mention:

| EPM Delivery Element | Why It Matters to Joel |
|---------------------|----------------------|
| **Saboteur Assessment** | Joel's analytical brain would love knowing his specific patterns |
| **Phase system (0 → 3)** | Structure appeals to engineers — "here's the roadmap" |
| **"We" language** | The partnership feel — not "do this" but "we're doing this together" |
| **Nightly Reflection** | Daily accountability ritual (Gold) |
| **Form check Looms** | Personalized video feedback on training form |
| **Community leadership path** | Gold graduates become Silver leaders — status, recognition |

These could strengthen the concierge page and VSL without overpromising.

---

## Summary: What Was Fixed (2026-03-09)

| Issue | Resolution |
|-------|------------|
| Weekly vs biweekly 1:1 calls | **FIXED: Weekly.** Updated gold-continued-agreement, gold-vs-silver, TIER_BOUNDARY, COMPANY_VISION |
| $10/mo tier in offer-structure-spec | **FIXED: Removed.** Value ladder is now Free Tool → VSL → Call → Gold/Silver |
| "Delivery to your door" language | **FIXED: Reframed.** "You order it to your door" (one-click links), not "we deliver it" |
| Personalized app dashboard | **KEPT.** Being actively built. Stays in Gold tier. |
| Call schedule inconsistency | **FIXED: Mon/Wed/Fri everywhere.** TIER_BOUNDARY updated from Mon/Thu |
| Messaging channel | **FIXED: Slack everywhere.** Replaces iMessage/Trainerize. Integrates with client work environment. |
| Sales call offer undefined | **FIXED: Created SALES_CALL_OFFER.md** with exact Gold/Silver presentation |

---

## The Big Picture

**The funnel is STRONG.** The awareness ladder progression (curiosity → proof → scale → trust → commit) is clean. The methodology (Phase 1 find maintenance, Phase 2 build ecosystem) is exactly what we promise.

**The gaps are operational, not philosophical.** The core promise — "we optimize your food, not replace it" — is 100% aligned between marketing and delivery. The misalignments are in specific deliverables (call frequency, app features, delivery logistics) that either haven't been built yet or have been updated without syncing all docs.

**One sentence:** The vision is right. The docs need a sync pass.
