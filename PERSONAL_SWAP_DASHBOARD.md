# Personal Swap Dashboard — Planning Doc

> **Created:** 2026-03-08
> **Status:** Planning
> **Origin:** Eamon voice download + VSL transcript
> **Relationship to existing app:** This is the CLIENT-FACING version of the lead magnet. Same swap engine, but built from THEIR actual eating patterns.

---

## The Three Products (Same Engine, Different Lens)

| Product | Audience | Purpose | Data Source |
|---------|----------|---------|-------------|
| **Lead Magnet** (`/experiments/dark-landing`) | Cold traffic (Instagram) | Acquisition — show where the fat is hiding in generic restaurant orders | Pre-built restaurant swaps (Chipotle, CAVA, etc.) |
| **Fast Food Bible** (`/bible`) | Clients (reference) | Reference tool — search any restaurant for optimized orders | Same DB, search-first UX |
| **Personal Swap Dashboard** (`/client/[id]`) | Individual client | THE Phase 1 deliverable — every food in their life, mapped and swapped | Built from 2 weeks of food photos + comments |

---

## The Vision (Eamon's Words)

> "Imagine you didn't change a single thing about what you ate. You just knew it. That is your maintenance calories, by definition."

> "Every decision, we slightly improve from what you're currently doing while still honoring what you love about that meal."

> "I build them their Bulletproof Body Fitness Ecosystem. This is a proprietary system where I've identified all the different vectors of all they like in every scenario of their life."

---

## How It Works: The Client Journey

### Week 1-2: Data Collection (Phase 1)

Client does two things:
1. **Photos of everything they eat** before eating it ("your phone eats before you do")
2. **Comments on WHY** — convenience, love, habit, craving, social

Plus: daily scale weigh-in to prove maintenance.

### Week 2-3: Eamon Builds the Dashboard

From the photos and comments, Eamon identifies:
- Every food/meal/snack across every scenario of their life
- The calorie reality of each item
- Which items are "leaks" (high cal, low awareness)
- Which items are "gems" (low cal, already doing great)
- Which items they LOVE (keep as-is)
- Which items are convenience (easiest to swap)

### Week 3: The Reveal

Client gets a personalized URL showing their entire food world, mapped and optimized.

### Week 3+: Trainerize Sync

Approved swaps become one-click meals in their fitness app. Simple rule: eat what you want, stop at your calorie target.

---

## The Personal Swap Dashboard — Feature Spec

### URL: `/client/[id]` (unique per client, shareable with client)

### Header Section
- Client first name: "Alex's Bulletproof Body Ecosystem"
- Current weight → Goal weight
- RMR + daily calorie target
- "Based on 2 weeks of your actual eating patterns"

### Main Section: The Swap Grid

For EVERY identified food item in their life:

```
┌──────────────────────────────────────────────────────────┐
│  [Toggle ON/OFF]                    [Orders/week: 3 ▼]   │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │  YOUR ORDER      │    │  THE SMARTER ORDER          │  │
│  │                  │    │                              │  │
│  │  [sprite/photo]  │    │  [sprite/photo]              │  │
│  │                  │    │                              │  │
│  │  Chipotle Burrito│    │  Lean Chicken Bowl           │  │
│  │  1,060 cal       │    │  425 cal                     │  │
│  │                  │    │                              │  │
│  │  Cilantro Rice   │    │  ✗ Cilantro Rice  -210      │  │
│  │  Pinto Beans     │    │  ✗ Pinto Beans    -130      │  │
│  │  Chicken         │    │    Chicken         180      │  │
│  │  Carnitas        │    │  ✗ Carnitas       -210      │  │
│  │  Vinaigrette     │    │  ✗ Vinaigrette    -220      │  │
│  │  Cheese          │    │    Cheese          110      │  │
│  └─────────────────┘    └─────────────────────────────┘  │
│                                                          │
│  635 cal saved per order × 3/week = 1,905 cal/week       │
│                                                          │
│  Context: "Convenience — orders this when working late"  │
│  Coach note: "Skip rice (biggest saver). Keep cheese     │
│  for satisfaction. Double veggies for volume."            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Item Types

Not just restaurant meals — EVERYTHING:

| Category | Examples |
|----------|----------|
| **Takeout** | Chipotle bowl, Thai food, pizza |
| **Snacks** | Hot Cheetos → BSN protein bar |
| **Drinks** | Frappuccino → iced americano |
| **Home meals** | Pasta with heavy sauce → lighter version |
| **Sauces/Condiments** | Full mayo → light mayo, olive oil → spray |
| **Desserts** | Ice cream → Halo Top, chocolate bar → protein bar |
| **Keep items** | Things they love, already reasonable — shown as "KEEP" |

### Keep Items (No Swap Needed)

Some items stay. Shown differently:

```
┌──────────────────────────────────────────────────────────┐
│  ✓ KEEP                              [Orders/week: 7 ▼]  │
│                                                          │
│  Morning Black Coffee — 5 cal                            │
│  "You love this. It's perfect. Don't change a thing."    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Bottom Section: Dynamic Projection

Same graph engine as the lead magnet, but:
- Uses THEIR actual RMR (calculated from their stats)
- Uses THEIR actual food data (not generic restaurant meals)
- Shows calories saved from ALL toggled-on swaps
- Updates in REAL TIME as they toggle items on/off or change orders/week

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your Total Weekly Deficit: 4,850 calories               │
│  That's 1.4 lbs of fat per week                          │
│                                                          │
│  ┌────────────────────────────────────────────┐          │
│  │  NOW                                       │          │
│  │  200● ─╲                                   │          │
│  │         ╲                                  │          │
│  │          ╲──╲                              │          │
│  │              ╲──╲                          │          │
│  │                  ╲──── GOAL                │          │
│  │                        180●                │          │
│  │  Today              Jun 2026               │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  Toggle any item above to see how it changes the graph.  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Team Consultation

### Maya (Product Manager)

**Love:** This is the highest-value deliverable in the program. It's what makes Phase 1 feel worth 2 weeks of "just taking photos."

**Pushback:** The BUILD PROCESS needs to be as efficient as the client experience. If it takes Eamon 4 hours to build each client's page, it won't scale. We need:
1. A fast way to INPUT client food data (photo → item identification)
2. A fast way to ASSIGN swaps (suggest from existing DB, or create custom)
3. Auto-generation of the page from the data

**Proposal:** Build it in two parts:
- **Part A: The Client Page** (what the client sees) — beautiful, interactive, personalized
- **Part B: The Builder** (what Eamon uses) — admin interface or CLI to input data and generate the page

**Priority:** Part A first. Even if Eamon manually enters data via DB/script, the client page is the product. The builder can be polished later.

### Kai (UX Designer)

**Love:** This is the same visual language as the lead magnet — we've already proven this works. The side-by-side swap cards, the green savings numbers, the projection graph.

**Key UX decisions:**
1. **Toggle interaction** — each item can be toggled on/off. When off, it grays out and the graph updates. This gives the client AGENCY. They're co-creating their plan, not being told what to do.
2. **Orders/week selector** — small dropdown or stepper. Changes the math instantly. If they only order Chipotle 2x/week instead of 5x, the numbers should reflect that.
3. **Keep items** — visually distinct. Green checkmark. "You're already winning here." Positive reinforcement.
4. **Coach notes** — Eamon's personal notes on each item. This is where the coaching lives. "I noticed you eat this after stressful days. The protein bar will actually help you sleep better too."
5. **Mobile-first** — this is what clients will check on their phone. The toggle/graph interaction must be buttery smooth on mobile.

**Design reuse:**
- Swap card layout: directly from lead magnet (proven)
- Color system: same dark theme, green savings, red removed
- Projection graph: same component, different data source
- Typography: same scale

### Remy (Game Designer)

**Love:** The toggle-to-graph interaction is EVERYTHING. Imagine:
- Client toggles ON the Chipotle swap → graph line drops, "1.4 lbs/week" updates to "1.8 lbs/week", date moves closer
- Client toggles OFF the snack swap → graph rises slightly, numbers adjust
- They're PLAYING with their own future. Each toggle is a decision about their life.

**Must-haves:**
1. **Animated transitions** — when toggle changes, the graph should animate smoothly, not jump
2. **Running total** — always visible, always updating. "4,850 cal/week saved" → toggle off an item → "3,200 cal/week saved"
3. **Milestone markers** — at certain calorie thresholds, show context: "At this rate, you'd lose 20 lbs by summer"
4. **Per-item impact** — show each item's contribution to the total: "This swap alone = 0.5 lbs/week"

### Nick (Lead Magnet Strategist)

**Love:** This is the ultimate conversion tool. Client sees this and thinks: "This coach built something JUST FOR ME. I've never experienced anything like this."

**Key insight:** This page IS the program. Not the workouts. Not the macros. THIS. The moment the client sees their entire food world mapped, understood, and optimized — with zero judgment — that's when they're bought in for 6-12 months.

**Shareability:** Client will screenshot this and show friends/family. "Look what my coach built me." Free referrals.

**Upsell path:** The lead magnet → gives them a TASTE of what this feels like with generic data. The personal dashboard → is the full version, built from THEIR life. The gap between the two is what sells the coaching.

### Lex (Copywriter)

**Key copy moments:**

1. **Page title:** "Your Bulletproof Body Ecosystem" (not "meal plan" — this is bigger)
2. **Intro line:** "Here's every meal, snack, and order in your life — and exactly where the fat is hiding."
3. **Keep item copy:** "You're already winning here. Don't change a thing."
4. **Swap item coach note:** Personal, specific, no jargon. "You eat this after long days. The swap keeps the crunch you love but saves you 350 calories."
5. **Graph section:** "Toggle any item to see how it changes your timeline."
6. **Bottom CTA:** "Happy with this plan? Let's lock it in." → Goes to Trainerize sync / approval meeting

---

## Data Model

### New Tables

```sql
-- Links to coaching MCP client or standalone
CREATE TABLE client_profiles (
    id TEXT PRIMARY KEY,           -- UUID or coaching client ID
    name TEXT NOT NULL,
    current_weight_lbs REAL,
    goal_weight_lbs REAL,
    height_inches REAL,
    age INTEGER,
    gender TEXT,                    -- 'male' / 'female'
    rmr REAL,                      -- calculated
    daily_calorie_target REAL,     -- assigned by Eamon
    phase TEXT DEFAULT 'phase1',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Every food item identified from Phase 1 photos
CREATE TABLE client_food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT REFERENCES client_profiles(id),
    name TEXT NOT NULL,             -- "Chipotle Burrito Bowl"
    category TEXT,                  -- 'takeout', 'snack', 'drink', 'home', 'condiment', 'dessert'
    restaurant TEXT,                -- nullable (snacks don't have restaurants)
    calories REAL NOT NULL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    orders_per_week REAL DEFAULT 3, -- how often they eat this
    why_they_eat_it TEXT,           -- 'convenience', 'love', 'habit', 'social', 'craving'
    client_comment TEXT,            -- their actual words from Phase 1
    photo_url TEXT,                 -- link to their Phase 1 photo
    sprite_path TEXT,               -- generated food sprite
    created_at TEXT DEFAULT (datetime('now'))
);

-- The swap Eamon assigns (or marks as "keep")
CREATE TABLE client_swaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT REFERENCES client_profiles(id),
    original_item_id INTEGER REFERENCES client_food_items(id),
    swap_type TEXT NOT NULL,        -- 'swap' or 'keep'
    -- For 'swap' type:
    swap_name TEXT,                 -- "Lean Chicken Bowl"
    swap_calories REAL,
    swap_protein_g REAL,
    swap_carbs_g REAL,
    swap_fat_g REAL,
    swap_sprite_path TEXT,
    swap_ingredients TEXT,          -- JSON array of {name, calories, action} where action = 'keep'|'remove'|'add'|'reduce'
    calorie_savings REAL,           -- computed: original.calories - swap.calories
    coach_note TEXT,                -- Eamon's personalized note
    -- For 'keep' type:
    keep_reason TEXT,               -- "You're already winning here"
    -- Linking to existing DB (optional)
    template_meal_id TEXT,          -- links to template_meals if it's a known restaurant swap
    -- State
    is_toggled_on INTEGER DEFAULT 1,  -- client can toggle off
    orders_per_week REAL,           -- overrides client_food_items default
    approved INTEGER DEFAULT 0,     -- set to 1 after approval meeting
    created_at TEXT DEFAULT (datetime('now'))
);

-- Trainerize sync tracking
CREATE TABLE client_trainerize_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT REFERENCES client_profiles(id),
    swap_id INTEGER REFERENCES client_swaps(id),
    trainerize_meal_name TEXT,
    trainerize_calories REAL,
    trainerize_protein_g REAL,
    trainerize_carbs_g REAL,
    trainerize_fat_g REAL,
    synced_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending'   -- 'pending', 'synced', 'approved'
);
```

### Reuse from Existing DB

When a client eats at a restaurant we already have (Chipotle, CAVA, etc.), we can:
1. Pull the original meal from `template_meals`
2. Pull the lean swap from `template_meals` (where `swap_for` is set)
3. Auto-populate the `client_swaps` entry with real ingredient-level data
4. Show the same beautiful ingredient breakdown we already have

For items NOT in the DB (custom snacks, home meals, etc.), Eamon enters them manually.

---

## API Routes

```
GET  /api/client/[id]              → Full client dashboard data
GET  /api/client/[id]/projection   → Weight loss projection calc
POST /api/client/[id]/toggle       → Toggle a swap on/off
POST /api/client/[id]/frequency    → Update orders/week for an item
POST /api/client/[id]/approve      → Mark plan as approved
```

### Admin/Builder Routes (Eamon only)

```
POST /api/admin/client             → Create client profile
POST /api/admin/client/[id]/item   → Add food item from Phase 1
POST /api/admin/client/[id]/swap   → Assign swap or mark as keep
POST /api/admin/client/[id]/bulk   → Bulk import items + swaps (JSON)
```

---

## Build Plan

### Phase 1: Client Page (MVP)

**Goal:** A beautiful, interactive page that Eamon can show to ONE client.

| Step | What | Reuse | New |
|------|------|-------|-----|
| 1 | DB schema (client_profiles, client_food_items, client_swaps) | - | New tables |
| 2 | API routes (GET client data, toggle, frequency) | Projection math from lead magnet | New endpoints |
| 3 | Client page (`/client/[id]`) | Swap card component, graph component, color system | New page layout, toggle interaction, per-item frequency |
| 4 | Seed with test data (mock client) | - | Test data |
| 5 | Mobile polish | Existing responsive patterns | - |

### Phase 2: Builder (Eamon's Workflow)

**Goal:** Make it fast for Eamon to build a dashboard from Phase 1 photos.

| Step | What |
|------|------|
| 1 | Admin page or CLI to create client + add items |
| 2 | "Smart suggest" — when Eamon types a restaurant name, pull existing swaps from DB |
| 3 | Bulk JSON import (for efficiency) |
| 4 | Photo upload + sprite generation |

### Phase 3: Trainerize Integration

**Goal:** One-click sync from approved swaps to Trainerize meals.

| Step | What |
|------|------|
| 1 | Connect to Trainerize API (or manual export format) |
| 2 | Generate meal entries from approved swaps |
| 3 | Track sync status |

### Phase 4: Scale

| Step | What |
|------|------|
| 1 | Client login (so they can revisit their page) |
| 2 | Phase 2 updates (swap evolution over time) |
| 3 | Progress tracking (actual weight vs projected) |

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Same app, new route (`/client/[id]`) | Reuse all existing components, styles, and projection math |
| SQLite (same DB) | One database, shared ingredient data |
| No auth for MVP | Client gets a unique URL. Security through obscurity for now. |
| Toggle state on server | Persists across sessions. Client can revisit and play with toggles. |
| Coach notes per item | This is where the COACHING lives. The page is the container, the notes are the value. |

---

## What Makes This Different From Every Other Coach

1. **Visual** — Not a spreadsheet. Not a PDF. A living, interactive page.
2. **Personalized** — Built from THEIR actual food, not a generic meal plan.
3. **No judgment** — "Keep" items are celebrated. Comments are preserved. WHY matters.
4. **Interactive** — They toggle, they see the math change. They're co-creating their plan.
5. **One source of truth** — Same data feeds the page AND Trainerize. No discrepancy.
6. **Shareable** — Client screenshots this, shows friends. Free referral engine.

---

## Open Questions

| # | Question | Who |
|---|----------|-----|
| 1 | How do Phase 1 photos get INTO the system? (Client sends via Trainerize? Text? Separate upload?) | Eamon |
| 2 | Does the client see this page BEFORE the approval meeting? Or is it revealed during the meeting? | Eamon |
| 3 | Auth: Does the client need a login? Or is a unique URL enough? | Maya |
| 4 | Trainerize API: Is there an API, or is this manual meal creation? | Dev |
| 5 | Should keep items show calories? Or just the affirmation? | Kai |
| 6 | Do we show macros (protein/carbs/fat) per item, or just calories? | Eamon |
| 7 | What's the calorie target logic? Is it RMR-based or Eamon assigns it? | Eamon |
| 8 | Non-restaurant items (snacks, condiments) — do we generate sprites or use stock photos? | Kai |
