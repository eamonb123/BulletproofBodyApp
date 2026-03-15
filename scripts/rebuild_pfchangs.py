#!/usr/bin/env python3
"""Rebuild P.F. Chang's data with official nutrition PDF values (Oct 2025).

Deletes all existing P.F. Chang's ingredients, template meals, and
template meal ingredients, then re-inserts with verified nutrition data.
Verifies that ingredient calories sum to official totals.
"""

import sqlite3
import os
import sys
import subprocess

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")
SEED_SQL = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "seed_pfchangs_v2.sql")


def rebuild():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    # ── 1. DELETE OLD DATA ──────────────────────────────────
    print("Deleting old P.F. Chang's data...")

    c.execute("""
        DELETE FROM template_meal_ingredients WHERE template_meal_id IN (
            SELECT id FROM template_meals WHERE restaurant_id = 'pfchangs'
        )
    """)
    deleted_tmi = c.rowcount
    print(f"  Deleted {deleted_tmi} template_meal_ingredients rows")

    c.execute("DELETE FROM template_meals WHERE restaurant_id = 'pfchangs'")
    deleted_tm = c.rowcount
    print(f"  Deleted {deleted_tm} template_meals rows")

    c.execute("DELETE FROM ingredients WHERE restaurant_id = 'pfchangs'")
    deleted_ing = c.rowcount
    print(f"  Deleted {deleted_ing} ingredients rows")

    c.execute("DELETE FROM menu_categories WHERE restaurant_id = 'pfchangs'")
    deleted_mc = c.rowcount
    print(f"  Deleted {deleted_mc} menu_categories rows")

    conn.commit()
    print()

    # ── 2. RUN SEED SQL ─────────────────────────────────────
    print(f"Running seed SQL from {SEED_SQL}...")
    with open(SEED_SQL, 'r') as f:
        sql = f.read()
    conn.executescript(sql)
    conn.commit()
    print("  Seed SQL executed successfully")
    print()

    # ── 3. VERIFY TOTALS ────────────────────────────────────
    print("=" * 70)
    print("VERIFICATION: Checking ingredient sums match official totals")
    print("=" * 70)

    # Official totals for each template meal
    official = {
        # Enemy meals (entree + rice combos)
        'pfc_crispy_honey_combo': {'name': 'Crispy Honey Chicken + White Rice', 'cal': 1670, 'fat': 82, 'carbs': 177, 'protein': 49},
        'pfc_orange_chicken_combo': {'name': 'Orange Chicken + Fried Rice', 'cal': 1760, 'fat': 89, 'carbs': 184, 'protein': 57},
        'pfc_spicy_chicken_combo': {'name': "Chang's Spicy Chicken + White Rice", 'cal': 1350, 'fat': 52, 'carbs': 131, 'protein': 55},
        'pfc_kung_pao_combo': {'name': 'Kung Pao Chicken + White Rice', 'cal': 1330, 'fat': 68, 'carbs': 95, 'protein': 59},
        'pfc_sesame_chicken_combo': {'name': 'Sesame Chicken + White Rice', 'cal': 1270, 'fat': 48, 'carbs': 125, 'protein': 53},
        'pfc_mongolian_beef_combo': {'name': 'Mongolian Beef + White Rice', 'cal': 970, 'fat': 34, 'carbs': 105, 'protein': 59},
        'pfc_lo_mein_combo': {'name': 'Chicken Lo Mein', 'cal': 860, 'fat': 22, 'carbs': 120, 'protein': 44},
        'pfc_pad_thai_combo': {'name': 'Chicken Pad Thai', 'cal': 1480, 'fat': 50, 'carbs': 194, 'protein': 64},
        'pfc_fried_rice_combo': {'name': 'Chicken Fried Rice', 'cal': 1020, 'fat': 20, 'carbs': 152, 'protein': 54},
        'pfc_lettuce_wraps_meal': {'name': "Chang's Lettuce Wraps (Full)", 'cal': 660, 'fat': 26, 'carbs': 66, 'protein': 38},
        # Hero swaps
        'pfc_swap_chicken_broccoli': {'name': 'Chicken with Broccoli (no rice)', 'cal': 480, 'fat': 14, 'carbs': 30, 'protein': 60},
        'pfc_swap_chicken_broc_rice': {'name': 'Chicken with Broccoli + Brown Rice', 'cal': 730, 'fat': 16, 'carbs': 83, 'protein': 65},
        'pfc_swap_beef_broccoli': {'name': 'Beef with Broccoli (no rice)', 'cal': 600, 'fat': 26, 'carbs': 46, 'protein': 46},
        'pfc_swap_miso_salmon': {'name': 'Miso Glazed Salmon (no rice)', 'cal': 680, 'fat': 38, 'carbs': 32, 'protein': 52},
        'pfc_swap_firecracker_shrimp': {'name': 'Firecracker Shrimp (no rice)', 'cal': 580, 'fat': 34, 'carbs': 28, 'protein': 44},
        'pfc_swap_buddhas_chicken': {'name': "Buddha's Feast + Steamed Chicken", 'cal': 580, 'fat': 33, 'carbs': 38, 'protein': 34},
        'pfc_swap_soup_wraps': {'name': 'Egg Drop Soup + Half Lettuce Wraps', 'cal': 720, 'fat': 29, 'carbs': 82, 'protein': 27},
        'pfc_swap_mongolian_dinner': {'name': 'Mongolian Beef Dinner Special', 'cal': 400, 'fat': 20, 'carbs': 24, 'protein': 31},
        'pfc_swap_wonton_soup': {'name': 'Wonton Soup Bowl', 'cal': 480, 'fat': 14, 'carbs': 52, 'protein': 40},
        'pfc_swap_pepper_steak': {'name': 'Pepper Steak (no rice)', 'cal': 600, 'fat': 30, 'carbs': 30, 'protein': 48},
    }

    all_pass = True
    for meal_id, expected in official.items():
        c.execute("""
            SELECT
                COALESCE(SUM(i.calories * tmi.quantity), 0) as total_cal,
                COALESCE(SUM(i.total_fat_g * tmi.quantity), 0) as total_fat,
                COALESCE(SUM(i.carbohydrate_g * tmi.quantity), 0) as total_carbs,
                COALESCE(SUM(i.protein_g * tmi.quantity), 0) as total_protein
            FROM template_meal_ingredients tmi
            JOIN ingredients i ON i.id = tmi.ingredient_id
            WHERE tmi.template_meal_id = ?
        """, (meal_id,))
        row = c.fetchone()
        if not row or row[0] == 0:
            print(f"  FAIL  {expected['name']}: NO INGREDIENTS FOUND")
            all_pass = False
            continue

        actual_cal, actual_fat, actual_carbs, actual_protein = row
        cal_ok = abs(actual_cal - expected['cal']) <= 2
        fat_ok = abs(actual_fat - expected['fat']) <= 1
        carbs_ok = abs(actual_carbs - expected['carbs']) <= 1
        protein_ok = abs(actual_protein - expected['protein']) <= 1

        status = "PASS" if (cal_ok and fat_ok and carbs_ok and protein_ok) else "FAIL"
        if status == "FAIL":
            all_pass = False

        print(f"  {status}  {expected['name']}")
        print(f"         Expected: {expected['cal']} cal, {expected['fat']}g fat, {expected['carbs']}g carbs, {expected['protein']}g protein")
        print(f"         Actual:   {int(actual_cal)} cal, {actual_fat:.0f}g fat, {actual_carbs:.0f}g carbs, {actual_protein:.0f}g protein")
        if status == "FAIL":
            print(f"         DELTA:    cal={actual_cal - expected['cal']:+.0f}, fat={actual_fat - expected['fat']:+.1f}, carbs={actual_carbs - expected['carbs']:+.1f}, protein={actual_protein - expected['protein']:+.1f}")
        print()

    # ── 4. SUMMARY ──────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM ingredients WHERE restaurant_id = 'pfchangs'")
    ing_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM template_meals WHERE restaurant_id = 'pfchangs'")
    tm_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM template_meals WHERE restaurant_id = 'pfchangs' AND is_swap = 0")
    enemy_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM template_meals WHERE restaurant_id = 'pfchangs' AND is_swap = 1")
    swap_count = c.fetchone()[0]

    print("=" * 70)
    print(f"SUMMARY: {ing_count} ingredients, {tm_count} template meals ({enemy_count} enemy, {swap_count} swaps)")
    if all_pass:
        print("ALL VERIFICATIONS PASSED")
    else:
        print("SOME VERIFICATIONS FAILED — check output above")
    print("=" * 70)

    conn.close()

    # ── 5. RE-EMBED ─────────────────────────────────────────
    if all_pass:
        print("\nRunning embed_foods.py...")
        embed_script = os.path.join(os.path.dirname(__file__), "embed_foods.py")
        subprocess.run([sys.executable, embed_script], check=True)
        print("Embedding complete!")
    else:
        print("\nSkipping embedding due to verification failures.")
        sys.exit(1)


if __name__ == "__main__":
    rebuild()
