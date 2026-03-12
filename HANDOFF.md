# HANDOFF — BulletproofBodyApp

> Last updated: 2026-03-12 session 9

## What Was Built This Session

### 1. Concierge Page Redesign (`/concierge`)
- Full redesign with transformation photo grid (16 photos, 3 per row, chunked into groups of 9)
- Evolving CTA buttons with shimmer gloss effect and animated arrow — currently all say "Book a call" and link directly to Calendly
- Founder section with before/after photo, frosted overlay, bio, and personal quote
- Styled testimonial quote cards (6 cards, 2-column grid) with highlighted phrases, avatar initials, professional titles
- Screenshot testimonials section ("Straight from the DMs") — 6 screenshots in 3-column grid
- Footer link to `/concierge-full` for detailed landing page

### 2. Concierge Booking Page (`/concierge/book`)
- Dark-themed Calendly embed page (black bg, emerald accent)
- Back button to `/concierge`
- Note: CTAs currently bypass this page and go straight to Calendly URL

### 3. Concierge Full Landing Page (`/concierge-full`)
- Detailed landing page with full sales copy
- Accessible from footer of `/concierge`

### 4. Snack Bible Generating Screen Redesign
- Timer-based animation sequencing (barDone → cardGone → bridgeStep states)
- Changed metric from calories to lbs/week
- Progress bar fills with CSS easeOut, morphs into green SVG checkmark
- Card exits via AnimatePresence
- Bridge content staggers: "Just now / X.X lbs of fat per week" → "That was two snacks" → "Now imagine..." → "What if all you had to do was eat..." → CTA

### 5. Transformation Photos + Testimonials
- 16 compressed transformation photos in `public/transformations/` (from "authority square (12)" folder)
- 9 compressed testimonial screenshots in `public/testimonials/`

## Previous Sessions

### Session 8: Snack Bible Personalization (Client-Facing)
- Added sample-first -> personalize flow in `/snack-bible`
- `Personalize This For Me` panel: create/load profile by client name
- New profile tables:
  - `client_snack_profiles`
  - `client_snack_rows`
- Profile rows persist frequencies and selected snack swaps
- Add-snack workflow:
  - Search current snack catalog
  - Add to client plan
  - Auto-attaches the paired smarter swap row
- Remove row support for personalized plans

### 2. Sticky Cumulative Impact Bar
- Added sticky top summary while scrolling:
  - Weekly calories saved (cumulative)
  - Weekly fat loss projection (cumulative)
  - Monthly fat loss projection (cumulative)
- Uses animated spring counters for smooth acceleration/deceleration

### 3. One-Click Shopping Links
- Added one-click `Shop Instacart` and `Shop Walmart` links per snack item card
- Added one-click starter product links in `/grocery-bible`
- Implemented shared link helper in `app/src/lib/shopLinks.ts`
- Note: current Instacart links are public search deep links; true cart injection requires Instacart API credentials

### 4. Snack Bible Data/API Expansion
- `snack_items` now supports `sugar_g` + `image_path`
- Seed script now handles schema-safe column migration
- `/api/snack-swaps` now returns:
  - `sugar`
  - `image_url`
  - `instacart_url`
  - `walmart_url`
- Added profile APIs:
  - `GET/POST /api/snack-profiles`
  - `GET /api/snack-profiles/[id]`
  - `POST /api/snack-profiles/[id]/rows`
  - `PATCH/DELETE /api/snack-profiles/[id]/rows/[rowId]`

### 5. Previous Session Content (preserved)

#### Session 6: Module Expansion + Vector Architecture
- New route: `/snack-bible`
- New route: `/grocery-bible` (home-food baseline and order optimizer framing)
- New route: `/grocery-order-optimizer` (cart-level replacement engine framing)
- New route: `/restaurant-bible` (wild-west menu analysis spec surface)
- Added all routes to directory page (`/`)
- Added `RESTAURANT_BIBLE_SYSTEM.md` with strict 10:1 operating rules
- Added `GROCERY_STORE_BIBLE.md` outlining grocery vector architecture

#### Session 6: Mission Statement Update
- Added explicit **Snack Bible** section under client deliverable logic
- Reframed ecosystem into **Client Experience Vectors**:
- Snack Bible
- Grocery Store Bible
- Grocery Order Optimizer
- Fast Food Bible
- Restaurant Bible (Wild West)
- Tracking + Refinement
- Linked restaurant operating standard to `RESTAURANT_BIBLE_SYSTEM.md`

### 4. Previous Sessions (preserved)

#### Session 5: Panda Express — Full Build
- **63 verified ingredients** across 9 categories (Chicken, Beef, Pork, Shrimp, Vegetables, Rice & Noodles, Appetizers, Soup, Sauces)
- 37 from official PDF + 26 from pandaexpresscalculator.com (newer items: Grilled Teriyaki, Beijing Beef, Honey Walnut Shrimp, Super Greens, etc.)
- 13 items updated from 2006 PDF → 2026 macros (e.g. Chow Mein 390→600cal, Fried Rice 450→620cal)
- 20 legacy items kept but marked `source: 'pdf_2006'`
- **3 containers**: Bowl (1 side + 1 entree), Plate (1 side + 2 entrees), Bigger Plate (1 side + 3 entrees)
- **5 original meals + 5 swaps** across all container sizes
- Swap highlights: Classic Bowl 1,130→470cal (-660), Full Send 2,020→870cal (-1,150!)
- DoorDash hero image saved and deployed to public/sprites
- Added to Lead Magnet swipe cards with `hasData: true`

### 5. Generic Container System (restaurant_containers table)
- New `restaurant_containers` table replaces hardcoded `mealTypes` array
- Each restaurant defines its own container types (Chipotle: Burrito/Bowl/Tacos/Salad, Panda: Bowl/Plate/Bigger Plate, CAVA: Bowl/Pita)
- `meal_type_key` field links containers to template_meals
- `rules` JSON field: `build_your_own: true/false` determines flow
- API updated to return containers in restaurant response

### 6. Pick-Meal Flow (for template-based restaurants)
- New `"pick-meal"` flow state — shows pre-built combos grouped by container size
- Flow routing: `build_your_own: true` → step-by-step build (Chipotle), `false` → pick template meal (Panda)
- `MealTypeScreen` now reads containers from API instead of hardcoded array
- `PickMealScreen` component shows meals with calorie/macro breakdown, tap to select
- `SwapRevealScreen` updated with `originalMealName` prop for template meal flow
- `findSwap()` works for both flows: matches by `swap_for` (template) or `meal_type` (build)

### 7. Previous Sessions (preserved)

#### Session 4: CAVA Restaurant — Full Build
- **45 verified ingredients** from official CAVA nutrition PDF (restaurant version)
- **2 menu categories**: Bowl, Pita
- **7 original meals**: 4 bowls + 3 pitas (all Eamon-verified, source: 'eamon')
- **7 lean swaps**: 4 bowl swaps + 3 pita swaps (300-465 cal range, all source: 'eamon')
- Swap strategy: SuperGreens base instead of rice (bowls), Side Pita instead of Whole (pitas), skip avocado/heavy dressings
- Calorie savings: 310-530 cal per swap
- **Hero image** + **14 meal sprites** generated via Nano Banana
- Added to Lead Magnet swipe cards in `page.tsx` with `hasData: true`
- Bible page auto-discovers via `/api/restaurants`

### 2. Chipotle Orphaned Swap Fixes
- Created missing originals: `chip_steak_bowl` and `chip_chicken_salad_orig`
- Fixed `chip_steak_bowl_lean` swap_for reference
- Fixed `chip_chicken_salad` swap_for to point to salad original (was pointing to bowl)

### 3. Instagram Reel Processing
- Extracted reel `DPb-wzZEXSK` (3-modality: OCR + audio + Claude Vision)
- Content: "Skinny Chipotle Order" by @brookemoly — visual-only, no ingredient breakdown
- Saved to competitor reel library via `funnel_competitor_save`

### 4. Previous Sessions (preserved)
- Directory Page, Fast Food Bible, Restaurant APIs
- Skills: `/lead-magnet-takeout`, `/lead-magnet-add-restaurant`, `/lead-magnet-add-swap`
- AI Food Sprites for all 9 Chipotle meals (Nano Banana)
- Crossroads screen, SwapRevealScreen, projection graph
- Two-tier meal source system, session accumulation, email API

## What's NOT Finished (Pick Up Here)

1. **Resend API key** not configured — emails save to `leads` table but don't send
2. **VSL link** — crossroads "See how the full plan works" button is TODO
3. **Chipotle chicken tacos swap** saves ~0 cal (533 vs 530) — needs rework or removal
4. **Steak harissa bowl sprite** has DoorDash watermark — regenerate without "DoorDash" in prompt
5. **@brookemoly's original 280 cal Chipotle post** — need to find ingredient list
6. **Restaurant Bible engine** — routing/spec exists, but no live menu parser + conversation analyzer yet

## CAVA DB State

```
Originals (7):
Chicken + Rice Bowl        | bowl | 700 cal | 40g P
Steak + Harissa Bowl       | bowl | 610 cal | 37g P
Harissa Avocado Bowl       | bowl | 830 cal | 41g P
Spicy Lamb + Avocado Bowl  | bowl | 800 cal | 46g P
Greek Chicken Pita         | pita | 870 cal | 48g P
Spicy Chicken+Avocado Pita | pita | 980 cal | 49g P
Steak + Feta Pita          | pita | 810 cal | 48g P

Swaps (7):
Lean Chicken Bowl          | bowl | 390 cal | 33g P | -310 saved
Lean Steak Bowl            | bowl | 300 cal | 29g P | -310 saved
Lean Harissa Chicken Bowl  | bowl | 395 cal | 32g P | -435 saved
Lean Lamb Meatball Bowl    | bowl | 430 cal | 30g P | -370 saved
Lean Greek Chicken Pita    | pita | 465 cal | 38g P | -405 saved
Lean Steak Pita            | pita | 365 cal | 34g P | -445 saved
Lean Harissa Chicken Pita  | pita | 450 cal | 32g P | -530 saved
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Directory — links to all active modules |
| `/concierge` | Concierge landing page (transformation grid + testimonials + CTAs → Calendly) |
| `/concierge/book` | Calendly embed page (dark theme) |
| `/concierge-full` | Detailed landing page with full sales copy |
| `/experiments/dark-landing` | Lead Magnet (gamified swap experience) |
| `/bible` | Fast Food Bible (search-first reference tool) |
| `/snack-bible` | Snack Bible (side-by-side snack swaps) |
| `/snack-bible-demo` | Snack Bible demo/generating screen |
| `/grocery-bible` | Grocery Store Bible (home-food decision layer) |
| `/grocery-order-optimizer` | Grocery Order Optimizer (cart-level replacement layer) |
| `/restaurant-bible` | Restaurant Bible (wild-west spec and rules surface) |

## Database Schema (Current)

```
restaurants (hero_image_path added)
  └── menu_categories
  └── restaurant_containers (NEW — container types per restaurant)
  └── ingredients (29 Chipotle + 45 CAVA + 63 Panda Express, verified macros)
  └── template_meals (source, sprite_path, sprite_config)
  │     └── template_meal_ingredients
  └── swap_sources (social media ingestion — schema ready)
  └── reference_images (DoorDash screenshots stored)

leads (email captures)
```

## Key Architecture Decisions

- **No emojis anywhere** — DoorDash-style food photography sprites, restaurant hero images, letter initials for coming-soon
- **Each restaurant gets a hero_image_path** — flagship image for swipe cards + crossroads grid
- **Sprite configs stored in DB** — regeneratable if app theme changes
- **Location multiplier (4x)** not frequency multiplier (5.9x) — strengthens the argument
- **Two-tier meals**: Eamon-approved (`source: 'eamon'`) > LLM-generated (`source: 'llm'`)
- **Post-email loop**: unlimited meals, running total = engagement signal for lead scoring
- **Fast Food Bible** = same data, search-first UX, no gamification
- **Restaurant Bible** = separate concept for later (non-fast-food restaurants)
- **Lean swap strategy**: Replace base (greens instead of rice/grains) + skip heavy toppings (avocado, feta) + use lighter dressings
- **Light portions via quantity**: `template_meal_ingredients.quantity < 1.0` for reduced portions

## Dev Server

```bash
cd /Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/app
npm run dev  # Port 3456
```

URLs:
- Directory: http://localhost:3456/
- Lead Magnet: http://localhost:3456/experiments/dark-landing
- Fast Food Bible: http://localhost:3456/bible
- Snack Bible: http://localhost:3456/snack-bible
- Grocery Store Bible: http://localhost:3456/grocery-bible
- Grocery Order Optimizer: http://localhost:3456/grocery-order-optimizer
- Restaurant Bible: http://localhost:3456/restaurant-bible

## Key Files

- `app/src/app/page.tsx` — Directory page
- `app/src/app/bible/page.tsx` — Fast Food Bible (~580 lines)
- `app/src/app/experiments/dark-landing/page.tsx` — Lead Magnet (~2100 lines)
- `app/src/app/api/restaurant/[id]/route.ts` — Restaurant data API
- `app/src/app/api/restaurants/route.ts` — Restaurant list API
- `app/src/app/api/send-swap-plan/route.ts` — Email capture API
- `bulletproof_body.db` — All data
- `app/public/sprites/` — 26 sprite images (9 Chipotle + 15 CAVA + 1 Chipotle hero + 1 Panda hero)
- `assets/sprites/` + `assets/references/` — Source assets
