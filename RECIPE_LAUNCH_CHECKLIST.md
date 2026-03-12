# Recipe Launch Checklist

> Everything needed to go from idea to shareable recipe link.
> Use this every time you add a new recipe to `/recipe`.

---

## From Eamon (Required Inputs)

### The Basics
- [ ] **Recipe name** (e.g., "French Toast")
- [ ] **Category** (breakfast / lunch / dinner / snack)
- [ ] **Recipe ID slug** (e.g., `french_toast` — lowercase, underscores, used in URLs)

### Visual Assets
- [ ] **Food photo (sprite)** — Your photo of the actual meal. Save to `public/recipes/{id}.jpg`
  - Used on: grid card, left box (Normal Recipe), right box (Optimized Recipe)
- [ ] **OG thumbnail** — YouTube-style thumbnail (find online or screenshot a good one). Save to `public/recipes/og/{id}.png`
  - Used for: Instagram DM link previews, iMessage previews, Twitter cards
  - Should NOT repeat the title text — the image is the visual hook, the title text answers it
- [ ] **Recipe video URL** — Instagram reel or YouTube video showing how to make it (yours or someone else's)
  - Hyperlinked in the email as "Watch me make it step by step →"

### Original Recipe (the "normal" version)
For each ingredient (in order):
- [ ] Ingredient name (e.g., "White Bread")
- [ ] Quantity / serving size (e.g., "4 slices / 120g")
- [ ] Calories
- [ ] Protein (g)
- [ ] Fat (g)
- [ ] Carbs (g)

### Optimized Recipe (your swap version)
For each ingredient (paired 1:1 with the original above):
- [ ] Ingredient name (e.g., "Butterbread Nature's Own")
- [ ] **Brand name** (e.g., "Nature's Own" — needed for Instacart shopping links)
- [ ] Quantity / serving size
- [ ] Calories
- [ ] Protein (g)
- [ ] Fat (g)
- [ ] Carbs (g)

> **Pairing matters.** Original ingredient #1 swaps with Optimized ingredient #1, etc. The email shows them side by side.

---

## System Generates Automatically

| What | How |
|------|-----|
| OG metadata (title + description) | Dynamic from DB — "Your High Protein, Low Calorie {Name} Recipe" |
| OG thumbnail | Serves static image from `og_image` column, falls back to generated |
| Email with combined comparison table | Original → Swap → Savings per row |
| Instacart "Shop" links per ingredient | From swap ingredient brand name |
| "Order all on Instacart" CTA | Aggregated shopping link |
| "Watch me make it" video link | From `video_url` column |
| Calorie savings math | origCal - swapCal |
| Fat loss projection | From user's weight/goal input on the page |
| Deep link URL | `/recipe?id={slug}` |
| Lead notification | Sent to eamon@eamonian.com |

---

## Database Setup

After collecting all inputs, add to `bulletproof_body.db`:

```sql
-- 1. Add the recipe
INSERT INTO recipes (id, name, category, image_url, video_url, og_image)
VALUES ('{id}', '{Name}', '{category}', '/recipes/{id}.jpg', '{video_url}', '/recipes/og/{id}.png');

-- 2. Add original ingredients (is_swap = 0)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, calories, protein_g, fat_g, carbs_g, is_swap, display_order)
VALUES ('{id}', '{name}', '{qty}', {cal}, {protein}, {fat}, {carbs}, 0, 1);
-- ... repeat for each original ingredient

-- 3. Add swap ingredients (is_swap = 1, same display_order as their pair)
INSERT INTO recipe_ingredients (recipe_id, name, quantity, calories, protein_g, fat_g, carbs_g, is_swap, display_order)
VALUES ('{id}', '{name}', '{qty}', {cal}, {protein}, {fat}, {carbs}, 1, 1);
-- ... repeat for each swap ingredient
```

---

## Verification Before Launch

- [ ] Load `/recipe?id={slug}` — grid shows recipe with sprite
- [ ] Click recipe — reveal shows both boxes with correct ingredients + calories
- [ ] Numbers match: total original cal, total swap cal, savings, protein
- [ ] Submit test email — check combined table renders correctly
- [ ] Instacart links work for each swap ingredient
- [ ] Video link in email opens the correct Instagram/YouTube video
- [ ] Curl `/api/og/recipe?id={slug}` — OG thumbnail serves the static image
- [ ] Share link in a test DM — preview card shows thumbnail + title + description

---

## File Locations

| File | Purpose |
|------|---------|
| `public/recipes/{id}.jpg` | Food photo sprite |
| `public/recipes/og/{id}.png` | OG thumbnail for link previews |
| `bulletproof_body.db` | Recipe + ingredient data |
| `src/app/recipe/RecipeClient.tsx` | Recipe UI (grid + reveal) |
| `src/app/recipe/page.tsx` | Server metadata (generateMetadata) |
| `src/app/api/og/recipe/route.tsx` | OG image route (static → fallback) |
| `src/app/api/send-swap-plan/route.ts` | Email template (buildRecipeEmailHtml) |
| `src/app/api/recipes/[id]/route.ts` | Recipe detail API |
