# Bulletproof Body — Data Schema Rules

> Source of truth for where food items belong. Read this before inserting data.

## The Four Data Domains

| Domain | Table | What Goes Here | Examples |
|--------|-------|----------------|----------|
| **Takeout/Restaurant** | `food_items` + `food_swaps` | Complete meals from restaurants (FDA-labeled chains + wild west) | Chipotle bowl, CAVA grain bowl, Whole Foods family tray |
| **Snacks** | `snack_items` (where `item_category='snack'`) + `snack_swaps` (where `swap_category='snack'`) | Grab-and-go packaged items eaten between meals | Protein bars, chips, candy, cookies, ice cream bars, jerky, gummies, popcorn |
| **Grocery** | `snack_items` (where `item_category='grocery'`) + `snack_swaps` (where `swap_category='grocery'`) | Household staples bought at a grocery store | Frozen meals, raw protein, dairy, condiments, bread, pasta, cereal, creamers |
| **Client Ecosystems** | `ecosystem_items` | Per-client personalized swaps (linked to `ecosystem_profiles`) | Built during coaching from snack_items + food_items data |

### Why grocery items live in `snack_items`

Historical — the snack table was built first and grocery categories were added via `item_category` and `item_subcategory` columns. The data is correctly tagged. Use the views for clean access:

```sql
SELECT * FROM grocery_items_view;   -- All grocery items
SELECT * FROM snack_only_view;      -- Only actual snacks
```

## Required Fields for `snack_items` INSERT

| Field | Required | Rules |
|-------|----------|-------|
| `item_category` | **YES** | Must be `'snack'` or `'grocery'`. Enforced by trigger. |
| `item_subcategory` | **YES for grocery** | Must be set when `item_category='grocery'`. Enforced by trigger. Can be empty for snacks. |

### Valid `item_subcategory` Values (for grocery)

| Subcategory | What Goes Here | Examples |
|-------------|----------------|----------|
| `frozen_meal` | Complete frozen meals you heat and eat | Lean Cuisine, Healthy Choice, Hot Pockets, frozen pizza, frozen burritos |
| `protein` | Raw/uncooked protein you cook | Ground turkey, chicken breast, salmon fillets, burger patties |
| `precooked_protein` | Ready-to-eat protein, no cooking | Rotisserie chicken, deli turkey, pre-cooked strips, canned tuna |
| `dairy` | Milk, yogurt, cheese, sour cream | Greek yogurt, cottage cheese, string cheese, milk alternatives |
| `condiment` | Sauces, dressings, marinades | Ranch, BBQ sauce, mayo, mustard, teriyaki |
| `beverage` | Drinks (not dairy) | Soda alternatives, protein shakes, energy drinks, Olipop |
| `cereal` | Breakfast cereal | Magic Spoon, Catalina Crunch, regular cereal |
| `pasta_grain` | Pasta, rice, grains, cauliflower rice | Banza, shirataki, riced cauliflower |
| `spread` | Peanut butter, jam, cream cheese | PBfit, sugar-free jam, light cream cheese |
| `bread_wrap` | Bread, bagels, tortillas, wraps | ROYO bread, low-carb tortillas, bagel thins |
| `sweetener` | Sugar, honey, syrup alternatives | Monk fruit, stevia, sugar-free syrup |
| `supplement` | Protein powder, greens, collagen | Whey isolate, creatine, fiber powder |
| `frozen_fruit` | Frozen fruit and smoothie packs | Frozen berries, acai packs, smoothie blends |
| `fresh_fruit` | Fresh whole fruit (baseline comparisons) | Fresh bananas, apples, berries |
| `creamer` | Coffee creamers | Nutpods, Califia, International Delight |
| `cooking_oil` | Oils and cooking sprays | Olive oil spray, avocado oil |

## Quick Decision Tree

```
Is it a complete meal from a restaurant/chain?
  → food_items table (category='takeout')

Is it a grab-and-go packaged snack eaten between meals?
  → snack_items (item_category='snack')

Is it a complete frozen meal you heat and eat at home?
  → snack_items (item_category='grocery', item_subcategory='frozen_meal')

Is it a raw ingredient you cook with at home?
  → snack_items (item_category='grocery', item_subcategory=[protein|pasta_grain|cooking_oil|etc])

Is it a household staple (condiment, dairy, bread, cereal)?
  → snack_items (item_category='grocery', item_subcategory=[appropriate value])
```

## `snack_swaps` Category Rules

| Field | Rules |
|-------|-------|
| `swap_category` | Must be `'snack'` or `'grocery'`. Enforced by trigger. Must match the `item_category` of both the original and swap items. |

## Database Triggers (Enforced)

4 validation triggers exist on `snack_items` and `snack_swaps`:

1. `validate_snack_item_category_insert` — Rejects INSERT if `item_category` not in ('snack', 'grocery')
2. `validate_snack_item_category_update` — Rejects UPDATE if `item_category` not in ('snack', 'grocery')
3. `validate_snack_item_subcategory_insert` — Rejects INSERT if `item_category='grocery'` and `item_subcategory` is empty
4. `validate_swap_category_insert` — Rejects INSERT if `swap_category` not in ('snack', 'grocery')

## After Any Insert

Always re-run embeddings:
```bash
cd /Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp
python3 scripts/embed_foods.py
```
