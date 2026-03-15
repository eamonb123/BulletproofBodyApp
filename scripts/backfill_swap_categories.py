#!/usr/bin/env python3
"""
Backfill swap_craving_category and is_hero for ALL existing snack_items.

1. swap_craving_category: derived from snack_swaps.craving where the item appears,
   or inferred from item_subcategory using SUBCATEGORY_TO_CRAVING.
2. is_hero: True if the item appears as swap_snack_id in snack_swaps,
   False if it appears as original_snack_id.
   For items in both roles or neither, classify by calorie density vs category avg.

Run once: python3 scripts/backfill_swap_categories.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "bulletproof_body.db")

SUBCATEGORY_TO_CRAVING = {
    "dairy": "Dairy",
    "beverage": "Beverage",
    "cereal": "Cereal",
    "frozen_meal": "Frozen Meal",
    "pasta_grain": "Pasta & Grain",
    "spread": "Spread",
    "condiment": "Condiment",
    "sweetener": "Sweetener",
    "supplement": "Protein",
    "protein": "Protein",
    "precooked_protein": "Protein",
    "bread_wrap": "Bread & Wrap",
    "frozen_fruit": "Frozen Fruit",
    "fresh_fruit": "Frozen Fruit",
    "creamer": "Creamer",
    "cooking_oil": "Savory Cooking",
}

# Snack-category items: infer craving from name/brand keywords
SNACK_KEYWORDS = {
    "Salty & Crunchy": ["chip", "popcorn", "cracker", "pretzel", "puff", "crisp",
                        "nut", "almond", "cashew", "peanut", "pistachio", "trail mix",
                        "rice cake", "corn nut", "tortilla chip", "veggie straw",
                        "cheese puff", "cheese ball", "skinny pop", "smartfood",
                        "pop corner", "lays", "doritos", "cheetos", "pringles",
                        "ruffles", "kettle", "cape cod", "quest chip", "beanitos",
                        "harvest snap", "sunchips", "fritos", "wise", "terra",
                        "snyder", "boom chicka pop", "lesser evil", "pirate"],
    "Frozen Treat": ["ice cream", "frozen", "popsicle", "fudge bar", "yasso",
                     "halo top", "enlightened", "outshine", "good humor",
                     "drumstick", "klondike", "magnum", "haagen", "häagen",
                     "ben & jerry", "talenti", "gelato", "sorbet", "mochi",
                     "arctic zero"],
    "Chewy/Gummy": ["gummy", "gummi", "chewy", "fruit snack", "fruit leather",
                     "fruit roll", "haribo", "smartsweets", "dried", "date",
                     "fig bar", "larabar", "that's it", "welch", "mott",
                     "licorice", "twizzler", "swedish fish", "sour patch",
                     "starburst", "skittles", "jelly", "taffy"],
    "Chocolate Fix": ["chocolate", "cocoa", "cacao", "snickers", "m&m",
                      "reese", "kit kat", "twix", "milky way", "hershey",
                      "ghirardelli", "lindt", "dove", "lily's", "hu",
                      "unreal", "bark thin", "ritter", "toblerone", "butterfinger"],
    "Sweet Crunch": ["granola bar", "protein bar", "energy bar", "cookie",
                     "wafer", "biscuit", "one bar", "quest bar", "kind bar",
                     "rxbar", "clif", "nature valley", "fiber one",
                     "think!", "built bar", "fulfil", "barebells",
                     "power crunch", "pure protein", "lenny & larry"],
    "Creamy Dessert": ["pudding", "mousse", "custard", "jello", "jell-o"],
    "Refreshing Drink": ["drink", "tea", "coffee", "lemonade"],
    "Spicy Crunch": ["spicy", "hot", "jalap", "flamin", "takis", "turbos"],
}


def infer_snack_craving(name, brand):
    """Infer craving category for snack-category items from name/brand."""
    text = f"{name} {brand}".lower()
    for craving, keywords in SNACK_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return craving
    # Default for unmatched snacks
    return "Salty & Crunchy"


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── Step 1: Populate swap_craving_category ─────────────────────

    # First, get categories from existing snack_swaps
    cur.execute("""
        SELECT si.id, ss.craving
        FROM snack_items si
        JOIN snack_swaps ss ON ss.swap_snack_id = si.id OR ss.original_snack_id = si.id
        WHERE ss.is_active = 1
        GROUP BY si.id
    """)
    swap_craving_map = {}
    for row in cur.fetchall():
        # Take first craving found (items can appear in multiple swaps)
        if row["id"] not in swap_craving_map:
            swap_craving_map[row["id"]] = row["craving"]

    # Now backfill all items
    cur.execute("SELECT id, name, brand, item_category, item_subcategory FROM snack_items")
    items = cur.fetchall()

    updated_craving = 0
    for item in items:
        item_id = item["id"]

        # Priority 1: Use craving from snack_swaps
        if item_id in swap_craving_map:
            craving = swap_craving_map[item_id]
        # Priority 2: Use subcategory mapping (for grocery items)
        elif item["item_subcategory"] and item["item_subcategory"] in SUBCATEGORY_TO_CRAVING:
            craving = SUBCATEGORY_TO_CRAVING[item["item_subcategory"]]
        # Priority 3: Infer from name/brand (for snack items)
        elif item["item_category"] == "snack":
            craving = infer_snack_craving(item["name"], item["brand"])
        else:
            craving = ""  # shouldn't happen

        if craving:
            cur.execute("UPDATE snack_items SET swap_craving_category = ? WHERE id = ?",
                        (craving, item_id))
            updated_craving += 1

    print(f"Updated swap_craving_category for {updated_craving} items")

    # ── Step 2: Populate is_hero ──────────────────────────────────

    # Get hero/enemy classification from snack_swaps
    cur.execute("SELECT DISTINCT swap_snack_id FROM snack_swaps WHERE is_active = 1")
    heroes = {row[0] for row in cur.fetchall()}

    cur.execute("SELECT DISTINCT original_snack_id FROM snack_swaps WHERE is_active = 1")
    enemies = {row[0] for row in cur.fetchall()}

    # Compute average calories per craving category for unclassified items
    cur.execute("""
        SELECT swap_craving_category, AVG(calories) as avg_cal
        FROM snack_items
        WHERE swap_craving_category <> '' AND is_active = 1
        GROUP BY swap_craving_category
    """)
    avg_cal_by_craving = {row[0]: row[1] for row in cur.fetchall()}

    updated_hero = 0
    for item in items:
        item_id = item["id"]
        is_hero = None

        if item_id in heroes and item_id not in enemies:
            is_hero = 1
        elif item_id in enemies and item_id not in heroes:
            is_hero = 0
        elif item_id in heroes and item_id in enemies:
            # In both roles - use calorie density vs category average
            craving = swap_craving_map.get(item_id, "")
            avg_cal = avg_cal_by_craving.get(craving, 200)
            cur_row = conn.execute("SELECT calories FROM snack_items WHERE id = ?", (item_id,)).fetchone()
            if cur_row:
                is_hero = 1 if cur_row["calories"] < avg_cal else 0
        else:
            # Not in any swap - classify by calories vs category average
            craving = swap_craving_map.get(item_id, "")
            if not craving:
                # Use the craving we just computed
                row = conn.execute("SELECT swap_craving_category, calories FROM snack_items WHERE id = ?",
                                   (item_id,)).fetchone()
                if row:
                    craving = row["swap_craving_category"]
            avg_cal = avg_cal_by_craving.get(craving, 200)
            cur_row = conn.execute("SELECT calories FROM snack_items WHERE id = ?", (item_id,)).fetchone()
            if cur_row:
                is_hero = 1 if cur_row["calories"] < avg_cal else 0

        if is_hero is not None:
            cur.execute("UPDATE snack_items SET is_hero = ? WHERE id = ?", (is_hero, item_id))
            updated_hero += 1

    conn.commit()

    # ── Verify ────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM snack_items WHERE swap_craving_category <> ''")
    has_craving = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM snack_items WHERE is_hero IS NOT NULL")
    has_hero = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM snack_items")
    total = cur.fetchone()[0]

    print(f"\nBackfill complete:")
    print(f"  Total items: {total}")
    print(f"  With swap_craving_category: {has_craving}")
    print(f"  With is_hero classification: {has_hero}")

    # Show distribution
    cur.execute("""
        SELECT swap_craving_category, COUNT(*) as cnt,
               SUM(CASE WHEN is_hero = 1 THEN 1 ELSE 0 END) as heroes,
               SUM(CASE WHEN is_hero = 0 THEN 1 ELSE 0 END) as enemies
        FROM snack_items
        WHERE swap_craving_category <> ''
        GROUP BY swap_craving_category
        ORDER BY cnt DESC
    """)
    print(f"\n  {'Category':<20} {'Total':>6} {'Heroes':>7} {'Enemies':>8}")
    print(f"  {'-'*20} {'-'*6} {'-'*7} {'-'*8}")
    for row in cur.fetchall():
        print(f"  {row[0]:<20} {row[1]:>6} {row[2]:>7} {row[3]:>8}")

    conn.close()


if __name__ == "__main__":
    main()
