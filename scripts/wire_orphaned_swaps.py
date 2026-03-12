"""
Wire up orphaned Eamon-approved swaps using Claude to match ingredients.

For each orphaned swap:
1. Send the swap name + all available ingredients to Claude
2. Claude returns the best ingredient matches with quantities
3. Insert template_meal_ingredients rows

Run: python3 scripts/wire_orphaned_swaps.py [--dry-run] [--limit N]
"""
import sqlite3
import json
import sys
import os
import time
import anthropic

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "bulletproof_body.db")
DRY_RUN = "--dry-run" in sys.argv
LIMIT = None
for i, arg in enumerate(sys.argv):
    if arg == "--limit" and i + 1 < len(sys.argv):
        LIMIT = int(sys.argv[i + 1])

client = anthropic.Anthropic()

def match_ingredients_with_llm(swap_name: str, restaurant_name: str, ingredients: list[dict]) -> list[dict]:
    """Use Claude to match swap description to actual DB ingredients."""
    ing_list = "\n".join(
        f"- id: {ing['id']} | name: {ing['name']} | {ing['calories']:.0f} cal | {ing['protein_g']:.0f}g protein"
        for ing in ingredients
    )

    prompt = f"""You are matching a restaurant menu swap description to actual ingredients in our database.

Restaurant: {restaurant_name}

Swap description: "{swap_name}"

Available ingredients in our database:
{ing_list}

Your job: Figure out which database ingredients make up this swap meal. Return a JSON array of objects, each with:
- "ingredient_id": the exact id from the database
- "quantity": how many servings (default 1.0, use 0.5 for "half", 2.0 for "double", etc.)
- "reasoning": brief note on why this matches

Rules:
- Only use ingredients that exist in the database list above
- If the swap says "no X" or "remove X", do NOT include that ingredient
- If an item in the swap has no close match in the database, skip it (e.g. "light vinaigrette" with no vinaigrette in DB)
- For "lettuce wrapped" or "no bun", just skip the bun ingredient
- Quantity modifiers: "double" = 2.0, "half"/"1/2" = 0.5, "5ct"/"5 count" = quantity based on what the DB portion is
- If the swap says "Instead of X → Y", only match the Y part (the recommended swap, not the original)
- Diet drinks = 0 cal, match to diet version if available
- Be conservative — only match ingredients you're confident about

Return ONLY valid JSON array, no markdown, no explanation."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        matches = json.loads(text)
        if not isinstance(matches, list):
            return []
        return matches
    except json.JSONDecodeError:
        print(f"    LLM returned invalid JSON: {text[:200]}")
        return []


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get all orphaned Eamon swaps
    query = """
        SELECT sw.id, sw.name, sw.meal_type, sw.swap_for, sw.restaurant_id,
               r.name as restaurant_name
        FROM template_meals sw
        JOIN restaurants r ON r.id = sw.restaurant_id
        WHERE sw.is_swap = 1 AND sw.source = 'eamon'
          AND (SELECT COUNT(*) FROM template_meal_ingredients WHERE template_meal_id = sw.id) = 0
        ORDER BY r.name, sw.name
    """
    if LIMIT:
        query += f" LIMIT {LIMIT}"
    orphaned = cur.execute(query).fetchall()

    print(f"Found {len(orphaned)} orphaned Eamon swaps to wire up\n")

    # Cache ingredients per restaurant
    ing_cache: dict[str, list[dict]] = {}
    def get_ingredients(restaurant_id: str) -> list[dict]:
        if restaurant_id not in ing_cache:
            rows = cur.execute(
                "SELECT id, name, calories, protein_g, category_id FROM ingredients WHERE restaurant_id = ?",
                (restaurant_id,)
            ).fetchall()
            ing_cache[restaurant_id] = [dict(r) for r in rows]
        return ing_cache[restaurant_id]

    # Valid ingredient IDs per restaurant (for validation)
    valid_ids_cache: dict[str, set] = {}
    def get_valid_ids(restaurant_id: str) -> set:
        if restaurant_id not in valid_ids_cache:
            valid_ids_cache[restaurant_id] = {ing["id"] for ing in get_ingredients(restaurant_id)}
        return valid_ids_cache[restaurant_id]

    wired = 0
    failed = 0
    total_ingredients_added = 0

    for i, swap in enumerate(orphaned):
        swap_id = swap["id"]
        swap_name = swap["name"]
        restaurant_id = swap["restaurant_id"]
        restaurant_name = swap["restaurant_name"]

        ingredients = get_ingredients(restaurant_id)
        if not ingredients:
            print(f"  SKIP {restaurant_name}: No ingredients in DB")
            failed += 1
            continue

        print(f"[{i+1}/{len(orphaned)}] [{restaurant_name}] {swap_name}")

        # Call Claude to match ingredients
        matches = match_ingredients_with_llm(swap_name, restaurant_name, ingredients)

        if not matches:
            print(f"    FAIL — no matches returned")
            failed += 1
            continue

        # Validate ingredient IDs
        valid_ids = get_valid_ids(restaurant_id)
        valid_matches = [m for m in matches if m.get("ingredient_id") in valid_ids]
        invalid = [m for m in matches if m.get("ingredient_id") not in valid_ids]

        if invalid:
            print(f"    WARNING: {len(invalid)} invalid ingredient IDs filtered out")
            for m in invalid:
                print(f"      ? {m.get('ingredient_id')} — {m.get('reasoning', '')}")

        if not valid_matches:
            print(f"    FAIL — no valid matches after validation")
            failed += 1
            continue

        # Calculate total calories
        total_cal = 0
        for m in valid_matches:
            ing = next(i for i in ingredients if i["id"] == m["ingredient_id"])
            qty = m.get("quantity", 1.0)
            total_cal += ing["calories"] * qty
            print(f"    + {ing['name']} x{qty} = {ing['calories'] * qty:.0f} cal — {m.get('reasoning', '')}")

        print(f"    TOTAL: {total_cal:.0f} cal ({len(valid_matches)} ingredients)")
        wired += 1

        if not DRY_RUN:
            for m in valid_matches:
                try:
                    cur.execute("""
                        INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity)
                        VALUES (?, ?, ?)
                    """, (swap_id, m["ingredient_id"], m.get("quantity", 1.0)))
                    total_ingredients_added += cur.rowcount
                except Exception as e:
                    print(f"    ERROR inserting: {e}")

        # Small delay to avoid rate limits
        if i < len(orphaned) - 1:
            time.sleep(0.3)

    if not DRY_RUN:
        conn.commit()

    print(f"\n{'='*60}")
    print(f"SUMMARY {'(DRY RUN)' if DRY_RUN else ''}")
    print(f"{'='*60}")
    print(f"Total orphaned:     {len(orphaned)}")
    print(f"Wired:              {wired}")
    print(f"Failed:             {failed}")
    print(f"Ingredients added:  {total_ingredients_added}")

    conn.close()

if __name__ == "__main__":
    main()
