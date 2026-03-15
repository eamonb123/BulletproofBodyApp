#!/usr/bin/env python3
"""Ingest Chipotle nutrition data into the ingredient-level database.

Source: US-Nutrition-Facts-Paper-Menu-3-2025.pdf (Chipotle official)
All values transcribed directly from the PDF nutrition table.

VALIDATION: Every ingredient is sanity-checked before insertion:
  1. Range checks (calories 0-2000, protein 0-100g per serving, etc.)
  2. Macro math: calories ~= (protein*4 + carbs*4 + fat*9) within 20% tolerance
  3. Template meal totals cross-checked against Chipotle's stated ranges
  4. Any failures are flagged loudly, not silently inserted
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")

# ══════════════════════════════════════════════════════════
# VALIDATION ENGINE
# ══════════════════════════════════════════════════════════

VALID_RANGES = {
    "calories":        (0, 2000),
    "calories_from_fat": (0, 1500),
    "total_fat_g":     (0, 120),
    "saturated_fat_g": (0, 50),
    "trans_fat_g":     (0, 10),
    "cholesterol_mg":  (0, 600),
    "sodium_mg":       (0, 3000),
    "carbohydrate_g":  (0, 300),
    "dietary_fiber_g": (0, 50),
    "sugar_g":         (0, 150),
    "protein_g":       (0, 100),
}

MACRO_TOLERANCE = 0.20  # 20% tolerance for macro math check


def validate_ingredient(name, data):
    """Validate a single ingredient's nutrition data.

    Returns (is_valid, warnings) where warnings is a list of strings.
    Raises ValueError for hard failures (out of range).
    """
    warnings = []
    errors = []

    # Range checks
    for field, (low, high) in VALID_RANGES.items():
        val = data.get(field, 0)
        if val is None:
            val = 0
        if val < low or val > high:
            errors.append(f"  {field}={val} outside range [{low}, {high}]")

    # Macro math check: calories should roughly equal protein*4 + carbs*4 + fat*9
    cal = data.get("calories", 0)
    prot = data.get("protein_g", 0)
    carbs = data.get("carbohydrate_g", 0)
    fat = data.get("total_fat_g", 0)

    if cal > 0:
        expected_cal = (prot * 4) + (carbs * 4) + (fat * 9)
        if expected_cal > 0:
            ratio = cal / expected_cal
            if ratio < (1 - MACRO_TOLERANCE) or ratio > (1 + MACRO_TOLERANCE):
                warnings.append(
                    f"  Macro math: stated {cal} cal vs computed {expected_cal:.0f} cal "
                    f"(P:{prot}*4 + C:{carbs}*4 + F:{fat}*9) — ratio {ratio:.2f}"
                )

    # Calories from fat check: should roughly equal fat * 9
    cal_from_fat = data.get("calories_from_fat", 0)
    if cal_from_fat > 0 and fat > 0:
        expected_cff = fat * 9
        if abs(cal_from_fat - expected_cff) > expected_cff * 0.25:
            warnings.append(
                f"  Cal-from-fat: stated {cal_from_fat} vs fat*9={expected_cff:.0f}"
            )

    if errors:
        return False, errors
    return True, warnings


def validate_template_meal(name, total_cal, chipotle_ranges):
    """Cross-check a template meal's total against Chipotle's stated ranges."""
    meal_type = None
    for mt, (low, high) in chipotle_ranges.items():
        if mt in name.lower():
            meal_type = mt
            break

    warnings = []
    if meal_type and meal_type in chipotle_ranges:
        low, high = chipotle_ranges[meal_type]
        if total_cal < low or total_cal > high:
            warnings.append(
                f"  Meal '{name}' total {total_cal} cal outside Chipotle range "
                f"[{low}, {high}] for {meal_type}"
            )
    return warnings


# ══════════════════════════════════════════════════════════
# CHIPOTLE DATA (transcribed from PDF)
# ══════════════════════════════════════════════════════════

RESTAURANT = {
    "id": "chipotle",
    "name": "Chipotle Mexican Grill",
    "logo_emoji": "🌯",
    "cuisine": "Mexican",
    "website": "https://www.chipotle.com",
    "nutrition_source": "US-Nutrition-Facts-Paper-Menu-3-2025.pdf",
}

# Chipotle's stated meal calorie ranges (from page 1 of PDF)
MEAL_RANGES = {
    "burrito": (740, 1210),
    "bowl":    (420, 910),
    "tacos":   (390, 1140),
    "salad":   (420, 910),
}

CATEGORIES = [
    ("chipotle_shells",    "chipotle", "Shells & Tortillas", 1, "single",   "Base wrapper"),
    ("chipotle_rice",      "chipotle", "Rice",               2, "single",   "Rice choice"),
    ("chipotle_beans",     "chipotle", "Beans",              3, "single",   "Bean choice"),
    ("chipotle_protein",   "chipotle", "Protein",            4, "single",   "Protein choice"),
    ("chipotle_salsa",     "chipotle", "Salsa",              5, "multiple", "Salsa choices"),
    ("chipotle_toppings",  "chipotle", "Toppings",           6, "multiple", "Additional toppings"),
    ("chipotle_extras",    "chipotle", "Extras",             7, "multiple", "Premium extras"),
    ("chipotle_sides",     "chipotle", "Sides",              8, "optional", "Side items"),
    ("chipotle_drinks",    "chipotle", "Drinks",             9, "optional", "Beverages"),
]

# Each ingredient: (id, restaurant_id, category_id, name, portion_size,
#   calories, cal_from_fat, total_fat, sat_fat, trans_fat,
#   cholesterol, sodium, carbs, fiber, sugar, protein,
#   is_default, is_premium, source)
#
# ALL VALUES from PDF nutrition table pages 2-3
INGREDIENTS = [
    # ── Shells & Tortillas ──────────────────────────────
    ("chip_flour_tortilla_burrito", "chipotle", "chipotle_shells", "Flour Tortilla (Burrito)", "1 ea",
     320, 80, 9, 0.5, 0,  0, 600, 50, 3, 0, 8,  1, 0, "chipotle_pdf_2025"),
    ("chip_flour_tortilla_taco", "chipotle", "chipotle_shells", "Flour Tortilla (Taco)", "1 ea",
     80, 25, 2.5, 0, 0,  0, 160, 13, 0, 0, 2,  0, 0, "chipotle_pdf_2025"),
    ("chip_crispy_corn_tortilla", "chipotle", "chipotle_shells", "Crispy Corn Tortilla", "1 ea",
     70, 25, 3, 0, 0,  0, 10, 10, 1, 0, 1,  0, 0, "chipotle_pdf_2025"),

    # ── Rice ────────────────────────────────────────────
    ("chip_brown_rice", "chipotle", "chipotle_rice", "Cilantro-Lime Brown Rice", "4 oz",
     210, 50, 6, 0, 0,  0, 190, 36, 2, 0, 4,  1, 0, "chipotle_pdf_2025"),
    ("chip_white_rice", "chipotle", "chipotle_rice", "Cilantro-Lime White Rice", "4 oz",
     210, 35, 4, 1, 0,  0, 350, 40, 1, 0, 4,  0, 0, "chipotle_pdf_2025"),

    # ── Beans ───────────────────────────────────────────
    ("chip_black_beans", "chipotle", "chipotle_beans", "Black Beans", "4 oz",
     130, 15, 1.5, 0, 0,  0, 210, 22, 7, 2, 8,  1, 0, "chipotle_pdf_2025"),
    ("chip_pinto_beans", "chipotle", "chipotle_beans", "Pinto Beans", "4 oz",
     130, 15, 1.5, 0, 0,  0, 210, 21, 8, 1, 8,  0, 0, "chipotle_pdf_2025"),

    # ── Fajita Veggies ──────────────────────────────────
    ("chip_fajita_veggies", "chipotle", "chipotle_toppings", "Fajita Veggies", "2 oz",
     20, 0, 0, 0, 0,  0, 150, 5, 1, 2, 1,  0, 0, "chipotle_pdf_2025"),

    # ── Proteins ────────────────────────────────────────
    ("chip_chicken", "chipotle", "chipotle_protein", "Chicken", "4 oz",
     180, 60, 7, 3, 0,  125, 310, 0, 0, 0, 32,  1, 0, "chipotle_pdf_2025"),
    ("chip_steak", "chipotle", "chipotle_protein", "Steak", "4 oz",
     150, 60, 6, 2.5, 0,  80, 330, 1, 1, 0, 21,  0, 1, "chipotle_pdf_2025"),
    ("chip_barbacoa", "chipotle", "chipotle_protein", "Barbacoa", "4 oz",
     170, 60, 7, 2.5, 0,  65, 530, 2, 1, 0, 24,  0, 1, "chipotle_pdf_2025"),
    ("chip_carnitas", "chipotle", "chipotle_protein", "Carnitas", "4 oz",
     210, 120, 12, 7, 0,  65, 450, 0, 0, 0, 23,  0, 0, "chipotle_pdf_2025"),
    ("chip_sofritas", "chipotle", "chipotle_protein", "Sofritas", "4 oz",
     150, 80, 10, 1.5, 0,  0, 560, 9, 3, 5, 8,  0, 0, "chipotle_pdf_2025"),
    ("chip_veggie", "chipotle", "chipotle_protein", "Veggie (Guacamole + Beans)", "4 oz",
     230, 170, 18, 12, 1,  60, 490, 7, 0, 2, 10,  0, 0, "chipotle_pdf_2025"),

    # ── Salsas ──────────────────────────────────────────
    ("chip_fresh_tomato_salsa", "chipotle", "chipotle_salsa", "Fresh Tomato Salsa", "4 oz",
     25, 0, 0, 0, 0,  0, 550, 4, 1, 1, 0,  1, 0, "chipotle_pdf_2025"),
    ("chip_roasted_chili_corn", "chipotle", "chipotle_salsa", "Roasted Chili-Corn Salsa", "4 oz",
     80, 15, 1.5, 0, 0,  0, 330, 16, 3, 4, 3,  0, 0, "chipotle_pdf_2025"),
    ("chip_tomatillo_green", "chipotle", "chipotle_salsa", "Tomatillo-Green Chili Salsa", "2 fl oz",
     15, 5, 0, 0, 0,  0, 260, 4, 0, 2, 0,  0, 0, "chipotle_pdf_2025"),
    ("chip_tomatillo_red", "chipotle", "chipotle_salsa", "Tomatillo-Red Chili Salsa", "2 fl oz",
     30, 5, 0, 0, 0,  0, 500, 4, 1, 1, 0,  0, 0, "chipotle_pdf_2025"),

    # ── Toppings ────────────────────────────────────────
    ("chip_cheese", "chipotle", "chipotle_toppings", "Cheese", "1 oz",
     110, 70, 8, 5, 0,  30, 190, 1, 0, 0, 6,  0, 0, "chipotle_pdf_2025"),
    ("chip_sour_cream", "chipotle", "chipotle_toppings", "Sour Cream", "2 oz",
     110, 90, 9, 7, 0,  40, 30, 2, 0, 2, 2,  0, 0, "chipotle_pdf_2025"),
    ("chip_romaine_lettuce", "chipotle", "chipotle_toppings", "Romaine Lettuce", "1 oz",
     5, 0, 0, 0, 0,  0, 5, 1, 1, 0, 0,  0, 0, "chipotle_pdf_2025"),
    ("chip_supergreens", "chipotle", "chipotle_toppings", "Supergreens Salad Mix", "3 oz",
     15, 0, 0, 0, 0,  0, 15, 3, 2, 1, 1,  0, 0, "chipotle_pdf_2025"),

    # ── Extras (premium) ────────────────────────────────
    ("chip_guac_side", "chipotle", "chipotle_extras", "Guacamole (topping/side)", "4 oz",
     230, 190, 22, 3.5, 0,  0, 370, 8, 6, 1, 2,  0, 1, "chipotle_pdf_2025"),
    ("chip_queso_blanco_side", "chipotle", "chipotle_extras", "Queso Blanco (side)", "4 oz",
     230, 170, 18, 12, 1,  60, 490, 7, 0, 2, 10,  0, 1, "chipotle_pdf_2025"),

    # ── Sides ───────────────────────────────────────────
    ("chip_chips_regular", "chipotle", "chipotle_sides", "Chips (regular)", "4 oz",
     540, 230, 25, 3.5, 0,  0, 390, 73, 7, 1, 7,  0, 0, "chipotle_pdf_2025"),
    ("chip_chips_large", "chipotle", "chipotle_sides", "Chips (large)", "6 oz",
     810, 350, 38, 5, 0,  0, 590, 110, 11, 2, 11,  0, 0, "chipotle_pdf_2025"),
    ("chip_chips_guac", "chipotle", "chipotle_sides", "Chips & Guacamole", "~6 oz",
     770, 420, 47, 7, 0,  0, 760, 81, 13, 2, 9,  0, 0, "chipotle_pdf_2025"),
    ("chip_chips_queso", "chipotle", "chipotle_sides", "Chips & Queso Blanco", "~6 oz",
     780, 400, 43, 15.5, 1,  60, 880, 80, 7, 3, 17,  0, 0, "chipotle_pdf_2025"),

    # ── Dressing ────────────────────────────────────────
    ("chip_honey_vinaigrette", "chipotle", "chipotle_toppings", "Chipotle-Honey Vinaigrette", "2 fl oz",
     220, 140, 16, 2.5, 0,  0, 450, 18, 1, 2, 1,  0, 0, "chipotle_pdf_2025"),
]

# ── Template Meals ──────────────────────────────────────
# Common orders Joel would build at Chipotle
TEMPLATE_MEALS = [
    # --- THE ORIGINALS (what Joel orders now) ---
    {
        "id": "chip_chicken_burrito",
        "name": "Chicken Burrito",
        "description": "The classic: flour tortilla, white rice, black beans, chicken, cheese, sour cream",
        "meal_type": "burrito",
        "is_swap": False,
        "ingredients": [
            "chip_flour_tortilla_burrito", "chip_white_rice", "chip_black_beans",
            "chip_chicken", "chip_cheese", "chip_sour_cream",
            "chip_fresh_tomato_salsa",
        ],
    },
    {
        "id": "chip_chicken_bowl",
        "name": "Chicken Bowl",
        "description": "White rice, black beans, chicken, cheese, sour cream, salsa in a bowl",
        "meal_type": "bowl",
        "is_swap": False,
        "ingredients": [
            "chip_white_rice", "chip_black_beans", "chip_chicken",
            "chip_cheese", "chip_sour_cream", "chip_fresh_tomato_salsa",
        ],
    },
    {
        "id": "chip_steak_burrito",
        "name": "Steak Burrito",
        "description": "Flour tortilla, white rice, pinto beans, steak, cheese, sour cream, corn salsa",
        "meal_type": "burrito",
        "is_swap": False,
        "ingredients": [
            "chip_flour_tortilla_burrito", "chip_white_rice", "chip_pinto_beans",
            "chip_steak", "chip_cheese", "chip_sour_cream",
            "chip_roasted_chili_corn",
        ],
    },
    {
        "id": "chip_barbacoa_bowl",
        "name": "Barbacoa Bowl",
        "description": "White rice, black beans, barbacoa, cheese, sour cream",
        "meal_type": "bowl",
        "is_swap": False,
        "ingredients": [
            "chip_white_rice", "chip_black_beans", "chip_barbacoa",
            "chip_cheese", "chip_sour_cream", "chip_fresh_tomato_salsa",
        ],
    },
    {
        "id": "chip_chicken_tacos",
        "name": "Chicken Tacos (3)",
        "description": "3 crispy corn tortillas, chicken, cheese, salsa, lettuce",
        "meal_type": "tacos",
        "is_swap": False,
        "ingredients": [
            ("chip_crispy_corn_tortilla", 3),
            "chip_chicken", "chip_cheese", "chip_fresh_tomato_salsa",
            "chip_romaine_lettuce",
        ],
    },

    # --- THE SWAPS (what we recommend) ---
    {
        "id": "chip_chicken_bowl_lean",
        "name": "Lean Chicken Bowl",
        "description": "Brown rice, black beans, chicken, fajita veggies, salsa, lettuce — no cheese, no sour cream",
        "meal_type": "bowl",
        "is_swap": True,
        "swap_for": "chip_chicken_burrito",
        "swap_rationale": "Skip the tortilla (320 cal), cheese (110 cal), and sour cream (110 cal). Add fajita veggies for volume. Same Chipotle, ~500 fewer calories.",
        "ingredients": [
            "chip_brown_rice", "chip_black_beans", "chip_chicken",
            "chip_fajita_veggies", "chip_fresh_tomato_salsa",
            "chip_tomatillo_green", "chip_romaine_lettuce",
        ],
    },
    {
        "id": "chip_steak_bowl_lean",
        "name": "Lean Steak Bowl",
        "description": "Brown rice, pinto beans, steak, fajita veggies, salsa, lettuce",
        "meal_type": "bowl",
        "is_swap": True,
        "swap_for": "chip_steak_burrito",
        "swap_rationale": "Drop the tortilla and sour cream. Steak is already leaner than you think — 150 cal for 21g protein.",
        "ingredients": [
            "chip_brown_rice", "chip_pinto_beans", "chip_steak",
            "chip_fajita_veggies", "chip_roasted_chili_corn",
            "chip_romaine_lettuce",
        ],
    },
    {
        "id": "chip_barbacoa_bowl_lean",
        "name": "Lean Barbacoa Bowl",
        "description": "Brown rice, black beans, barbacoa, fajita veggies, salsa, lettuce — no guac, no sour cream",
        "meal_type": "bowl",
        "is_swap": True,
        "swap_for": "chip_barbacoa_bowl",
        "swap_rationale": "Guac is 230 cal and sour cream is 110 cal. That's 340 cal of toppings. Barbacoa + salsa is already flavorful.",
        "ingredients": [
            "chip_brown_rice", "chip_black_beans", "chip_barbacoa",
            "chip_fajita_veggies", "chip_fresh_tomato_salsa",
            "chip_tomatillo_green", "chip_romaine_lettuce",
        ],
    },
    {
        "id": "chip_chicken_salad",
        "name": "Chicken Supergreens Salad",
        "description": "Supergreens base, chicken, fajita veggies, corn salsa, tomatillo green — no rice, no cheese",
        "meal_type": "salad",
        "is_swap": True,
        "swap_for": "chip_chicken_bowl",
        "swap_rationale": "Swap the rice base for supergreens. Keeps the protein, drops 210 cal from rice alone.",
        "ingredients": [
            "chip_supergreens", "chip_chicken", "chip_fajita_veggies",
            "chip_roasted_chili_corn", "chip_tomatillo_green",
        ],
    },
    {
        "id": "chip_chicken_tacos_lean",
        "name": "Lean Chicken Tacos (2)",
        "description": "2 crispy corn tortillas, chicken, fajita veggies, salsa, lettuce - keep the taco vibe with fewer shell/cheese calories",
        "meal_type": "tacos",
        "is_swap": True,
        "swap_for": "chip_chicken_tacos",
        "swap_rationale": "Drop one shell and skip cheese. Add fajita veggies + green salsa for volume and flavor while keeping taco texture.",
        "ingredients": [
            ("chip_crispy_corn_tortilla", 2),
            "chip_chicken", "chip_fajita_veggies", "chip_fresh_tomato_salsa",
            "chip_tomatillo_green", "chip_romaine_lettuce",
        ],
    },
]


# ══════════════════════════════════════════════════════════
# INGEST
# ══════════════════════════════════════════════════════════

def ingest():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if already ingested
    existing = c.execute(
        "SELECT COUNT(*) FROM ingredients WHERE restaurant_id = 'chipotle'"
    ).fetchone()[0]
    if existing > 0:
        print(f"Chipotle already has {existing} ingredients. Use --force to re-ingest.")
        if "--force" not in sys.argv:
            conn.close()
            return
        # Clear existing Chipotle data
        print("Force mode: clearing existing Chipotle data...")
        c.execute("DELETE FROM template_meal_ingredients WHERE template_meal_id LIKE 'chip_%'")
        c.execute("DELETE FROM template_meals WHERE restaurant_id = 'chipotle'")
        c.execute("DELETE FROM ingredients WHERE restaurant_id = 'chipotle'")
        c.execute("DELETE FROM menu_categories WHERE restaurant_id = 'chipotle'")
        c.execute("DELETE FROM restaurants WHERE id = 'chipotle'")

    print("=" * 60)
    print("CHIPOTLE NUTRITION INGESTION")
    print("Source: US-Nutrition-Facts-Paper-Menu-3-2025.pdf")
    print("=" * 60)

    # ── Insert Restaurant ───────────────────────────────
    c.execute("""
        INSERT INTO restaurants (id, name, logo_emoji, cuisine, website, nutrition_source, food_keywords)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (RESTAURANT["id"], RESTAURANT["name"], RESTAURANT["logo_emoji"],
          RESTAURANT["cuisine"], RESTAURANT["website"], RESTAURANT["nutrition_source"],
          RESTAURANT.get("food_keywords", "")))
    print(f"\n[+] Restaurant: {RESTAURANT['name']}")

    # ── Insert Categories ───────────────────────────────
    for cat in CATEGORIES:
        c.execute("""
            INSERT INTO menu_categories (id, restaurant_id, name, display_order, selection_type, description)
            VALUES (?, ?, ?, ?, ?, ?)
        """, cat)
    print(f"[+] Categories: {len(CATEGORIES)}")

    # ── Validate & Insert Ingredients ───────────────────
    print(f"\n--- Validating {len(INGREDIENTS)} ingredients ---")
    ingredients_data = {}
    errors_total = 0
    warnings_total = 0

    for ing in INGREDIENTS:
        (iid, rest_id, cat_id, name, portion,
         cal, cal_fat, fat, sat_fat, trans_fat,
         chol, sodium, carbs, fiber, sugar, protein,
         is_default, is_premium, source) = ing

        data = {
            "calories": cal,
            "calories_from_fat": cal_fat,
            "total_fat_g": fat,
            "saturated_fat_g": sat_fat,
            "trans_fat_g": trans_fat,
            "cholesterol_mg": chol,
            "sodium_mg": sodium,
            "carbohydrate_g": carbs,
            "dietary_fiber_g": fiber,
            "sugar_g": sugar,
            "protein_g": protein,
        }

        is_valid, issues = validate_ingredient(name, data)

        if not is_valid:
            print(f"\n  FAIL: {name} ({portion})")
            for e in issues:
                print(f"    {e}")
            errors_total += 1
            continue

        if issues:
            print(f"\n  WARN: {name} ({portion})")
            for w in issues:
                print(f"    {w}")
            warnings_total += 1

        ingredients_data[iid] = data

        c.execute("""
            INSERT INTO ingredients
            (id, restaurant_id, category_id, name, portion_size,
             calories, calories_from_fat, total_fat_g, saturated_fat_g, trans_fat_g,
             cholesterol_mg, sodium_mg, carbohydrate_g, dietary_fiber_g, sugar_g, protein_g,
             is_default, is_premium, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ing)

    inserted = len(INGREDIENTS) - errors_total
    print(f"\n[+] Ingredients: {inserted} inserted, {errors_total} errors, {warnings_total} warnings")

    if errors_total > 0:
        print("\n*** HARD ERRORS FOUND — review data above before using ***")

    # ── Validate & Insert Template Meals ────────────────
    print(f"\n--- Validating {len(TEMPLATE_MEALS)} template meals ---")

    for meal in TEMPLATE_MEALS:
        # Calculate total nutrition by summing ingredients
        total_cal = 0
        total_prot = 0
        total_carbs = 0
        total_fat = 0

        # Normalize ingredients to (id, qty) tuples
        normalized = []
        for item in meal["ingredients"]:
            if isinstance(item, tuple):
                normalized.append(item)
            else:
                normalized.append((item, 1))

        missing_ingredients = []
        for iid, qty in normalized:
            if iid in ingredients_data:
                total_cal += ingredients_data[iid]["calories"] * qty
                total_prot += ingredients_data[iid]["protein_g"] * qty
                total_carbs += ingredients_data[iid]["carbohydrate_g"] * qty
                total_fat += ingredients_data[iid]["total_fat_g"] * qty
            else:
                missing_ingredients.append(iid)

        if missing_ingredients:
            print(f"\n  FAIL: {meal['name']} — missing ingredients: {missing_ingredients}")
            continue

        # Cross-check against Chipotle's stated ranges
        meal_warnings = validate_template_meal(
            meal["name"], total_cal, MEAL_RANGES
        )

        status = "OK"
        if meal_warnings:
            status = "WARN"
            for w in meal_warnings:
                print(f"  {w}")

        print(f"  {status}: {meal['name']} = {total_cal} cal, {total_prot}g P, "
              f"{total_carbs}g C, {total_fat}g F")

        c.execute("""
            INSERT INTO template_meals
            (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            meal["id"], "chipotle", meal["name"], meal["description"],
            meal["meal_type"], 1 if meal["is_swap"] else 0,
            meal.get("swap_for"), meal.get("swap_rationale"),
            meal.get("display_order", 0),
        ))

        # Insert ingredient links (aggregate quantities for duplicates)
        qty_map = {}
        for item in meal["ingredients"]:
            if isinstance(item, tuple):
                iid, qty = item
            else:
                iid, qty = item, 1
            qty_map[iid] = qty_map.get(iid, 0) + qty

        for iid, qty in qty_map.items():
            c.execute("""
                INSERT INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity)
                VALUES (?, ?, ?)
            """, (meal["id"], iid, qty))

    # ── Summary ─────────────────────────────────────────
    conn.commit()

    # Verify swap savings
    print("\n--- Swap Comparison ---")
    swaps = c.execute("""
        SELECT t.name, t.swap_for, t.swap_rationale
        FROM template_meals t
        WHERE t.is_swap = 1 AND t.restaurant_id = 'chipotle'
    """).fetchall()

    for swap_name, orig_id, rationale in swaps:
        # Sum original
        orig_cal = c.execute("""
            SELECT SUM(i.calories * COALESCE(tmi.quantity, 1)) FROM template_meal_ingredients tmi
            JOIN ingredients i ON i.id = tmi.ingredient_id
            WHERE tmi.template_meal_id = ?
        """, (orig_id,)).fetchone()[0] or 0

        # Sum swap
        swap_cal = c.execute("""
            SELECT SUM(i.calories * COALESCE(tmi.quantity, 1)) FROM template_meal_ingredients tmi
            JOIN ingredients i ON i.id = tmi.ingredient_id
            WHERE tmi.template_meal_id = (
                SELECT id FROM template_meals WHERE name = ? AND restaurant_id = 'chipotle'
            )
        """, (swap_name,)).fetchone()[0] or 0

        savings = orig_cal - swap_cal
        print(f"  {swap_name}: {swap_cal} cal (saves {savings} cal vs {orig_id})")

    conn.close()

    print(f"\n{'=' * 60}")
    print("INGESTION COMPLETE")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    ingest()
