# Morning Download Spec — 2026-03-10

> Source: Eamon's stream of consciousness, 2026-03-10 morning download
> Purpose: Implementation-ready spec for agents

---

## Current State (as of Session 10)

### What Exists

The BulletproofBodyApp is a Next.js application with multiple modules:

| Route | Status | Description |
|-------|--------|-------------|
| `/experiments/dark-landing` | Built | Gamified lead magnet — restaurant picker, step-by-step builder, swap reveal, projection graph, email capture, crossroads screen |
| `/bible` | Built | Fast Food Bible — hero marquee, progressive gate, search-first reference |
| `/snack-bible` | Built | Side-by-side snack swaps, personalization profiles, sticky cumulative bar, shopping links |
| `/concierge` | Built | Full marketing sales page (modeled after Know Your Physio) |
| `/grocery-bible` | Stub | Home-food baseline framing |
| `/grocery-order-optimizer` | Stub | Cart-level replacement engine framing |
| `/restaurant-bible` | Stub | Wild-west menu analysis spec |

### Restaurant Data in DB

- **Chipotle** — 29 ingredients, build-your-own flow, 9 sprites
- **CAVA** — 45 ingredients, 7 originals + 7 swaps, 15 sprites
- **Panda Express** — 63 ingredients, template-meal flow (Bowl/Plate/Bigger Plate), 5 originals + 5 swaps

### Architecture

- Next.js App Router + Tailwind + Framer Motion
- SQLite database (`bulletproof_body.db`)
- Two-tier meal source: Eamon-approved (`source: 'eamon'`) > LLM-generated (`source: 'llm'`)
- Generic container system (`restaurant_containers` table)
- Flow routing: `build_your_own: true` (Chipotle) vs template-meal picker (Panda)
- Domain purchased: `bulletproofbody.ai` (DNS not yet configured)
- Not yet deployed to Render

---

## Core Reframe: Tool as Conversation Starter

This is the single most important insight from today's download. It reframes the entire product strategy.

**Old mindset:** Build a perfect product in private, then launch.

**New mindset:** Ship an MVP that gives Eamon a reason to have 5 new conversations per day. The tool gets better THROUGH the conversations, not before them.

> "I have a tendency to over-engineer in private. I miss out on the best part of the experience, which is the connection with other people."

> "This is like a tool to get me to have more conversations with people, connect with them, give them more value, and connect with my audience."

### The Conversation Loop

1. Eamon identifies the prospect's challenge: "When it comes to losing fat, what's the biggest challenge? Meal prep? Late-night snacking?"
2. Route based on answer:
   - **Late-night snacking** -> Snack Bible
   - **Meal prep / eating out** -> Takeout Guide
   - **Something else** -> Valuable feedback (potential third product)
3. Send the link
4. Talk through it together (close friends) or let them explore (strangers)
5. Their feedback improves the tool

### Daily Target

**5 new feedback users per day.** Every day.

- Close friends: "Yo can I send you this link? Cool. Can you just go through it with me? What do you think?"
- Strangers/prospects: Send the link, start a conversation about food

### What This Means for Engineering

- The tool does NOT need to be perfect. It needs to be good enough to start a conversation.
- Ship speed matters more than feature completeness.
- Every conversation is product research.
- The MVP bar is: can Eamon send this link and not be embarrassed?

---

## Two Products

The app serves two distinct problems with two distinct tools:

### 1. Snack Bible

**Problem it solves:** Late-night snacking

**Core concept:** One-to-one swap — healthy version of your favorite snacks

**Key differentiators:**
- NOT Instagram recipes that take time to prep
- Already packaged, ready-to-go, ready-to-eat products
- Promise: lower calorie, higher protein, more food, more filling, helps you lose fat
- Main value prop: calorie savings shown clearly
- "This isn't some stupid [generic resource]"

**MVP flow:**
1. Populate with before (original snack) and after (swap)
2. Populate with images for both
3. Full flow with one snack showing calorie projections
4. Guide user to do another snack, then another
5. VSL accessible at any time during the flow

**Current state:** `/snack-bible` exists with personalization profiles, cumulative impact bar, and shopping links. Needs the conversation-starter framing and VSL integration.

### 2. Takeout Guide

**Problem it solves:** Meal prep avoidance / eating out

**Core concept:** Restaurant-specific ordering guides that mirror how people actually order at each place

**Current state:** `/experiments/dark-landing` and `/bible` exist. Needs UX pattern diversification per restaurant type (see below).

---

## Takeout Guide: Restaurant UX Patterns

This is the major new architectural insight. Different restaurants have fundamentally different ordering experiences. The UX should mirror how people NATURALLY order at each place.

### Pattern 1: Build-Your-Own (Chipotle, CAVA, Subway)

**How people order:** Go "down the line" building what they want, step by step.

> "Going down the line building what it is you want."

**UX:** Card-by-card / step-by-step builder (this is what currently exists for Chipotle)

**Examples:**
- Chipotle: burrito/bowl/tacos -> rice -> beans -> protein -> toppings
- CAVA: bowl / half-and-half bowl / salad / pita -> base -> protein -> toppings
- Subway: footlong vs half -> bread type -> protein -> toppings

**Implementation status:** This pattern is BUILT. The current `build_your_own: true` flow in `dark-landing` handles this.

### Pattern 2: Traditional Fast Food (McDonald's, Burger King, Wendy's)

**How people order:** They don't think about combo numbers. They think about what they WANT. "I want a Big Mac meal." "I want a Quarter Pounder."

> "People don't think about combo numbers — they think about what they WANT."

**UX:** Category-based item picker. User picks individual items and builds their own meal.

**Categories:** Burgers, sides (nuggets, fries), drinks, desserts

**Key principle:** "We don't want to make assumptions." Don't pre-package meals like the restaurant does. Let users check individual ingredients and build their own meal.

**Implementation:** Not built. Needs a new flow type.

### Pattern 3: Sit-Down / Pre-Set Meals (Denny's, Olive Garden, Applebee's)

**How people order:** Pre-set meals. They pick from a menu.

> "Present it like a menu: 'Hey at Denny's, here's a menu. What do you get?'"

**UX:** Menu-style presentation. User searches or browses, we show them the low-calorie equivalent.

**Implementation:** Partially covered by template-meal flow (`build_your_own: false`), but needs menu-style presentation.

### Pattern 4: Tray-Based (Panda Express)

**How people order:** Container first, then fill slots, then add extras "visually down the aisle."

> "Do you want the bowl? The black bowl or the white plate?" Then they describe it: "two entrees and a side." Then drinks. Then desserts/extras "visually down the aisle" (egg rolls etc.)

**UX:** Container picker -> slot filler -> extras aisle

**Implementation:** Partially built (Panda Express uses template meals), but doesn't have the slot-filling interaction.

### Fallback UX: DoorDash-Style List

**When to use:** Universal fallback for any restaurant. Simpler, more flexible.

**UX:**
- Everything listed on one page when you open the restaurant
- Search bar at top — type anything, it appears
- Add to cart, can change size
- Categorized sections (burgers, sides, desserts, drinks)
- Check off individual items, build your own meal

> "The cheaper, easier option for everyone."

**Key insight:** This is the fastest path to coverage across ALL locations without custom UX per restaurant.

### Two Audience Experiences

| Audience | UX Preference | Why |
|----------|--------------|-----|
| **Prospects** | Card-based, gamified, immersive, animated | They need to be wowed. This IS the marketing. |
| **Clients** | DoorDash-style list, speed-first, no animation | They already trust Eamon. They want to look up a swap fast. |

**Architectural implication:** The card layout is more immersive but requires per-restaurant UX specification. The list/DoorDash layout is universal and can be generated from any restaurant's data.

**Route separation (already identified):**
- Prospects: `/bible` (progressive lead magnet with hero + gate)
- Clients: `/client/bible` (simple reference grid, no hero/gate) — noted in HANDOFF as "we can work on that later"

---

## Content Population Strategy

### Immediate Plan (Today)

1. Go on Instagram and transcribe every fast food location's menu
2. Get 4-5 low-calorie swaps per location, Eamon-approved
3. AI fallbacks for orders that don't route to Eamon-approved swaps

### Two-Tier Data Model (Already Exists)

- **Tier 1:** Eamon-approved swaps (`source: 'eamon'`) — curated, verified, trustworthy
- **Tier 2:** AI-generated fallbacks (`source: 'llm'`) — for items without an Eamon swap

> "The combination of that plus whatever you can internally have as fallbacks... I think that's good enough to start."

---

## Link Sharing / OG Thumbnail

When the link is texted or shared on social:
- Must show an OG image / thumbnail preview
- "When you text it to someone they can be very excited about what's inside"
- Needs `<meta property="og:image">` tags on the shared pages
- Image should be compelling — food photography, clear value prop

**Action:** Consult team on thumbnail design. Implement OG meta tags on `/bible` and `/snack-bible`.

---

## Research Needed

1. **Restaurant UX pattern audit:** Out of all fast food chains we have (and plan to add), how many different user experiences are there? Categorize every target restaurant into one of the 4 patterns + fallback.

2. **Ordering modality deep research:** For each restaurant type, what are all the different "baked-in customer experiences"? How does the customer naturally interact with ordering?

3. **Dark Experiments comparison:** Compare the card-building sequence (Pattern 1) with the current dark-landing page positioning. How well does the existing flow serve the conversation-starter use case vs the lead-magnet use case?

---

## Decision Points (Needs Resolution)

### 1. Card UX vs List UX — Ship Strategy

**Question:** Do we build restaurant-specific card UX (Patterns 1-4) for all restaurants, or ship the DoorDash-style list as universal fallback first?

**Tradeoff:**
- Card UX: Higher engagement for prospects, but expensive per restaurant (custom flows, sprites, step sequences)
- List UX: Ships faster, works for all restaurants, better for clients

**Recommendation for agents:** Ship DoorDash-style list as the client-facing `/client/bible` experience. Keep card UX for the prospect-facing lead magnet where it already exists (Chipotle, CAVA, Panda). Add new restaurants to list first, then upgrade to card UX if warranted.

### 2. Prospect vs Client Entry Points

**Question:** Should `/bible` serve both audiences with a toggle, or should prospects and clients get entirely separate routes?

**Current state:** `/bible` is prospect-facing (hero, gate after 2 swaps). Client bible noted as future work.

**Decision needed:** Route structure and when to build the client version.

### 3. Third Product Category

**Question:** When someone says their challenge is NOT late-night snacking and NOT meal prep... what is it?

**Context:** "Is there a third option or something else? If they say something else that gives me good feedback."

**Action:** Track these responses. They represent unmet demand and could define Product 3.

### 4. VSL Integration with Snack Bible

**Question:** How should the VSL be accessible "at any time during the flow"?

**Options:**
- Floating button/banner that links to `/vsl`
- Inline CTA cards between swap sections
- Crossroads-style decision point after N swaps

### 5. MVP Scope for Today (2-Hour Target)

**Question:** What is the absolute minimum that makes this tool send-able as a conversation starter?

> "I just need to really align on the MVP of what this tool does before I go live, without over-engineering it."

**Candidates for the 2-hour MVP:**
- Deploy what exists to Render (DNS + domain)
- Add OG thumbnail for link sharing
- Clean up `/bible` or `/snack-bible` as the primary shared link
- Or: focus on Snack Bible MVP since it's simpler (packaged products, no restaurant-specific UX)

---

## Today's Action Items (from Eamon)

### Product / Engineering
1. MVP that can be done in ~2 hours — ship something send-able
2. 5 feedback users per day — the link must be ready to send
3. Test the link sharing experience (OG thumbnail, mobile experience)

### Content / Marketing
4. Post 2 authority reels
5. Hot take content today
6. Stories + reels about the resource
7. Post testimonials

### Sales / Engagement
8. Respond to everyone in inbox
9. Engage with people about this resource
10. Respond to yesterday's comments
11. Connect with current clients — test Slack notifications
12. Test account to verify Slack is working (not getting engagement)

### Daily Standards (Recurring)
- Post 2 authority reels
- Hot take today
- Stories and reels about the resource
- Post testimonials
- Respond to everyone in inbox

---

## Appendix: Restaurant Pattern Classification (To Be Completed)

| Restaurant | Pattern | Status |
|-----------|---------|--------|
| Chipotle | 1 — Build-Your-Own | BUILT |
| CAVA | 1 — Build-Your-Own | BUILT |
| Subway | 1 — Build-Your-Own | Not started |
| Sweetgreen | 1 — Build-Your-Own | Not started |
| Panda Express | 4 — Tray-Based | BUILT (template flow) |
| McDonald's | 2 — Traditional Fast Food | Not started |
| Burger King | 2 — Traditional Fast Food | Not started |
| Wendy's | 2 — Traditional Fast Food | Not started |
| Chick-fil-A | 2 — Traditional Fast Food | Not started |
| Shake Shack | 2 — Traditional Fast Food | Not started |
| Denny's | 3 — Sit-Down / Pre-Set | Not started |
| Olive Garden | 3 — Sit-Down / Pre-Set | Not started |
| Panera | Hybrid (1 + 3) | Not started |

**Research action:** Classify all target restaurants. Prioritize based on (a) how common they are for the ICP and (b) how much data is readily available.
