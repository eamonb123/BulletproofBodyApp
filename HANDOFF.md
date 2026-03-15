# HANDOFF — BulletproofBodyApp

> Last updated: 2026-03-15 session 19

## What Was Built This Session

### Session 19: Chipotle + Cheesecake Factory Sprites & Nutrition Audit (2026-03-15)

#### 1. Chipotle — 9 Eamon-approved meals with sprites
- Generated nano-banana sprites for all 8 existing meals + 1 new Clean Protein Bowl
- Added new meal: **Clean Protein Bowl** (double chicken, black beans, double fajita veggies, salsa, lettuce) — 560 cal, 74g protein
- Updated Honey Chipotle Bowl: removed cheese + vinaigrette, now 430 cal, 66g protein
- All sprites saved to `app/public/sprites/chipotle_*.png`

#### 2. Cheesecake Factory — Full nutrition audit + unbundled + 10 sprites
- **Broke apart bundled combos** into individual SkinnyLicious items (was 8 combos → now 10 standalone meals)
- **Verified all nutrition against FatSecret** — found and fixed:
  - Turkey Burger protein: 44g → 29g (was 15g inflated!)
  - Grilled Salmon: 570 → 590 cal, 48g → 45g protein
  - Chicken Soft Tacos: 510 → 520 cal, 36g → 32g protein
  - Lemon-Garlic Shrimp: 520 → 550 cal
- Generated 10 nano-banana sprites (`app/public/sprites/cf_sl_*.png`)
- All meals: is_swap=1, source='eamon', showing in takeout-client UI

#### 3. What's NOT Finished (Pick Up Here)
- **P.F. Chang's sprites** — 20 meals (10 heavy + 10 swaps), ALL need sprites
  - Generate nano-banana images inspired by P.F. Chang's aesthetic (Chinese restaurant plating, dark bowls, chopsticks)
  - Link sprite_path in DB after generation
- Other restaurants may also need sprite audit

#### 4. Server Note
- Dev server was restarted during session (was hanging). Running on port 3456.
- `npm run dev -- -p 3456` from `app/` directory

---

### Session 18: Whole Foods Sprites Complete + Frozen Meal Discovery (2026-03-15)

#### 1. Whole Foods Sprites — ALL 11 swap meals now have AI-generated sprites
Linked 3 existing sprites that were on disk but not in DB, then generated 8 more via Nano Banana.

**Family Meal Trays (aluminum foil tray aesthetic):**
- `wf_chicken_greenbeans_sweetpotato.png` — Rotisserie Chicken + Green Beans + Sweet Potatoes (565 cal)
- `wf_salmon_fingerlings_greenbeans.png` — Teriyaki Salmon + Fingerlings + Green Beans (565 cal)
- `wf_lemon_chicken_potatoes.png` — Lemon Rosemary Chicken + Garlic Potatoes + Green Beans (590 cal)
- `wf_grilled_chicken_broc_sp.png` — Grilled Chicken + Broccoli + Sweet Potatoes (355 cal)
- `wf_chicken_brussels_gb.png` — Rotisserie Chicken + Brussels Sprouts + Green Beans (515 cal)
- `wf_chicken_soup_combo.png` — Rotisserie Chicken (6oz) + Chicken Rice Soup (530 cal)
- `wf_steak_veggies_sp.png` — Steak + Roasted Vegetables + Sweet Potatoes (620 cal)

**Lean Deli Sandwiches (multigrain bread on parchment):**
- `wf_lean_turkey_sandwich.png` — Lean Turkey Sandwich (475 cal)
- `wf_lean_ham_sandwich.png` — Lean Black Forest Ham Sandwich (395 cal)
- `wf_lean_chicken_sandwich.png` — Lean Grilled Chicken Sandwich (445 cal)
- `wf_lean_roastbeef_sandwich.png` — Lean Roast Beef Sandwich (585 cal)

#### 2. Whole Foods Final State
- 63 ingredients, 11 swap meals (all with sprites), 7 heavy meals, 18 order scripts
- Logo linked in `LOGO_EXTENSION_BY_ID` map + `restaurant-logos/wholefoods.png`
- Food keyword search: sandwich, chicken, bowl, salad, healthy, grocery, "family meal", salmon, "meal prep", "whole foods"
- ChromaDB re-embedded: 2,193 total items

#### 3. Frozen Meals Already in DB (discovered)
70 frozen meals exist in `snack_items` table under `item_subcategory = 'frozen_meal'`. Brands: Real Good Foods (5), Healthy Choice (5), Kevin's Natural Foods (10), Lean Cuisine (8), Jimmy Dean (8), Quest (5), Red's (3), plus Atkins, Banquet, Caulipower, DiGiorno, Hot Pockets, Kodiak, and more.

**NOT yet added:** Healthy Choice Zero line (Sesame Chicken with Zoodles, etc. from Eamon's HEB Notion page)

## What's NOT Finished (Pick Up Here)

1. **Healthy Choice Zero line** — Add the Zero sugar/low carb frozen bowls (Sesame Chicken with Zoodles visible in Eamon's Notion HEB page)
2. **Frozen meals not searchable via takeout_search** — They live in `snack_items`, not the restaurant/takeout system. May need a search bridge or new MCP tool
3. **Previous session carry-over** — See session 17 below for any remaining items

---

### Previous Sessions

### Session 14: Builder Improvements, Semantic Search, Data Integrity (2026-03-14 continued into 2026-03-15)

#### 1. Semantic Search Pipeline (ChromaDB + OpenAI Embeddings)
- 1,760+ food items embedded in ChromaDB (snacks + template meals + food items)
- `scripts/embed_foods.py` — full re-embed + single item function
- `scripts/food_search.py` — semantic search module
- `/api/ecosystem/semantic-search` endpoint
- `/api/ecosystem/extract` now uses semantic search instead of keyword matching
- All 7 food-insert skills updated with mandatory `python3 scripts/embed_foods.py` rule
- CLAUDE.md updated with Semantic Search section

#### 2. Builder Mode Improvements
- **Search swap database** — always-visible search box in builder, semantic search across all 1,760+ items
- **Swap search inside Swap Details** — search for specific swaps without running AI extraction
- **Edit button** on every card — loads item back into builder with all fields pre-filled
- **Edit Swap button** on every card — inline panel showing saved swap suggestions + semantic search
- **Suggested swaps persist** — saved as `suggested_swaps_json` in DB, restored on edit
- **Swap data saves regardless of item state** — even open questions keep their proposed swap

#### 3. AI Extraction Improvements
- **Multi-meal screenshot handling** — identifies all meals, extracts only the one specified by coach
- **Date extraction** from top-left of Trainerize screenshots
- **Meal time extraction** per entry (e.g., "1:39 PM") — `meal_time` column added to DB
- **240 cal oil buffer** — mandatory for unpublished-calorie restaurant meals, skipped for published-calorie chains
- **High-bound macro estimation** — no ranges, single numbers, Trainerize-ready
- **Human-readable portions** — "~6 pieces" not "0.5 oz"
- **Packaged goods detection** — reads nutrition label from photo, uses brand name, single line item (not fake ingredient breakdown)
- **Brand name recognition** — when client names a brand ("Lazy Dog frozen dinner"), treats as packaged good
- **Coach's instructions textarea** — guides AI extraction and swap search
- **Restaurant logo auto-attached** from `/restaurant-logos/` directory on save

#### 4. Card UI Improvements
- **Ingredient breakdown** on both original AND swap cards (sorted highest to lowest calories)
- **Color-coded ingredient diff** — white = unchanged, red = removed, amber = proposed new
- **Client photo always visible** on every card (not hidden behind expand)
- **Restaurant logos** on swap cards (Panda Express logo, etc.) with 🍽️ emoji fallback
- **Fixed alignment** — both sides of swap card have fixed-height headers so calories/protein boxes are level
- **Context-aware action buttons** — Approve Swap / Confirm Keep / Convert to Swap / Convert to Keep / Resolved / Edit / Edit Swap / Remove
- **"Save as Education" removed** — only Swap, Keep, Open Question remain
- **Shop links** (Instacart + Walmart) on open question proposed swap cards

#### 5. Data Integrity
- **Papa John's GF pizza fixed** — 145 cal → 750 cal (researched from CalorieKing, cross-validated)
- **Pizza Hut thin crust fixed** — 200 cal → 1,280 cal (verified from official Pizza Hut nutrition calculator)
- **Memory saved: Never Fabricate Nutrition Numbers** — always research, cross-validate, use high-bound
- **Memory saved: Always Check Internal DB First** — our DB is already researched, don't override with web
- **Memory saved: By Using the System We Improve the System** — surface bad data, don't hide it

#### 6. Takeout Client Page
- **Food type keyword search** — "sandwich" finds Subway, Jersey Mike's, Jimmy John's, etc.
- 25+ food categories mapped: sandwich, burger, pizza, chicken, wings, mexican, bowl, salad, breakfast, steak, etc.

#### 7. Gold Member Value Proposition
- `GOLD_MEMBER_VALUE.md` — complete value prop document
- 10 benefits with "Old Way vs Bulletproof Body" enemy framing
- Value System Discovery framework (Love, Texture, Convenience, Habit, Social, Don't Care)
- Non-Negotiable Rule documented
- All AI/system references scrubbed — "Eamon's Team" throughout (client-facing language)

#### 8. New DB Columns
- `meal_time TEXT` on ecosystem_items
- `swap_education_text TEXT` on ecosystem_items
- `suggested_swaps_json TEXT` on ecosystem_items

### Session 17: Subway Sprites + Bowl Nutrition Fix (2026-03-14)

#### 1. Subway Sprites (10 meals, all AI-generated)
Generated food photography sprites for all 10 Eamon-approved Subway meals via Nano Banana. All saved to `app/public/sprites/` and linked in DB via `sprite_path`.

| Meal | Sprite File |
|------|------------|
| #6 Turkey + double meat + veggies | `subway_turkey_double_veggies.png` |
| 6 Inch Steak & Cheese | `subway_steak_cheese.png` |
| 6 Inch Turkey Sandwich | `subway_turkey_sandwich.png` |
| Oven-Roasted Chicken on Wheat | `subway_chicken_wheat_mustard.png` |
| Chicken No Bread Bowl | `subway_chicken_no_bread_bowl.png` |
| Grilled Chicken Bowl | `subway_grilled_chicken_bowl.png` |
| Grilled Chicken Wrap | `subway_grilled_chicken_wrap.png` |
| Steak & Veggie Bowl | `subway_steak_veggie_bowl.png` |
| Roast Beef & Veggie Bowl | `subway_roast_beef_veggie_bowl.png` |
| Sweet Onion Chicken Teriyaki Bowl | `subway_sweet_onion_bowl.png` |

#### 2. Bowl Nutrition Fix (verified against official Subway data)
Bowl meat portions were originally set to qty=2 (6-inch sub x2), which underestimated calories. Research confirmed Subway protein bowls use larger portions (~2.5-3x the 6-inch sub portion).

**Official Subway Protein Bowl nutrition (verified sources: FatSecret, EatThisMuch, FastFoodNutrition):**
- Steak & Cheese Bowl: 380 cal, 42g P (includes American cheese)
- Roast Beef Bowl: 210 cal, 33g P (no cheese)
- Oven Roasted Chicken Bowl: 200 cal, 27g P (no cheese)
- Sweet Onion Teriyaki Bowl: 300 cal, 34g P (no cheese)

**Updated Eamon lean bowls (no cheese, all veggies, mustard):**
- Steak & Veggie Bowl: 345 cal, 51g P (qty=3, no cheese vs official 380 w/ cheese)
- Sweet Onion Teriyaki Bowl: 310 cal, 40g P (qty=2.5)
- Roast Beef & Veggie Bowl: 215 cal, 38g P (qty=2.5)
- Chicken No Bread Bowl: 215 cal, 40g P (qty=2.5)
- Grilled Chicken Bowl: 215 cal, 40g P (qty=2.5)

#### 3. Veggie-Loaded Bowls
All 5 bowls and sparse sub meals now include ALL zero-cal Subway vegetables: lettuce, baby spinach, tomatoes, cucumbers, green peppers, onions, banana peppers, jalapenos, pickles, black olives. Makes the meals look and feel like real portions.

#### 4. Order Scripts Updated
All meals have accurate ordering scripts reflecting correct portions and ingredients.

#### 5. Key Finding: FastFoodNutrition.org Steak Bowl Error
FastFoodNutrition lists the Steak & Cheese bowl as 370 cal with "guacamole and Chipotle Southwest sauce" as default toppings. This is almost certainly wrong — those add 140+ cal. FatSecret and EatThisMuch consistently list 380 cal with just steak + American cheese + veggies.

### Previous Session (Session 16): Client-Facing Fast Food Bible (`/takeout-client`) (2026-03-14)

Built a new client-facing version of the Fast Food Bible at `/takeout-client`. This is separate from the prospect-facing `/takeout` (lead magnet). The client version is a clean reference tool for coaching clients to look up exactly what to order at any restaurant.

#### 1. Route: `/takeout-client`
- **Cloned from** `/takeout` (4,004 lines), then heavily modified
- **Skips hero/landing page** — goes straight to the restaurant grid
- **No gate/email capture** — no lead gen flow, purely a client tool
- **URL query params** — clicking a restaurant updates URL to `?r=pandaexpress` (shareable/bookmarkable)
- **Direct linking** — can send a client `bulletproofbody.ai/takeout-client?r=sweetgreen` and they land on the right page
- **Filtered restaurants** — removed `sushi`, `indian`, `chinese_takeout` (generic, no verified data)
- **Added Five Guys** to restaurant DB + logo (`fiveguys.webp`)
- **Added Starbucks** logo (`starbucks.png`) — already existed in DB

#### 2. Client Swap Card Design (MightyMeals-inspired)
Each restaurant shows only **Eamon-approved** (`source: 'eamon'`) swaps as visual cards in a 2-column grid:
- **Food sprite image** at top (AI-generated via Nano Banana, or restaurant logo placeholder)
- **Meal name** — bold, scannable (e.g., "Miso Bowl", "Chicken Pesto Parm")
- **Big macro numbers** — calories (emerald) + protein inline
- **"Say this at the counter"** — green highlighted box with exact verbal ordering script
- **Ingredient breakdown** — always visible, per-item calories + protein
- **"Eamon's Pick"** badge at bottom

#### 3. Dual-Range Macro Filters
Two dual-handle range sliders at the top of each restaurant page:
- **Calories** — drag min/max to filter (e.g., 200–500 cal)
- **Protein** — drag min/max to filter (e.g., 20g–50g)
- Ranges auto-set from actual data (0 to max in DB)
- "Reset filters" link when active
- Card count updates in real time ("4 of 7 options")

#### 4. Order Scripts (`order_script` column)
- **New column** `order_script TEXT` added to `template_meals`
- **Auto-generated 253 scripts** for all Eamon-approved swaps from ingredient + category data
- Scripts grouped by category: Side, Entree(s), Drink, Sauce
- Container type included where available (Bowl, Plate, Bigger Plate)
- Format: "Order a Bowl. Side: Super Greens. Entree: Teriyaki Chicken (x2). Drink: Diet Soda / Water."
- Eamon can override with custom scripts for edge cases (naked tenders, half portions, etc.)

#### 5. Sweetgreen Sprites (5 AI-generated food photos)
Generated via Nano Banana in Sweetgreen's editorial food photography style:
- `sweetgreen_super_green_goddess.png` — kale, spinach, broccoli, avocado, green goddess
- `sweetgreen_chicken_pesto_parm.png` — grilled chicken, pesto, parmesan on greens
- `sweetgreen_crispy_rice_bowl.png` — crispy rice, chicken, avocado, cucumber, miso dressing
- `sweetgreen_guacamole_greens.png` — spring mix, guacamole, tomatoes, tortilla chips
- `sweetgreen_miso_bowl.png` — salmon, wild rice, broccoli, avocado, nori, miso dressing

All saved to `app/public/sprites/` and linked in DB via `sprite_path`.

#### 6. API Update
- `GET /api/restaurant/[id]` now returns `category_name` for each ingredient (joined from `menu_categories`)
- Enables the client UI to group ingredients by Side/Entree/Drink

#### 7. Database Changes
- `template_meals` — added `order_script TEXT` column
- Removed Shroomami from Sweetgreen (3 meals: original, lean, recommendation)
- Added Five Guys restaurant entry

#### 8. Team Consultation: Ordering Clarity
Full team consultation on card UX. Key decisions:
- **Verbal script is the centerpiece** — "Say this at the counter" is more important than ingredient macros
- **Visual-first layout** — food image helps clients decide what they WANT before looking at numbers
- **Always visible ingredients** — no collapsible sections, everything on the card
- **Specificity matters** — scripts must specify modifications (naked tenders, no sauce, half portions)
- **Data accuracy issue identified** — some DB ingredients (e.g., Raising Cane's "Chicken Fingers") don't specify modifications like "naked." Need per-restaurant order script overrides.

### Previous Session (Session 15): Massive Database Expansion + Restaurant Bible + New Skill (2026-03-14)

The database more than doubled this session. 33 spider research files created, 4 new cuisine-type restaurants built, 1 new skill created.

#### 1. Grocery/Snack Database Expansion (+807 items, +356 swaps)

Ran 22 parallel spider research agents across these categories:

**Round 1 (11 agents → 423 items):**
- Nut butters (26) — PB2, PBfit, Naked PB, almond butters, Nutella swaps
- Cheese (46) — string, shredded, sliced, cottage, cream cheese
- Sauces & condiments (58) — BBQ, ketchup, mayo, dressings, syrups, Asian sauces
- Sweeteners (34) — zero-cal granulated, liquid, allulose, SF chocolate chips
- Frozen meals (38) — Healthy Choice, Kevin's, Real Good, Lean Cuisine
- Hot dogs & sausage (23) — turkey dogs, chicken sausage, Bilinski's
- Butter & spreads (35) — light butter, cooking sprays, whipped toppings
- Savory snacks (41) — rice cakes, crackers, chips, popcorn, pretzels
- Frozen pizza/Yasso/granola (46) — Quest, Real Good, Julian Bakery, Yasso bars
- Meat snacks (44) — Carnivore Snax, Chomps, jerky chips, Epic
- Protein powder (36) — whey, casein, plant, collagen, budget brands

**Round 2 (5 agents → 207 items):**
- Eggs & egg products (36) — whole eggs, liquid whites, Egglife wraps, Crepini
- Rice & grain alternatives (38) — cauliflower rice, konjac, RightRice, quinoa
- Ground meat comparisons (34) — 70/30 through 96/4, turkey, chicken, bison
- Costco & Trader Joe's protein finds (47) — store-specific best buys
- Smoothie ingredients (53) — frozen fruit, RTD shakes, greens, mix-ins

**Round 3 (3 agents → 177 items):**
- Dried fruit (55) — traditional, freeze-dried, fruit leather, fresh baselines
- Alcohol (69) — beer, wine, spirits, cocktails, hard seltzer, NA beer
- Cereal & oatmeal (53) — regular + protein cereal, instant + overnight oats
- Bottled coffee (23) — Starbucks, La Colombe, High Brew, Monster Java

**Key trap products identified:**
- SkinnyPop = same fat density as Lay's
- Jif Reduced Fat = same calories, more sugar
- Veggie Straws nearly as fatty as Doritos
- Banana chips are FRIED (520 cal/100g > potato chips)
- Craisins = 29g sugar per 1/3 cup (mostly added)
- Monster Java uses 2-serving labels (120 cal looks like 240)
- Dunkin' Frozen Coffee = 590-750 cal (worse than Starbucks Fraps)

#### 2. New Cuisine-Type Restaurants (+4 restaurants, +177 ingredients, +12 meals)

Built 4 new cuisine-type restaurants with full ingredient databases and original + lean swap meal combos:

| Restaurant | Ingredients | Meals | Source |
|---|---|---|---|
| Chinese Takeout (Generic) | 51 | 4 | USDA/estimated |
| Sushi Restaurant (Generic) | 47 | 4 | USDA/estimated |
| Indian Restaurant (Generic) | 46 | 2 | USDA/estimated |
| Starbucks | 22 | 2 | Official nutrition |

**Key swap highlights:**
- Chinese: General Tso's combo (1,400 cal) → Chicken & Broccoli combo (700 cal)
- Sushi: Specialty roll dinner (1,100 cal) → Sashimi dinner (450 cal)
- Indian: Butter chicken dinner (1,840 cal) → Tandoori dinner (910 cal)
- Starbucks: Caramel Frappuccino (380 cal) → Iced Shaken Espresso (120 cal)

#### 3. New Skill: `/research-spider-food-database`

Unified food category research skill. Takes any category or screenshot, launches parallel agents, finds all brands, verifies nutrition per 100g, flags trap products, bulk-inserts items + swap pairs, and re-embeds ChromaDB.

Usage: `/research-spider-food-database [category or screenshot]`

#### 4. Restaurant Bible Audit

Read all 33 guides from Eamon's Notion Restaurant Bible. Identified 16 cuisine types NOT in our DB. Extracted 34 unique Eamon coaching hacks. Key IP preserved:
- "Cut sushi rolls into 8 pieces instead of 6"
- "Fork-dip" dressing technique
- "Spring roll = fried, Summer roll = not fried"
- "Loin or Round = lean" steak naming rule
- "Toast OR potatoes, never both" brunch rule

Audit file: `research/verified_originals/restaurant_bible_audit.json`

#### 5. Subcategory Fix + New Subcategories

Fixed 14 grocery items with NULL subcategory. Added new subcategories: `frozen_meal` (69), `supplement` (47), `cereal` (62), `frozen_fruit` (22), `sweetener` (36), `spread` (50).

#### 6. Recipe Schema Designed (NOT built yet)

Designed 4-table recipe system: `recipes`, `recipe_ingredients`, `recipe_swaps`, `recipe_tags`. Each ingredient links to `snack_items` for per-ingredient swappability. Spec at `specs/RECIPE_SCHEMA.md`.

### Previous Session (Session 14): Nutrition Verification Audit + Grocery Swap System (2026-03-14)

#### 1. Full Nutrition Verification Audit (478 items)

Audited EVERY item in the snack database — originals AND swaps — for calorie/macro accuracy. 14 parallel research agents web-searched official brand sites, FatSecret, CalorieKing, USDA, and retailer listings.

**Results:**
- 82 originals verified: 56 confirmed, 20 needs_update, 6 serving_mismatch
- 396 swaps verified: 265 confirmed, 41 close, 90 needs_update
- **Total: 478 items audited**

**Critical fixes found:**
- Tostitos Scoops: 280 → 140 cal (data entry 2x error)
- Häagen-Dazs pint: 1070 → ~800 cal (overcounted)
- Talenti CCCD pint: 900 → ~720 cal (overcounted)
- Orville Popcorn bag: 425 → ~595 cal (undercounted)
- Wholly Guacamole Mini: 60 → 120 cal (100% error)
- Protein Pints: claimed 72g protein, actual 30g
- Legendary Foods (16 items): all used net carbs instead of total carbs
- Power Crunch (18 items): systematically undercounted by 10-20 cal
- 3 Halo Top pints: old pre-reformulation data

**Schema change:** Added `verified_*` columns to `snack_items`:
- `verified_serving`, `verified_serving_grams`, `verified_calories`
- `verified_protein_g`, `verified_carbs_g`, `verified_fat_g`, `verified_fiber_g`, `verified_sugar_g`
- `verified_source_url`, `verified_notes`, `verification_status`

**Key design decision:** Lead magnet keeps current `calories` column (bigger numbers = more dramatic savings story). Client ecosystem uses `verified_calories` for accuracy.

**Research files:** `research/verified_originals/` — 6 original JSON files + 8 swap JSON files + audit summary

#### 2. Grocery Swap System (186 grocery items, 50+ swap pairs)

Built a complete grocery swap infrastructure parallel to the snack swap system.

**New skill:** `/lead-magnet-add-grocery-list-swap` — same pattern as snack swap but for grocery items. Includes:
- Brand spider step (mandatory): searches internet for alternative brands in same category
- Per-100g normalization (mandatory): all comparisons normalized to same gram weight
- Daily/weekly/monthly multiplier calculation (grocery items compound daily)
- 12 grocery craving categories

**Schema changes:**
- `item_category TEXT` on `snack_items` — `'snack'` or `'grocery'`
- `item_subcategory TEXT` on `snack_items` — granular category within grocery
- `swap_category TEXT` on `snack_swaps` — `'snack'` or `'grocery'`

**Grocery subcategories populated:**

| Subcategory | Count | Examples |
|---|---|---|
| precooked_protein | 71 | Chicken strips, deli turkey, jerky, protein shakes, yogurt drinks, frozen meals, seaweed, tuna pouches |
| beverage | 26 | Zero-cal sodas, sparkling waters, teas, energy drinks |
| dairy | 18 | Alt milks, Greek yogurts, cheese, sour cream |
| bread_wrap | 17 | Low-cal bagels, bread, tortillas |
| pasta_grain | 14 | Shirataki, protein pasta, pancake mixes |
| creamer | 11 | Zero-sugar creamers across 7 brands |
| condiment | 11 | G Hughes sauces, light ranch, marinades |
| cooking_oil | 2 | Olive oil, spray |
| protein | 2 | Bacon, turkey bacon |

**Spider research files saved:** `research/verified_originals/spider_*.json`
- `spider_alt_milk.json` — 13 alt milk brands
- `spider_ranch_dressings.json` — 12 ranch alternatives
- `spider_creamers.json` — 19 creamer alternatives
- `spider_bagels_bread.json` — 17 bagel/bread alternatives
- `spider_pasta.json` — 11 pasta alternatives
- `spider_tortillas.json` — 12 tortilla alternatives
- `spider_precooked_protein.json` — 22 precooked proteins
- `spider_deli_jerky.json` — 20 deli meats & jerky
- `spider_protein_drinks.json` — 20 protein drinks & shakes
- `spider_zero_cal_beverages.json` — 26 zero-cal beverages
- `spider_yogurt_pancake_frozen.json` — 24 yogurt/pancake/frozen items

**Bulk insert scripts:**
- `research/verified_originals/bulk_insert_grocery.py` — inserts alt milks, ranch, creamers, bagels, bread, pasta, tortillas
- `research/verified_originals/apply_clean.py` — applies verified data to originals
- `research/verified_originals/apply_swaps.py` — applies verified data to swaps

#### 3. Cheesecake Factory SkinnyLicious — Eamon Approved

All 8 Cheesecake Factory SkinnyLicious swap meals changed from `source: 'llm'` to `source: 'eamon'` with verified timestamp.

#### 4. ChromaDB Embeddings Updated

Re-ran `scripts/embed_foods.py` — **1,333 items now embedded** (up from 1,222). All new grocery items searchable via the Food Ecosystem Dashboard's semantic search.

#### 5. New Memory Files

- `memory/feedback_normalize_grams.md` — Always compare food items per 100g, not per serving

### Previous Session (Session 13): Food Ecosystem Dashboard + Builder Mode (2026-03-14)

#### 1. Food Ecosystem Dashboard (`/client/[slug]`)
- Full client-facing personalized food swap dashboard at `bulletproofbody.ai/client/firstname-lastname`
- Cloned snack-bible visual language: dark theme, side-by-side swap cards, animated cumulative impact bar
- **Tab bar**: All | Ordering Out | Snacks | At Home | Dining Out
- **Four item states**: Swap (green), Keep (green check), Open Question (amber), Education (blue info)
- **Reveal Mode** (`?reveal=true`): Shows client's Trainerize photo, their comment, Eamon's analysis. For first-time presentation meetings.
- **Dashboard Mode** (default): Compact cards with "See details" expandable for coach analysis
- Client photo + comment always visible on every card (not hidden behind expand)
- Toggle on/off per item (updates cumulative projection in real time)
- Frequency selector per item (1-7x/week)
- Context-aware action buttons: Approve Swap / Confirm Keep / Convert to Swap / Convert to Keep / Remove
- Unified search across all food types (snacks DB + restaurant meals DB)
- Add panel with search across ALL food types
- Client stats bar (current weight, goal weight, daily calorie target)
- Auto-404 for non-existent profiles (no create button — profiles created by coach only)

#### 2. Builder Mode (in-page)
- "Build" button in header toggles the builder panel (amber theme)
- **Multi-image upload**: drag-and-drop or click, supports multiple images, hero photo selection with green border
- **Coach's instructions to AI**: textarea for Eamon to guide the extraction ("This is Chinese takeout, search Panda Express")
- **"Extract with AI" button**: Sends images + coach prompt to Claude Vision API
  - Auto-fills: food name, client comment, date, calories, macros, serving size, ingredient breakdown, category, why they eat it, coach analysis
  - Searches internal DB for suggested swaps based on Claude's restaurant/food type suggestions
- **Suggested Swap cards**: Clickable cards showing DB matches with calorie savings, "Use This Swap" auto-fills swap fields
- **Four save actions**: Save as Swap / Save as Keep / Save as Open Question / Save as Education
- Session counter tracks items added + running calorie savings
- Clear form for next item

#### 3. AI Extraction API (`/api/ecosystem/extract`)
- POST endpoint accepting images (base64) + optional coach_prompt
- Claude Vision (Sonnet) with rich prompt extracting: food name, comment, date, calories, macros, serving size, ingredients, category, why, coach analysis, suggested restaurant, search terms
- After Claude responds, searches internal DB (template_meals + snack_swaps) for matching swaps
- Returns extraction data + suggested_swaps array with calorie savings computed

#### 4. Ecosystem Database Schema
- `ecosystem_profiles` table: slug (firstname-lastname), stats, zip codes
- `ecosystem_items` table: category, item_state, original/swap nutrition, client_photo_url, client_comment, comment_date, coach_analysis, frequency, toggle state, approval state
- Migration script: `scripts/migrate_ecosystem.py`

#### 5. Ecosystem API Routes (6 endpoints)
- `GET/POST /api/ecosystem` — list/create profiles
- `GET /api/ecosystem/[slug]` — full dashboard data with computed totals
- `POST /api/ecosystem/[slug]/items` — add items (auto-populates from snack_swaps or template_meals)
- `PATCH/DELETE /api/ecosystem/[slug]/items/[itemId]` — update/delete items
- `GET /api/ecosystem/search?q=` — unified search across snack_swaps + template_meals
- `POST /api/ecosystem/extract` — AI-powered image extraction + DB swap search

#### 6. Client Profiles Created (12 active clients)
- All synced with Daily Status Report Google Sheet (source of truth)
- Laurie Bolton status fixed (graduated → active)
- Shubham/Tanatswa full names updated
- MCP `client_list_active()` now cross-references with Google Sheet, flags discrepancies

#### 7. Skill Created
- `/phase-1-client-ecosystem-build [client-name]` — chat-based alternative to the builder UI

#### 8. Spec Documentation
- `PERSONAL_SWAP_DASHBOARD.md` updated with full team consultation (v2, 2026-03-14)
- 14 architectural decisions documented

### Session 12: Snack Bible Massive Flavor Expansion (2026-03-14)

### 1. Snack Bible Massive Flavor Expansion (265 new flavors)

Bulk-researched and inserted 265 new snack flavors across 20+ brands. The Snack Bible went from ~134 swaps to **399 active swaps** and from ~215 items to **480 snack items**.

**Research phase** (5 parallel agents):
- `research/quest_new_flavors.json` — 26 Quest products (chips, puffs, crackers, cookies, frosted, candy, bake shop)
- `research/built_new_flavors.json` — 26 Built Puff flavors (standard + Sour Puff + Chunk lines)
- `research/halotop_new_flavors.json` — 21 Halo Top (18 pint flavors + 3 pops)
- `research/protein_bars_new_flavors.json` — 88 across 7 brands (Barebells 24, ONE 15, Power Crunch 19, FitCrunch 12, No Cow 7, Prime Bites 13, Legendary 13)
- `research/cereal_misc_new_flavors.json` — 81 across 14 brands (Magic Spoon, Catalina Crunch, Three Wishes, Ghost, Premier Protein, Wilde, Twin Peaks, Whisps, PopCorners, SmartSweets, Chomps, Love Corn, HighKey, Olipop)
- `research/finalboss_sour_flavors.json` — 11 Final Boss Sour products

**Bulk insert script**: `research/bulk_insert.py` — reads all 6 JSON files, maps each flavor to appropriate originals (reuses existing originals where possible), auto-computes swap vectors, inserts items + swap pairs. Skipped: 3 Quest Crispy Chips (null calories), 1 Quest Gooey Caramel (discontinued).

### 2. Swap Vectors System (6 Ways a Swap Wins)

New philosophy: swaps aren't just about fewer calories. There are **6 distinct vectors** that make a food swap valuable for a foodie:

| Vector | Rule | Example |
|--------|------|---------|
| `lower_cal` | >= 30 cal savings at same volume | Ben & Jerry's 1100 → Halo Top 290 |
| `higher_protein` | >= 1.5x protein AND +5g absolute | Snyder's 3.6g → Crisp Power 25g |
| `higher_fiber` | >= 3g fiber increase | Regular candy 0g → SmartSweets 6g |
| `slower_eating` | Sour/frozen/cold form factor forces slower consumption | Final Boss Sour, Halo Top pints, frozen bars |
| `less_sugar` | >= 10g sugar reduction | Sour Patch Kids 24g → Final Boss Sour 20g |
| `higher_volume` | >= 20% lower cal/100g density (more food per calorie) | Built Puff 350 cal/100g vs Cosmic Brownie 583 cal/100g |

**Core insight**: "A foodie doesn't think about calories — they think about the EXPERIENCE of eating and they want that experience to last LONGER." Two paths: eat slower (form factor) or eat more (volume).

**Schema change**: Added `swap_vectors TEXT DEFAULT ''` column to `snack_swaps` table. Comma-separated tags (e.g., `lower_cal,higher_protein,higher_fiber,less_sugar,higher_volume`). A swap can have multiple vectors. Any single vector is sufficient to validate a swap.

**Auto-computation**: `higher_volume` is computed by parsing gram weights from serving size strings, normalizing to cal/100g, and comparing densities. All other vectors computed from macro deltas. `slower_eating` tagged for sour candy (Final Boss Sour, SmartSweets) and frozen treats (Halo Top, ice cream bars).

**Retroactive tagging**: All 134 pre-existing swaps were tagged with vectors via a Python script. 10 sour/candy swaps retroactively got `slower_eating`.

### 3. Validation Rules Updated

The `/lead-magnet-add-snack-swap` skill file was updated:
- Accepts ANY of the 6 vectors as sufficient validation (not just calorie savings)
- Added `slower_eating` and `higher_volume` definitions with thresholds
- Added requirement to always set `swap_vectors` column on insert
- Added autonomous research instruction: "Do ALL macro research autonomously — do NOT ask Eamon for permission to visit nutrition sites"

### 4. New Memory Files

- `memory/project_swap_vectors.md` — Full 6-vector philosophy with examples and core insight
- `memory/feedback_no_permission_web_research.md` — Never ask permission for web research during macro lookups

### Session 11: Food Ecosystem Dashboard v1

### 1. Food Ecosystem Dashboard (`/client/[slug]`)
- Full client-facing personalized food swap dashboard at `bulletproofbody.ai/client/firstname-lastname`
- Cloned snack-bible visual language: dark theme, side-by-side swap cards, animated cumulative impact bar
- **Tab bar**: All | Ordering Out | Snacks | At Home | Dining Out
- **Four item states**: Swap (green), Keep (green check), Open Question (amber), Education (blue info)
- **Reveal Mode** (`?reveal=true`): Shows client's Trainerize photo, their comment, Eamon's analysis, then the swap. For first-time presentation meetings.
- **Dashboard Mode** (default): Compact cards with "See details" expandable for reveal context
- Toggle on/off per item (updates cumulative projection in real time)
- Frequency selector per item (1-7x/week)
- Approve button per item (for post-meeting confirmation)
- Unified search across ecosystem items
- Add panel with search across ALL food types (snacks DB + restaurant meals DB)
- Client stats bar (current weight, goal weight, daily calorie target)
- Auto-create profile on first visit

### 2. Ecosystem Database Schema
- `ecosystem_profiles` table: slug (firstname-lastname), stats, zip codes for location features
- `ecosystem_items` table: category, item_state, original/swap nutrition, client_photo_url, client_comment, comment_date, coach_analysis, frequency, toggle state, approval state
- Migration script: `scripts/migrate_ecosystem.py`

### 3. Ecosystem API Routes (5 endpoints)
- `GET/POST /api/ecosystem` — list/create profiles
- `GET /api/ecosystem/[slug]` — full dashboard data with computed totals
- `POST /api/ecosystem/[slug]/items` — add items (auto-populates from snack_swaps or template_meals if linked)
- `PATCH/DELETE /api/ecosystem/[slug]/items/[itemId]` — update/delete items
- `GET /api/ecosystem/search?q=` — unified search across snack_swaps + template_meals

### 4. Spec Documentation Updated
- `PERSONAL_SWAP_DASHBOARD.md` updated with full team consultation (v2, 2026-03-14)
- 14 architectural decisions documented: tab naming, item states, two-pass workflow, reveal/dashboard modes, grocery/snack overlap rules, location phase plan

## Previous Session (Session 10)

### 1. Snack Bible Demo UX Overhaul
- Changed "Same taste" → "Same craving" across all snack bible pages (demo, landing, OG image, layout metadata)
- Removed dashboard from demo flow entirely — demo now loops back to snack grid
- Removed "Skip tutorial" and "Skip — show me the full dashboard" buttons
- "Keep exploring swaps" now calls `advanceToDashboard()` → saves completed snack to localStorage → redirects to `/snacks?pick=1&stacked=1`
- Bare URL visits to `/snack-bible-demo` redirect to `/snacks?pick=1`

### 2. Snack Bible Landing Page Updates (`/snacks`)
- Updated headline: "Pick your guilty pleasure." with subtext "We'll show you how to lose weight without giving it up."
- CTA button: "Show me how." with "Takes 60 seconds." as subtext below
- Added shine animation to CTA button (linear gradient sweep, 1.5s duration, 4s repeat delay)
- Added `?pick=1` URL param to skip hero and show grid directly
- Added `?stacked=1` URL param to trigger stack encouragement tooltip

### 3. Stack Encouragement + Progress Tracking
- `StackTooltip` component (matching fast food bible `TooltipCallout` pattern): "Nice — now pick a different snack. Same game, bigger savings."
- `SnackProgressBanner` showing completed swap count + total calories saved
- Green checkmark overlay + emerald border on completed snacks in grid
- `CompletedSnack` interface + localStorage persistence (`bb_completed_snacks`)
- Fixed scroll-to-top race condition with `requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }))`
- Fixed content vertically centering off-screen: changed from `items-center` to `items-start pt-16`

### 4. Route Renaming
- `/snack-bible-landing` → `/snacks`
- `/bible` → `/takeout`
- Updated all internal references across 8 files: page.tsx, snack-bible-demo/page.tsx, start/page.tsx, snacks/layout.tsx, takeout/layout.tsx, jumper/page.tsx, experiments/dark-landing/page.tsx, concierge-full/page.tsx, directory/page.tsx
- OG/meta URLs updated to match new routes

### 5. Deployed to Render (3 deploys)
- Deploy 1: Core demo UX changes (Same craving, remove dashboard, loop back to grid)
- Deploy 2: Stack tooltip + meta description fixes
- Deploy 3: Progress banner + checkmarks on snack grid

## Previous Sessions

### Session 9: Concierge Page Redesign
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

### Restaurant Bible Cuisines (IN PROGRESS — 4 agents running)
1. **Thai food** — spider running, ~40-50 dishes
2. **Vietnamese / Pho** — spider running, ~35-45 dishes
3. **Italian (generic)** — spider running, ~40-50 dishes
4. **Mexican (sit-down) + Steakhouse** — spider running, ~55-65 dishes combined
5. **Still to build:** Afghan, Banh Mi, Dim Sum, Hibachi, Japanese, Korean BBQ, Lebanese, Mediterranean, Middle Eastern, Pizza (generic), P.F. Chang's, Salad, Seafood, Sichuan, American Brunch, Sports Bar/Wings

### Recipe System
6. **Recipe schema designed but NOT migrated** — 4 tables (recipes, recipe_ingredients, recipe_swaps, recipe_tags). Spec at `specs/RECIPE_SCHEMA.md`. Need to run migration and build first recipes.
7. **Recipe Builder UI** — search ingredients from 1,452-item DB, set quantities, auto-compute macros, AI suggests per-ingredient swaps

### Phase 2: Ecosystem Dashboard
8. **Interactive Ingredient Breakdown Builder** — Reuse SwapRevealScreen for side-by-side breakdown
9. **Sequential Guided Reveal** — Slide-deck mode for first-time client meetings
10. **Location-based restaurant finder** — Google Maps API, zip code input
11. **Trainerize auto-sync** — Pull food photos directly from Trainerize API
12. **Client login/auth** — Beyond URL-as-credential

### Snack Bible / General
13. **Snack Bible UI doesn't show swap_vectors yet** — DB has all vectors tagged, but the frontend doesn't display badges/icons
14. **Product images for 800+ new items** — None of the new session 15 items have `image_path` set
15. **Deploy to Render** — Session 15 data is local only. Needs push + deploy to go live
16. **Resend API key** not configured — emails save to `leads` table but don't send
17. **Chipotle chicken tacos swap** saves ~0 cal — needs rework or removal

### Grocery System
18. **Grocery items need a browse/search UI** — 845 grocery items in DB but no frontend page
19. **90 swap items flagged "needs_update"** — verified_calories differ from DB calories
20. **Grocery items need product images** — No sprites/photos for grocery items

### Restaurant Coaching Hacks
21. **Eamon's Restaurant Bible hacks not stored in DB** — 34 unique coaching tips (8-piece sushi cut, fork-dip, loin=lean, etc.) need a structured home. Consider a `coaching_tips` table or embedding in restaurant notes.

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
| `/client/[slug]` | Food Ecosystem Dashboard — personalized per client (e.g. `/client/arman-zaheery`) |
| `/concierge` | Concierge landing page (transformation grid + testimonials + CTAs → Calendly) |
| `/concierge/book` | Calendly embed page (dark theme) |
| `/concierge-full` | Detailed landing page with full sales copy |
| `/experiments/dark-landing` | Lead Magnet (gamified swap experience) |
| `/takeout` | Fast Food Bible (search-first reference tool) — was `/bible` |
| `/snacks` | Snack Bible Landing (hero + brand grid + demo entry) — was `/snack-bible-landing` |
| `/snack-bible` | Snack Bible (side-by-side snack swaps, client tool) |
| `/snack-bible-demo` | Snack Bible demo/generating screen |
| `/grocery-bible` | Grocery Store Bible (home-food decision layer) |
| `/grocery-order-optimizer` | Grocery Order Optimizer (cart-level replacement layer) |
| `/restaurant-bible` | Restaurant Bible (wild-west spec and rules surface) |

## Database Schema (Current)

```
snack_items (~1,452 items — originals + swaps, snack + grocery)
  └── id, name, brand, serving, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g
  └── image_path, source_url, research_notes, verified_at
  └── item_category ('snack' | 'grocery')
  └── item_subcategory (15 categories — see Database Stats)
  └── verified_* columns for client-facing accuracy

snack_swaps (~810 active swap pairs — snack + grocery)
  └── id, title, context, craving, rationale
  └── original_snack_id → snack_items, swap_snack_id → snack_items
  └── swap_vectors (lower_cal,higher_protein,higher_fiber,slower_eating,less_sugar,higher_volume)
  └── swap_category ('snack' | 'grocery')

restaurants (54 restaurants — 50 chains + 4 cuisine types)
  └── menu_categories, restaurant_containers
  └── ingredients (1,863 total — chains have official data, cuisine types have USDA estimates)
  └── template_meals (700 total, source='eamon' or 'llm')
  │     └── template_meal_ingredients
  └── New cuisine types: chinese_takeout, sushi, indian, starbucks

ecosystem_profiles (client dashboards)
  └── id, slug (firstname-lastname), display_name, current_weight, goal_weight
  └── daily_calorie_target, zip_code, created_at, updated_at

ecosystem_items (per-client food items)
  └── id, profile_id → ecosystem_profiles, category (ordering_out|snacks|at_home|dining_out)
  └── item_state (swap|keep|open_question|education)
  └── original_name, original_calories, original_protein, original_carbs, original_fat
  └── swap_name, swap_calories, swap_protein, swap_carbs, swap_fat
  └── client_photo_url, client_comment, comment_date, coach_analysis
  └── frequency (1-7), is_toggled_on, approval_state
  └── snack_swap_id, template_meal_id (links to source DBs)

leads (email captures)
```

## Database Stats

- **1,452 total items** in `snack_items` (845 grocery + 607 snack)
- **810 active swap pairs** in `snack_swaps`
- **54 restaurants** with **1,863 ingredients** and **700 template meals**
- **2,157 items embedded** in ChromaDB for semantic search
- **15 grocery subcategories**: beverage (122), precooked_protein (97), dairy (97), condiment (74), protein (70), frozen_meal (69), cereal (62), pasta_grain (55), spread (50), supplement (47), sweetener (36), bread_wrap (23), frozen_fruit (22), creamer (11), cooking_oil (10)
- **33 spider research files** in `research/verified_originals/`
- **1 new skill**: `/research-spider-food-database`

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
- Fast Food Bible: http://localhost:3456/takeout
- Snack Bible: http://localhost:3456/snack-bible
- Grocery Store Bible: http://localhost:3456/grocery-bible
- Grocery Order Optimizer: http://localhost:3456/grocery-order-optimizer
- Restaurant Bible: http://localhost:3456/restaurant-bible

## Key Files

- `app/src/app/page.tsx` — Directory page
- `app/src/app/takeout/page.tsx` — Fast Food Bible (~580 lines)
- `app/src/app/experiments/dark-landing/page.tsx` — Lead Magnet (~2100 lines)
- `app/src/app/api/restaurant/[id]/route.ts` — Restaurant data API
- `app/src/app/api/restaurants/route.ts` — Restaurant list API
- `app/src/app/api/send-swap-plan/route.ts` — Email capture API
- `bulletproof_body.db` — All data
- `app/public/sprites/` — 26 sprite images (9 Chipotle + 15 CAVA + 1 Chipotle hero + 1 Panda hero)
- `assets/sprites/` + `assets/references/` — Source assets
