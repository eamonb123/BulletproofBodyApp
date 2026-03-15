#!/usr/bin/env python3
"""
Research and populate personal size data for items left NULL after auto-classification.

Uses a comprehensive lookup table of known product personal-size availability.
Items not in the lookup table remain NULL for manual review.

Usage:
    python3 scripts/research_personal_sizes.py
"""

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "bulletproof_body.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ─── Known personal size data ───
# Format: (brand_pattern, name_pattern) → (has_personal, serving, calories, protein, note)
# brand_pattern and name_pattern are lowercase substrings. Both must match (AND).
# Use "" for brand_pattern to match any brand.

KNOWN_PERSONAL_SIZES = [
    # ─── Chips with personal sizes ───
    ("lay's", "baked", True, "1 oz bag", 110, 2.0, "Personal bags available in variety packs"),
    ("popcorners", "", True, "1 oz bag", 110, 1.0, "Personal bags widely available"),
    ("popcorners", "flex", True, "1 oz bag", 110, 10.0, "Protein flex bags available individually"),
    ("quest", "chip", True, "1.1 oz bag", 140, 19.0, "Personal bags sold individually and in boxes"),
    ("beanitos", "", True, "1 oz bag", 130, 4.0, "Personal bags available"),
    ("jackson", "sweet potato", True, "1.5 oz bag", 210, 2.0, "Personal bags available"),
    ("pirate", "booty", True, "0.5 oz bag", 65, 1.0, "Personal bags in multipacks"),
    ("skinnypop", "", True, "0.65 oz bag", 100, 2.0, "Mini bags widely available"),
    ("boom chicka pop", "", True, "1 oz bag", 140, 2.0, "Personal bags in multipacks"),
    ("angie's boom chicka pop", "", True, "1 oz bag", 140, 2.0, "Personal bags in multipacks"),
    ("smartfood", "", True, "0.625 oz bag", 90, 2.0, "Personal bags in multipacks"),
    ("doritos", "", True, "1 oz bag", 140, 2.0, "Personal bags everywhere"),
    ("ruffles", "", True, "1 oz bag", 160, 1.0, "Personal bags widely available"),
    ("cheetos", "", True, "1 oz bag", 160, 2.0, "Personal bags widely available"),
    ("takis", "", True, "1 oz bag", 140, 2.0, "Personal bags widely available"),
    ("tostitos", "", True, "1 oz bag", 140, 2.0, "Personal bags available, less common"),
    ("corn nuts", "", True, "1.7 oz bag", 230, 4.0, "Personal bags widely available"),
    ("snack factory", "pretzel", True, "1 oz bag", 110, 3.0, "Snack packs available"),
    ("good thins", "", True, "1 oz pack", 120, 2.0, "Snack packs available"),
    ("pringles", "", True, "1.4 oz can", 150, 1.0, "Snack Stacks widely available"),
    ("sunchips", "", True, "1 oz bag", 140, 2.0, "Personal bags in variety packs"),
    ("wheat thins", "", True, "1 oz pack", 130, 2.0, "Snack packs available"),
    ("wilde", "chip", True, "1.34 oz bag", 160, 10.0, "Personal bags available"),
    ("twin peaks", "chip", True, "1 oz bag", 120, 14.0, "Personal bags available"),
    ("stacy's", "pita", True, "1 oz bag", 130, 3.0, "Personal bags in multipacks"),
    ("terra", "chip", True, "1 oz bag", 140, 1.0, "Personal bags available"),
    ("kettle brand", "", True, "1 oz bag", 130, 2.0, "Personal bags in multipacks"),
    ("cape cod", "", True, "1 oz bag", 140, 2.0, "Personal bags in multipacks"),
    ("fritos", "", True, "1 oz bag", 160, 2.0, "Personal bags widely available"),
    ("hippeas", "", True, "1 oz bag", 130, 4.0, "Personal bags available"),
    ("zapp's", "", True, "1 oz bag", 150, 1.0, "Personal bags available"),

    # ─── Chips WITHOUT personal sizes ───
    ("mary's gone crackers", "", False, "", 0, 0.0, "Bulk box only — portion into snack bags"),
    ("trader joe's", "inner peas", False, "", 0, 0.0, "One bag size only — TJ's doesn't do personal packs"),
    ("trader joe's", "", False, "", 0, 0.0, "Trader Joe's generally doesn't offer personal packs"),
    ("siete", "chip", True, "1 oz bag", 140, 1.0, "Personal bags available in some stores"),
    ("lesser evil", "", True, "1 oz bag", 120, 2.0, "Personal bags available"),
    ("high key", "", False, "", 0, 0.0, "One bag size — portion into containers"),
    ("catalina crunch", "", False, "", 0, 0.0, "One bag size — portion into containers"),

    # ─── Popcorn ───
    ("orville", "", True, "1 bag (microwave)", 160, 3.0, "Individual microwave bags"),

    # ─── Cookies with personal sizes ───
    ("chips ahoy", "", True, "1.55 oz pack", 200, 2.0, "Snack packs available"),
    ("oreo", "", True, "1.2 oz pack (3 cookies)", 160, 1.0, "Snack packs available"),
    ("nutter butter", "", True, "1.2 oz pack", 170, 3.0, "Snack packs available"),
    ("lenny & larry's", "cookie", True, "1 cookie", 200, 8.0, "Individual cookies"),
    ("highkey", "cookie", True, "3 cookies pack", 150, 4.0, "Individual packs available"),
    ("partake", "", True, "1 oz pack", 130, 1.0, "Snack packs available in some stores"),

    # ─── Dried fruit ───
    ("sun-maid", "raisin", True, "1 oz box", 85, 1.0, "Mini boxes widely available"),
    ("craisins", "", True, "1 oz pack", 95, 0.0, "Snack packs available"),
    ("ocean spray", "craisins", True, "1 oz pack", 95, 0.0, "Snack packs available"),
    ("natierra", "freeze", True, "1 oz bag", 40, 0.0, "Some varieties have personal bags"),
    ("bare snacks", "", True, "0.53 oz bag", 60, 0.0, "Personal bags in multipacks"),

    # ─── Seaweed ───
    ("gimme", "", True, "0.35 oz pack", 25, 1.0, "Individual packs"),
    ("annie chun's", "", True, "0.35 oz pack", 25, 1.0, "Individual packs"),
    ("jayone", "", True, "0.17 oz pack", 10, 1.0, "Individual packs"),
    ("seasnax", "", True, "0.36 oz pack", 25, 1.0, "Individual packs"),

    # ─── Cheese ───
    ("laughing cow", "", True, "1 wedge", 35, 2.0, "Individually wrapped wedges"),
    ("kraft", "single", True, "1 slice", 60, 4.0, "Individually wrapped slices"),
    ("sargento", "stick", True, "1 stick", 80, 6.0, "Individually wrapped sticks"),
    ("horizon", "string", True, "1 stick", 80, 6.0, "Individually wrapped sticks"),
    ("frigo", "string", True, "1 stick", 80, 7.0, "Individually wrapped sticks"),

    # ─── Cereal ───
    ("kodiak", "oatmeal", True, "1 packet", 190, 9.0, "Individual packets"),
    ("kodiak", "instant", True, "1 packet", 190, 9.0, "Individual packets"),
    ("quaker", "instant", True, "1 packet", 160, 4.0, "Individual packets"),
    ("quaker", "oatmeal", True, "1 packet", 160, 4.0, "Individual packets"),
    ("magic spoon", "", False, "", 0, 0.0, "Box only — portion into bowls"),
    ("three wishes", "", False, "", 0, 0.0, "Box only — portion into bowls"),
    ("catalina crunch", "cereal", False, "", 0, 0.0, "Box only — portion into bowls"),

    # ─── Nuts/Seeds ───
    ("blue diamond", "almond", True, "1 oz bag (100 cal)", 100, 3.0, "100-calorie packs available"),
    ("emerald", "", True, "1 oz pack (100 cal)", 100, 3.0, "100-calorie packs available"),
    ("planters", "", True, "1.5 oz bag", 220, 7.0, "Personal bags available"),
    ("wonderful", "pistachio", True, "1 oz bag", 160, 6.0, "Personal bags available"),
    ("wonderful", "almond", True, "1 oz bag", 170, 6.0, "Personal bags available"),
    ("sahale", "", True, "1.5 oz bag", 180, 5.0, "Personal bags available"),
    ("dry roasted edamame", "", True, "1 pack (0.65 oz)", 130, 14.0, "Individual packs"),
    ("the only bean", "", True, "1 pack", 130, 14.0, "Individual snack packs"),

    # ─── Crackers ───
    ("goldfish", "", True, "0.75 oz pack", 90, 3.0, "Snack packs widely available"),
    ("cheez-it", "", True, "1 oz pack", 140, 3.0, "Snack packs widely available"),
    ("triscuit", "", True, "1 oz pack", 120, 3.0, "Snack packs available in some stores"),
    ("ritz", "", True, "1 oz pack", 130, 2.0, "Snack packs available"),
    ("nut-thins", "", True, "1 oz pack", 130, 3.0, "Snack packs available"),

    # ─── Jerky / Meat snacks ───
    ("jack link's", "", True, "1 oz bag", 80, 12.0, "Personal bags widely available"),
    ("epic", "", True, "1 bar", 100, 9.0, "Individual bars"),
    ("chomps", "", True, "1 stick", 100, 10.0, "Individual sticks"),
    ("country archer", "", True, "1 oz bag", 80, 12.0, "Personal bags available"),
    ("carnivore snax", "", True, "1 bag (0.5 oz)", 70, 10.0, "Individual bags"),
    ("nick's sticks", "", True, "1 stick (1.7 oz)", 170, 9.0, "Individual sticks"),
    ("old wisconsin", "", True, "1 stick", 70, 5.0, "Individual sticks"),

    # ─── Rice cakes ───
    ("lundberg", "rice cake", False, "", 0, 0.0, "Full package — portion individually"),
    ("quaker", "rice cake", False, "", 0, 0.0, "Full package — portion individually"),

    # ─── Frozen items ───
    ("caulipower", "", True, "1 serving", 0, 0.0, "Single-serve or portioned packaging"),
    ("real good", "", True, "1 piece", 0, 0.0, "Individually wrapped portions"),
    ("dr. praeger's", "", True, "1 patty", 0, 0.0, "Individual patties"),

    # ─── Pudding / Jello ───
    ("jell-o", "", True, "1 cup", 70, 0.0, "Individual cups"),
    ("kozy shack", "", True, "1 cup", 130, 3.0, "Individual cups"),
    ("snack pack", "", True, "1 cup", 100, 1.0, "Individual cups"),

    # ─── Applesauce ───
    ("mott's", "applesauce", True, "1 cup (4 oz)", 50, 0.0, "Individual cups"),
    ("gogo squeez", "", True, "1 pouch (3.2 oz)", 60, 0.0, "Individual squeeze pouches"),

    # ─── Beverages (additional) ───
    ("bai", "", True, "1 bottle", 10, 0.0, "Individual bottles"),
    ("vitaminwater", "", True, "1 bottle", 0, 0.0, "Individual bottles"),
    ("bodyarmor", "", True, "1 bottle", 20, 0.0, "Individual bottles"),
    ("gatorade", "", True, "1 bottle", 0, 0.0, "Individual bottles"),
    ("monster", "", True, "1 can", 10, 0.0, "Individual cans"),
    ("red bull", "", True, "1 can", 10, 0.0, "Individual cans"),
    ("reign", "", True, "1 can", 10, 0.0, "Individual cans"),
    ("bang", "", True, "1 can", 0, 0.0, "Individual cans"),

    # ─── Protein powders / supplements ───
    ("optimum nutrition", "protein", False, "", 0, 0.0, "Tub — use scoop to measure"),
    ("gold standard", "", False, "", 0, 0.0, "Tub — use scoop to measure"),
    ("dymatize", "protein", False, "", 0, 0.0, "Tub — use scoop to measure"),
    ("ghost", "protein", False, "", 0, 0.0, "Tub — use scoop to measure"),
    ("bowmar", "protein", False, "", 0, 0.0, "Tub — use scoop to measure"),

    # ─── Bread/Wrap (generally bulk but some are individually portioned) ───
    ("dave's killer bread", "", False, "", 0, 0.0, "Full loaf — take individual slices"),
    ("ezekiel", "", False, "", 0, 0.0, "Full loaf — take individual slices"),
    ("carbonaut", "", False, "", 0, 0.0, "Full loaf — take individual slices"),
    ("mission", "tortilla", False, "", 0, 0.0, "Pack of tortillas — use one at a time"),
    ("ole", "tortilla", False, "", 0, 0.0, "Pack of tortillas — use one at a time"),
    ("joseph's", "", False, "", 0, 0.0, "Pack — use one at a time"),
    ("thomas'", "english muffin", False, "", 0, 0.0, "Pack — use one at a time"),

    # ─── Dairy (additional) ───
    ("fairlife", "milk", False, "", 0, 0.0, "Bottle — measure servings with a cup"),
    ("silk", "", False, "", 0, 0.0, "Carton — measure servings with a cup"),
    ("almond breeze", "", False, "", 0, 0.0, "Carton — measure servings with a cup"),
    ("oat milk", "", False, "", 0, 0.0, "Carton — measure servings with a cup"),
    ("cottage cheese", "", True, "1 cup (5.3 oz)", 0, 0.0, "Single-serve cups available for most brands"),
    ("good culture", "", True, "1 cup (5.3 oz)", 0, 0.0, "Single-serve cups"),

    # ─── Dips ───
    ("wholly guacamole", "", True, "1 mini cup (2 oz)", 60, 1.0, "Individual mini cups available"),
    ("sabra", "hummus", True, "1 cup (2 oz)", 120, 2.0, "Individual cups available"),
    ("hope", "hummus", True, "1 cup (2.5 oz)", 100, 2.0, "Individual cups available in some stores"),
]


def research_personal_sizes(conn):
    """Phase 2: Research items still NULL using lookup table."""
    rows = conn.execute("""
        SELECT id, name, brand, serving, calories, protein_g
        FROM snack_items
        WHERE has_personal_size IS NULL
    """).fetchall()

    researched_true = 0
    researched_false = 0
    still_null = 0
    unknown_items = []

    for row in rows:
        name_lower = row["name"].lower()
        brand_lower = row["brand"].lower()
        matched = False

        for (brand_pat, name_pat, has_personal, serving, cal, protein, note) in KNOWN_PERSONAL_SIZES:
            brand_match = brand_pat == "" or brand_pat in brand_lower
            name_match = name_pat == "" or name_pat in name_lower
            if brand_match and name_match:
                if has_personal:
                    # Use lookup data if it has specifics, otherwise use DB values
                    final_serving = serving if serving else row["serving"]
                    final_cal = cal if cal > 0 else row["calories"]
                    final_protein = protein if protein > 0 else row["protein_g"]

                    conn.execute("""
                        UPDATE snack_items
                        SET has_personal_size = 1,
                            personal_size_serving = ?,
                            personal_size_calories = ?,
                            personal_size_protein_g = ?,
                            package_note = ?
                        WHERE id = ?
                    """, (final_serving, final_cal, final_protein, note, row["id"]))
                    researched_true += 1
                else:
                    conn.execute("""
                        UPDATE snack_items
                        SET has_personal_size = 0,
                            package_note = ?
                        WHERE id = ?
                    """, (note, row["id"]))
                    researched_false += 1
                matched = True
                break

        if not matched:
            still_null += 1
            unknown_items.append(row)

    conn.commit()
    return researched_true, researched_false, still_null, unknown_items


def main():
    conn = get_db()

    print("=" * 60)
    print("PHASE 2: Research-based personal size classification")
    print("=" * 60)

    true_count, false_count, null_count, unknown = research_personal_sizes(conn)

    print(f"\n  Researched as PERSONAL SIZE (TRUE):  {true_count}")
    print(f"  Researched as BULK ONLY (FALSE):     {false_count}")
    print(f"  Still UNKNOWN (NULL):                {null_count}")

    # Summary totals
    totals = conn.execute("""
        SELECT
            SUM(CASE WHEN has_personal_size = 1 THEN 1 ELSE 0 END) as personal,
            SUM(CASE WHEN has_personal_size = 0 THEN 1 ELSE 0 END) as bulk,
            SUM(CASE WHEN has_personal_size IS NULL THEN 1 ELSE 0 END) as unknown,
            COUNT(*) as total
        FROM snack_items
    """).fetchone()

    print(f"\n{'=' * 60}")
    print(f"OVERALL TOTALS:")
    print(f"  Personal size available:  {totals['personal']}")
    print(f"  Bulk only:                {totals['bulk']}")
    print(f"  Unknown (needs review):   {totals['unknown']}")
    print(f"  Total items:              {totals['total']}")
    print(f"  Coverage:                 {100 * (totals['personal'] + totals['bulk']) / totals['total']:.1f}%")

    if unknown:
        print(f"\n{'=' * 60}")
        print(f"ITEMS NEEDING MANUAL REVIEW ({len(unknown)}):")
        print(f"{'=' * 60}")

        # Group by brand for readability
        by_brand = {}
        for item in unknown:
            brand = item["brand"]
            if brand not in by_brand:
                by_brand[brand] = []
            by_brand[brand].append(item)

        for brand in sorted(by_brand.keys()):
            items = by_brand[brand]
            print(f"\n  {brand}:")
            for item in items:
                print(f"    - {item['name']} ({item['serving']}, {item['calories']} cal)")

    conn.close()


if __name__ == "__main__":
    main()
