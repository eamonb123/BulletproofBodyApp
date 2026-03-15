# Recipe Schema Design

## Why Recipes Are Separate

Products (snack_items) have fixed nutrition labels. Restaurant meals (template_meals) have fixed menus. **Recipes are variable** — ingredients can be swapped, portions adjusted, cooking methods changed. A recipe is a *composition* of grocery items.

The power move: every ingredient in a recipe links back to `snack_items`, so the swap engine can suggest alternatives at the ingredient level. "Your recipe uses 2 tbsp regular PB (190 cal) — swap to PB2 (60 cal) and save 130 cal without changing anything else."

## Schema

```sql
-- ============================================================
-- RECIPES — Complete meals you make at home
-- ============================================================
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,                    -- kebab-case: high-protein-chocolate-shake
    name TEXT NOT NULL,                     -- "High Protein Chocolate Shake"
    description TEXT,                       -- "5-minute shake that tastes like a milkshake"

    -- Classification
    category TEXT NOT NULL,                 -- breakfast, lunch, dinner, snack, dessert, shake, side
    cuisine TEXT,                           -- american, mexican, asian, mediterranean, etc.

    -- Computed totals (recalculated when ingredients change)
    total_calories REAL DEFAULT 0,
    total_protein_g REAL DEFAULT 0,
    total_carbs_g REAL DEFAULT 0,
    total_fat_g REAL DEFAULT 0,
    total_fiber_g REAL DEFAULT 0,
    total_sugar_g REAL DEFAULT 0,

    -- Serving info
    servings INTEGER DEFAULT 1,            -- recipe makes N servings
    per_serving_calories REAL DEFAULT 0,   -- total_calories / servings
    per_serving_protein_g REAL DEFAULT 0,

    -- Metadata
    prep_time_min INTEGER,                 -- minutes to prep
    cook_time_min INTEGER,                 -- minutes to cook
    total_time_min INTEGER,                -- prep + cook
    difficulty TEXT DEFAULT 'easy',        -- easy, medium, hard

    -- Source / attribution
    source TEXT DEFAULT 'eamon',           -- eamon, competitor, community
    source_url TEXT,                       -- original reel/post/video URL
    source_creator TEXT,                   -- @jakecalorie, @cookingforgains_, etc.

    -- Content potential
    is_reel_worthy BOOLEAN DEFAULT 0,      -- flagged for content creation
    reel_hook TEXT,                         -- e.g. "88 CALORIE SOUFFLE"
    content_angle TEXT,                     -- authority, aligned, authentic

    -- Status
    is_active BOOLEAN DEFAULT 1,
    verified_at TIMESTAMP,                 -- Eamon tested it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- RECIPE INGREDIENTS — Links recipes to grocery items
-- ============================================================
CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

    -- The ingredient (links to snack_items for swappable items)
    snack_item_id TEXT REFERENCES snack_items(id),  -- NULL if generic/unlisted
    ingredient_name TEXT NOT NULL,                    -- display name: "unsweetened almond milk"

    -- Quantity
    quantity REAL NOT NULL,                -- e.g. 1.0, 0.5, 2.0
    unit TEXT NOT NULL,                    -- cup, tbsp, oz, g, scoop, whole, piece
    quantity_grams REAL,                   -- normalized gram weight (for macro calc)

    -- Macros for THIS quantity (pre-computed from snack_items or manual)
    calories REAL DEFAULT 0,
    protein_g REAL DEFAULT 0,
    carbs_g REAL DEFAULT 0,
    fat_g REAL DEFAULT 0,
    fiber_g REAL DEFAULT 0,
    sugar_g REAL DEFAULT 0,

    -- Swap metadata
    is_swappable BOOLEAN DEFAULT 1,        -- can this ingredient be swapped?
    swap_category TEXT,                    -- what category to search for alternatives
    is_optional BOOLEAN DEFAULT 0,         -- can be removed entirely

    -- Ordering
    display_order INTEGER DEFAULT 0,

    UNIQUE(recipe_id, ingredient_name)
);

-- ============================================================
-- RECIPE SWAPS — Alternative versions of a recipe
-- ============================================================
CREATE TABLE recipe_swaps (
    id TEXT PRIMARY KEY,
    original_recipe_id TEXT NOT NULL REFERENCES recipes(id),
    swap_recipe_id TEXT NOT NULL REFERENCES recipes(id),

    -- What changed
    swap_description TEXT,                 -- "Replace PB with PB2, use almond milk instead of whole"
    calorie_savings REAL,                  -- total cal saved
    protein_change REAL,                   -- protein delta (+/-)

    -- Swap vectors (same as snack_swaps)
    swap_vectors TEXT DEFAULT '',           -- lower_cal, higher_protein, etc.

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(original_recipe_id, swap_recipe_id)
);

-- ============================================================
-- RECIPE TAGS — Flexible tagging for filtering
-- ============================================================
CREATE TABLE recipe_tags (
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,                      -- high-protein, under-300-cal, 5-min, no-cook, meal-prep, one-pan
    PRIMARY KEY (recipe_id, tag)
);

-- Indexes
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_snack ON recipe_ingredients(snack_item_id);
CREATE INDEX idx_recipe_swaps_original ON recipe_swaps(original_recipe_id);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag);
```

## How It Connects to Existing Tables

```
snack_items (1,275 products)
    ↑ snack_item_id
recipe_ingredients ←→ recipes
    ↓
recipe_swaps (original → lean version)
    ↓
recipe_tags (filtering)
```

**Key relationship:** `recipe_ingredients.snack_item_id` links to `snack_items.id`. This means:
- When a recipe uses "Fairlife Skim Milk", it links to the Fairlife entry in snack_items
- The swap engine can suggest: "Replace with unsweetened almond milk (30 cal vs 80 cal)"
- All 1,275 grocery/snack items become potential recipe ingredients

## Recipe Categories

| Category | Examples |
|---|---|
| `breakfast` | Egg white omelette, protein pancakes, overnight oats |
| `lunch` | Turkey lettuce wraps, chicken rice bowl |
| `dinner` | Ground turkey tacos, salmon + cauliflower rice |
| `shake` | Protein shake, smoothie bowl |
| `snack` | Protein mug cake, Greek yogurt parfait |
| `dessert` | Protein souffle, anabolic ice cream |
| `side` | Cauliflower mash, roasted veggies |

## Recipe Tags

| Tag | Meaning |
|---|---|
| `high-protein` | 30g+ protein per serving |
| `under-300-cal` | Under 300 cal per serving |
| `under-500-cal` | Under 500 cal per serving |
| `5-min` | Total time under 5 minutes |
| `no-cook` | No cooking required |
| `one-pan` | One pan/pot cleanup |
| `meal-prep` | Stores well for 3-5 days |
| `budget` | Under $3 per serving |
| `viral` | Based on a viral reel/video |
| `anabolic` | High protein, low cal (Greg Doucette style) |

## Example: High Protein Chocolate Shake

```
Recipe: high-protein-chocolate-shake
  Category: shake
  Total: 280 cal | 42g protein | 20g carbs | 4g fat
  Servings: 1
  Prep: 3 min | Cook: 0 min
  Tags: high-protein, under-300-cal, 5-min, no-cook

Ingredients:
  1 scoop   Dymatize ISO 100 Chocolate    → snack_item_id: dymatize-iso-100-gourmet-chocolate
             120 cal | 25g protein
  1 cup     Fairlife Skim Milk             → snack_item_id: fairlife-skim-milk
             80 cal | 13g protein
  1 cup     Ice                            → (no snack_item_id, 0 cal)
             0 cal
  1 tbsp    PB2 Powdered Peanut Butter     → snack_item_id: pb2-original-powdered-peanut-butter
             25 cal | 3g protein
  0.5 cup   Frozen Strawberries            → snack_item_id: dole-frozen-whole-strawberries
             25 cal | 0g protein
  1 tbsp    Chia Seeds                     → snack_item_id: generic-chia-seeds
             30 cal | 1g protein

Swap version: high-protein-chocolate-shake-lean
  Replace Fairlife with unsweetened almond milk → saves 50 cal
  Drop chia seeds → saves 30 cal
  New total: 200 cal | 38g protein
  Vectors: lower_cal
```

## Content Angle

Every recipe is potential reel content. The schema tracks:
- `source_url` — where the idea came from (competitor reel)
- `source_creator` — who made the original
- `is_reel_worthy` — flag for content calendar
- `reel_hook` — the hook text ("88 CALORIE SOUFFLE")
- `content_angle` — authority (I teach), aligned (I mirror your struggle), authentic (this is me)

## Migration Script

```python
# scripts/migrate_recipes.py
# Run after approval to create the tables
```

## Future: Recipe Builder UI

Similar to the Ecosystem Dashboard builder:
1. Search ingredients from snack_items DB (1,275 products)
2. Set quantities and units
3. Auto-compute total macros
4. AI suggests swaps per ingredient
5. Save original + lean version as a swap pair
6. Flag for content if calorie savings are dramatic
