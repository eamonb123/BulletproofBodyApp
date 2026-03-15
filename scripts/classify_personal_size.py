#!/usr/bin/env python3
"""
Auto-classify snack items for personal/single-serve size availability.

Phase 1: Classify obvious items based on category, brand, and name patterns.
- Protein bars, yogurt cups, ice cream bars → TRUE
- Cooking oils, condiments, spreads → FALSE
- Ambiguous items → leave NULL for research phase

Usage:
    python3 scripts/classify_personal_size.py
"""

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "bulletproof_body.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ─── Pattern-based rules ───

# Brands/name patterns that are ALWAYS individual/personal size
ALWAYS_PERSONAL_BRANDS = {
    # Protein bars
    "quest", "bsn", "built bar", "built puff", "built puff (sour)", "kirkland signature",
    "one", "rxbar", "kind", "larabar", "clif", "epic", "nature valley",
    "no cow", "pure protein", "fitcrunch", "power crunch", "barebells",
    "legendary foods", "think!", "fulfil", "grenade", "met-rx",
    "atkins", "simply protein", "zing", "perfect bar", "good! snacks",
    "betty lou's", "lenny & larry's", "nugo", "luna",
    "yasso", "halo top", "nick's", "enlightened",
    # Protein shakes (RTD)
    "core power", "fairlife", "premier protein", "muscle milk",
    "orgain", "owyn", "evolve", "iconic", "boost", "ensure",
    "body fortress", "dymatize",
    # Single-serve yogurt
    "oikos", "chobani", "fage", "siggi's", "dannon", "noosa",
    "two good", "light + fit", "ratio", ":ratio", "greek gods",
    "yoplait", "stonyfield",
    # String cheese / individual cheese
    "babybel",
    # Fruit snacks / fruit leather
    "that's it", "solely", "bear", "stretch island",
    "welch's", "annie's", "yumearth", "black forest", "mott's",
    "brothers all natural",
    # Individual candy bars
    "snickers", "kit kat", "twix", "mars", "reese's", "butterfinger",
    "milky way", "3 musketeers", "crunch", "hershey's",
    "unreal", "hu kitchen", "lily's", "skinny dipped",
    # Sparkling water / individual cans
    "celsius", "c4", "alani nu", "ghost", "aha", "bubly",
    "la croix", "spindrift", "olipop", "poppi", "zevia",
    "athletic brewing", "heineken 0.0", "clausthaler",
    # Individual shakes/drinks
    "ag1 (athletic greens)", "liquid iv",
}

# Name patterns that indicate personal size (regex-free, lowercase matching)
PERSONAL_NAME_PATTERNS = [
    "protein bar", "bar (", "wafer bar", "crisp bar", "cookie bar",
    "granola bar", "energy bar", "snack bar", "cereal bar",
    "protein shake", "protein drink", "protein smoothie",
    "yogurt cup", "yogurt (", "greek yogurt",
    "string cheese", "cheese stick",
    "frozen yogurt bar", "ice cream bar", "popsicle", "fudge bar",
    "fruit bar", "fruit leather", "fruit strip", "fruit snack",
    "gum", "mints",
    "single serve", "snack pack", "grab bag", "on-the-go",
    "individual", "1 bar", "1 bottle", "1 can", "1 cup", "1 pouch",
    "1 stick", "1 packet", "1 pack",
    "protein water",
]

# Serving patterns that indicate single-serve
PERSONAL_SERVING_PATTERNS = [
    "1 bar", "1 bottle", "1 can", "1 cup", "1 pouch",
    "1 stick", "1 packet", "standard bar", "single",
    "1 bag", "1 pastry", "1 brownie", "1 cookie",
    "1 scoop",  # supplements in individual scoops
]

# Subcategories/categories that are ALWAYS bulk (FALSE)
BULK_SUBCATEGORIES = {
    "cooking_oil", "condiment", "spread", "sweetener", "creamer",
    "pasta_grain",
}

# Subcategories that are ALWAYS personal size (TRUE)
PERSONAL_SUBCATEGORIES = {
    "frozen_meal",  # Inherently single-serve
}

# Brand patterns for bulk-only items
BULK_BRANDS = {
    "generic", "c&h", "splenda", "stevia in the raw",
    "big tree farms",
}

# Name patterns indicating bulk-only
BULK_NAME_PATTERNS = [
    "olive oil", "cooking oil", "oil spray", "cooking spray",
    "ketchup", "mustard", "hot sauce", "mayo", "mayonnaise",
    "soy sauce", "barbecue sauce", "bbq sauce", "teriyaki sauce",
    "ranch dressing", "salad dressing", "vinaigrette",
    "peanut butter", "almond butter", "cashew butter", "nut butter",
    "cream cheese", "sour cream (tub", "butter (stick",
    "sugar", "sweetener", "honey", "maple syrup", "agave",
    "coffee creamer", "half & half", "half and half",
    "flour", "baking",
]


def classify_personal_size(conn):
    """Phase 1: Auto-classify based on patterns."""
    rows = conn.execute("""
        SELECT id, name, brand, serving, calories, protein_g,
               item_category, item_subcategory, swap_craving_category
        FROM snack_items
        WHERE has_personal_size IS NULL
    """).fetchall()

    classified_true = 0
    classified_false = 0
    left_null = 0

    for row in rows:
        name_lower = row["name"].lower()
        brand_lower = row["brand"].lower()
        serving_lower = (row["serving"] or "").lower()
        subcat = row["item_subcategory"] or ""

        result = None  # None = still unknown
        note = ""

        # ─── Rule 1: Subcategory-based (grocery items) ───
        if subcat in BULK_SUBCATEGORIES:
            result = False
            note = "Portion control tip: measure servings"

        elif subcat in PERSONAL_SUBCATEGORIES:
            result = True
            note = "Single-serve meal"

        # ─── Rule 2: Brand-based ───
        elif brand_lower in ALWAYS_PERSONAL_BRANDS:
            result = True
            note = _infer_personal_note(name_lower, brand_lower, serving_lower)

        elif brand_lower in BULK_BRANDS:
            result = False
            note = "Portion control tip: measure servings"

        # ─── Rule 3: Name pattern matching ───
        else:
            for pattern in PERSONAL_NAME_PATTERNS:
                if pattern in name_lower:
                    result = True
                    note = _infer_personal_note(name_lower, brand_lower, serving_lower)
                    break

            if result is None:
                for pattern in BULK_NAME_PATTERNS:
                    if pattern in name_lower:
                        result = False
                        note = "Portion control tip: measure servings"
                        break

            if result is None:
                for pattern in PERSONAL_SERVING_PATTERNS:
                    if pattern in serving_lower:
                        result = True
                        note = _infer_personal_note(name_lower, brand_lower, serving_lower)
                        break

        # ─── Apply classification ───
        if result is True:
            conn.execute("""
                UPDATE snack_items
                SET has_personal_size = 1,
                    personal_size_serving = ?,
                    personal_size_calories = ?,
                    personal_size_protein_g = ?,
                    package_note = ?
                WHERE id = ?
            """, (
                row["serving"],
                row["calories"],
                row["protein_g"],
                note,
                row["id"],
            ))
            classified_true += 1

        elif result is False:
            conn.execute("""
                UPDATE snack_items
                SET has_personal_size = 0,
                    package_note = ?
                WHERE id = ?
            """, (note, row["id"]))
            classified_false += 1

        else:
            left_null += 1

    conn.commit()
    return classified_true, classified_false, left_null


def _infer_personal_note(name_lower, brand_lower, serving_lower):
    """Infer appropriate package note from item context."""
    if any(x in name_lower for x in ["bar", "crisp", "wafer", "brownie", "cookie", "pastry"]):
        return "Individual bar"
    if any(x in name_lower for x in ["shake", "drink", "bottle", "protein water"]):
        return "Individual bottle"
    if any(x in name_lower for x in ["yogurt", "cup"]):
        return "Single-serve cup"
    if any(x in name_lower for x in ["frozen yogurt bar", "ice cream bar", "popsicle", "fudge bar"]):
        return "Individually wrapped"
    if any(x in name_lower for x in ["gum", "mint"]):
        return "Inherently portioned"
    if any(x in name_lower for x in ["fruit snack", "fruit leather", "fruit strip", "fruit bar"]):
        return "Individual pouch"
    if any(x in name_lower for x in ["string cheese", "cheese stick"]):
        return "Individually wrapped"
    if any(x in name_lower for x in ["can", "seltzer", "sparkling", "water", "energy"]):
        return "Individual can/bottle"
    if "1 bag" in serving_lower or "bag" in serving_lower:
        return "Individual bag"
    return "Individual serving"


def main():
    conn = get_db()

    print("=" * 60)
    print("PHASE 1: Auto-classify personal size availability")
    print("=" * 60)

    true_count, false_count, null_count = classify_personal_size(conn)

    print(f"\n  Classified as PERSONAL SIZE (TRUE):  {true_count}")
    print(f"  Classified as BULK ONLY (FALSE):     {false_count}")
    print(f"  Still UNKNOWN (NULL):                {null_count}")
    print(f"  Total processed:                     {true_count + false_count + null_count}")

    # Show summary by category
    print("\n--- Breakdown by item_category ---")
    for row in conn.execute("""
        SELECT item_category,
               SUM(CASE WHEN has_personal_size = 1 THEN 1 ELSE 0 END) as personal,
               SUM(CASE WHEN has_personal_size = 0 THEN 1 ELSE 0 END) as bulk,
               SUM(CASE WHEN has_personal_size IS NULL THEN 1 ELSE 0 END) as unknown,
               COUNT(*) as total
        FROM snack_items
        GROUP BY item_category
    """):
        print(f"  {row['item_category']}: {row['personal']} personal, {row['bulk']} bulk, {row['unknown']} unknown (total: {row['total']})")

    conn.close()


if __name__ == "__main__":
    main()
