#!/usr/bin/env python3
"""
Clean application of verified nutrition data.
Explicit mapping from research JSON entries to DB IDs — no fuzzy matching.
"""

import sqlite3
import json

DB_PATH = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
RESEARCH_DIR = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

# Explicit mapping: (json_file, json_index) → db_id
# json_index is 0-based position in the JSON array
MAPPING = {
    # 01_candy_bars.json (14 entries)
    ("01_candy_bars.json", 0): "kitkat-original-orig",        # Kit Kat
    ("01_candy_bars.json", 1): "twix-original-orig",           # Twix
    ("01_candy_bars.json", 2): "snickers-orig",                # Snickers Standard
    ("01_candy_bars.json", 3): "snickers-fullsize-orig",       # Snickers King Size
    ("01_candy_bars.json", 4): "hersheys-milk-orig",           # Hershey's
    ("01_candy_bars.json", 5): "reeses-cups-orig",             # Reese's
    ("01_candy_bars.json", 6): "mms-peanut-orig",              # M&M's Peanut
    ("01_candy_bars.json", 7): "skittles-original-orig",       # Skittles
    ("01_candy_bars.json", 8): "sour-patch-kids-orig",         # Sour Patch Kids
    ("01_candy_bars.json", 9): "sourpatch-watermelon-orig",    # Sour Patch Watermelon
    ("01_candy_bars.json", 10): "jolly-rancher-regular-orig",  # Jolly Rancher
    ("01_candy_bars.json", 11): "haribo-goldbears-orig",       # Haribo
    ("01_candy_bars.json", 12): "swedish-fish-orig",           # Swedish Fish
    ("01_candy_bars.json", 13): "trolli-crawlers-orig",        # Trolli

    # 02_chips_crackers.json (14 entries)
    ("02_chips_crackers.json", 0): "lays-classic-orig",
    ("02_chips_crackers.json", 1): "doritos-nacho-orig",
    ("02_chips_crackers.json", 2): "hot-cheetos-orig",
    ("02_chips_crackers.json", 3): "takis-fuego-orig",
    ("02_chips_crackers.json", 4): "ruffles-csc-orig",
    ("02_chips_crackers.json", 5): "pringles-original-orig",
    ("02_chips_crackers.json", 6): "cheezit-original-orig",
    ("02_chips_crackers.json", 7): "sunchips-harvest-orig",
    ("02_chips_crackers.json", 8): "tostitos-scoops-orig",
    ("02_chips_crackers.json", 9): "goldfish-cheddar-orig",
    ("02_chips_crackers.json", 10): "snyders-cheddar-pretzel-orig",
    ("02_chips_crackers.json", 11): "snyders-cinnamon-sugar-orig",
    ("02_chips_crackers.json", 12): "snyders-everything-orig",
    ("02_chips_crackers.json", 13): "pepperidge-sesame-sticks-orig",

    # 03_cookies_pastries.json (13 entries)
    ("03_cookies_pastries.json", 0): "oreos-orig",
    ("03_cookies_pastries.json", 1): "chipsahoy-original-orig",
    ("03_cookies_pastries.json", 2): "nutterbutter-orig",
    ("03_cookies_pastries.json", 3): "girlscout-thinmint-orig",
    ("03_cookies_pastries.json", 4): "poptarts-strawberry-orig",
    ("03_cookies_pastries.json", 5): "littledebbie-cosmic-orig",
    ("03_cookies_pastries.json", 6): "hostess-twinkie-orig",
    ("03_cookies_pastries.json", 7): "entenmanns-donut-orig",
    ("03_cookies_pastries.json", 8): "granola-bars-orig",
    ("03_cookies_pastries.json", 9): "clifbar-orig",
    ("03_cookies_pastries.json", 10): "sara-plain-bagel-orig",
    ("03_cookies_pastries.json", 11): "nutella-spread-orig",
    ("03_cookies_pastries.json", 12): "cornnuts-original-orig",

    # 04_frozen_drinks.json (13 entries)
    ("04_frozen_drinks.json", 0): "half-baked-orig",
    ("04_frozen_drinks.json", 1): "haagendazs-vanilla-orig",
    ("04_frozen_drinks.json", 2): "talenti-cccd-orig",
    ("04_frozen_drinks.json", 3): "drumstick-classic-orig",
    ("04_frozen_drinks.json", 4): "snackpack-supersize-choc-orig",
    ("04_frozen_drinks.json", 5): "jello-temptations-strawberry-orig",
    ("04_frozen_drinks.json", 6): "reddi-wip-orig",
    ("04_frozen_drinks.json", 7): "orville-moviebutter-orig",
    ("04_frozen_drinks.json", 8): "slimjim-monster-orig",
    ("04_frozen_drinks.json", 9): "nesquik-chocolate-orig",
    ("04_frozen_drinks.json", 10): "cocacola-orig",
    ("04_frozen_drinks.json", 11): "gatorade-orig",
    ("04_frozen_drinks.json", 12): "trail-mix-orig",

    # 05_cereal_misc.json (13 entries)
    ("05_cereal_misc.json", 0): "cinnamontoast-orig",
    ("05_cereal_misc.json", 1): "cocoapuffs-orig",
    ("05_cereal_misc.json", 2): "frostedflakes-orig",
    ("05_cereal_misc.json", 3): "luckycharms-orig",
    ("05_cereal_misc.json", 4): "roldgold-tiny-twists-orig",      # 1.75oz entry
    ("05_cereal_misc.json", 5): "rold-gold-tiny-twists-orig",     # 1oz entry
    ("05_cereal_misc.json", 6): "almonds-snack-orig",
    ("05_cereal_misc.json", 7): "peanutbutter-regular-orig",
    ("05_cereal_misc.json", 8): "oscar-wieners-orig",
    ("05_cereal_misc.json", 9): "guac-tub-orig",
    ("05_cereal_misc.json", 10): "mission-large-tortilla-orig",
    ("05_cereal_misc.json", 11): "chips-queso-orig",
    ("05_cereal_misc.json", 12): "chocolate-milk-orig",

    # 06_condiments_grocery.json (16 entries)
    ("06_condiments_grocery.json", 0): "bbq-sauce-orig",
    ("06_condiments_grocery.json", 1): "ranch-dressing-orig",
    ("06_condiments_grocery.json", 2): "mayo-orig",
    ("06_condiments_grocery.json", 3): "ketchup-orig",
    ("06_condiments_grocery.json", 4): "stir-fry-sauce-orig",
    ("06_condiments_grocery.json", 5): "thai-chili-sauce-orig",
    ("06_condiments_grocery.json", 6): "polynesian-sauce-orig",
    ("06_condiments_grocery.json", 7): "daisy-sour-cream-orig",
    ("06_condiments_grocery.json", 8): "kraft-mild-cheddar-shreds-orig",
    ("06_condiments_grocery.json", 9): "galbani-whole-string-orig",
    ("06_condiments_grocery.json", 10): "milk-2percent-orig",
    ("06_condiments_grocery.json", 11): "cane-sugar-orig",
    ("06_condiments_grocery.json", 12): "maple-syrup-orig",
    ("06_condiments_grocery.json", 13): "linguine-orig",
    ("06_condiments_grocery.json", 14): "grocery_olive_oil_2tbsp_orig",
    ("06_condiments_grocery.json", 15): "reddi-wip-orig",
}

def main():
    conn = sqlite3.connect(DB_PATH)

    # Load all JSON files
    files = {}
    for fname in ["01_candy_bars.json", "02_chips_crackers.json", "03_cookies_pastries.json",
                   "04_frozen_drinks.json", "05_cereal_misc.json", "06_condiments_grocery.json"]:
        with open(f"{RESEARCH_DIR}/{fname}") as f:
            files[fname] = json.load(f)

    # Get current DB values for comparison
    db_items = {}
    for row in conn.execute("SELECT id, brand, name, calories FROM snack_items WHERE id IN (SELECT original_snack_id FROM snack_swaps)"):
        db_items[row[0]] = {"brand": row[1], "name": row[2], "calories": row[3]}

    updated = 0
    confirmed = 0
    needs_update = 0
    serving_mismatch = 0
    skipped = 0

    for (fname, idx), db_id in MAPPING.items():
        entries = files.get(fname, [])
        if idx >= len(entries):
            print(f"  SKIP: {fname}[{idx}] — index out of range")
            skipped += 1
            continue

        entry = entries[idx]
        db_item = db_items.get(db_id)
        if not db_item:
            print(f"  SKIP: DB ID {db_id} not found")
            skipped += 1
            continue

        # Apply
        conn.execute("""
            UPDATE snack_items SET
                verified_serving = ?,
                verified_serving_grams = ?,
                verified_calories = ?,
                verified_protein_g = ?,
                verified_carbs_g = ?,
                verified_fat_g = ?,
                verified_fiber_g = ?,
                verified_sugar_g = ?,
                verified_source_url = ?,
                verified_notes = ?,
                verification_status = ?
            WHERE id = ?
        """, (
            entry.get("verified_serving", ""),
            entry.get("verified_serving_grams", 0),
            entry.get("verified_calories", 0),
            entry.get("verified_protein_g", 0),
            entry.get("verified_carbs_g", 0),
            entry.get("verified_fat_g", 0),
            entry.get("verified_fiber_g", 0),
            entry.get("verified_sugar_g", 0),
            entry.get("source_url", ""),
            entry.get("notes", ""),
            entry.get("status", ""),
            db_id,
        ))

        delta = entry.get("verified_calories", 0) - db_item["calories"]
        status = entry.get("status", "")
        icon = {"confirmed": "OK", "needs_update": "FIX", "serving_mismatch": "SIZE"}.get(status, "?")
        delta_str = f" (delta: {delta:+d})" if delta != 0 else ""

        print(f"  [{icon}] {db_id}: {db_item['brand']} {db_item['name']} | DB={db_item['calories']} → Verified={entry.get('verified_calories', '?')}{delta_str}")

        updated += 1
        if status == "confirmed":
            confirmed += 1
        elif status == "needs_update":
            needs_update += 1
        elif status == "serving_mismatch":
            serving_mismatch += 1

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"Applied {updated} verified entries ({confirmed} confirmed, {needs_update} needs_update, {serving_mismatch} serving_mismatch, {skipped} skipped)")

if __name__ == "__main__":
    main()
