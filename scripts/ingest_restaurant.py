#!/usr/bin/env python3
"""Generic restaurant nutrition ingestion framework.

Usage:
    # From a JSON data file:
    python ingest_restaurant.py data/chipotle.json
    python ingest_restaurant.py data/cava.json --force

    # Validate only (no database writes):
    python ingest_restaurant.py data/chipotle.json --validate-only

JSON Format:
    {
        "restaurant": {
            "id": "chipotle",
            "name": "Chipotle Mexican Grill",
            "logo_emoji": "...",
            "cuisine": "Mexican",
            "website": "https://...",
            "nutrition_source": "PDF filename or URL"
        },
        "meal_ranges": {
            "burrito": [740, 1210],
            "bowl": [420, 910]
        },
        "categories": [
            {
                "id": "chipotle_shells",
                "name": "Shells & Tortillas",
                "display_order": 1,
                "selection_type": "single",
                "description": "Base wrapper"
            }
        ],
        "ingredients": [
            {
                "id": "chip_flour_tortilla_burrito",
                "category_id": "chipotle_shells",
                "name": "Flour Tortilla (Burrito)",
                "portion_size": "1 ea",
                "calories": 320,
                "calories_from_fat": 80,
                "total_fat_g": 9,
                "saturated_fat_g": 0.5,
                "trans_fat_g": 0,
                "cholesterol_mg": 0,
                "sodium_mg": 600,
                "carbohydrate_g": 50,
                "dietary_fiber_g": 3,
                "sugar_g": 0,
                "protein_g": 8,
                "is_default": false,
                "is_premium": false
            }
        ],
        "template_meals": [
            {
                "id": "chip_chicken_burrito",
                "name": "Chicken Burrito",
                "description": "...",
                "meal_type": "burrito",
                "is_swap": false,
                "swap_for": null,
                "swap_rationale": null,
                "ingredients": [
                    "chip_flour_tortilla_burrito",
                    {"id": "chip_crispy_corn_tortilla", "quantity": 3}
                ]
            }
        ]
    }
"""

import sqlite3
import json
import os
import sys

from nutrition_validator import (
    validate_ingredient,
    validate_meal_total,
    print_validation_report,
    summarize_validation,
)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")


def load_data(json_path):
    """Load restaurant data from JSON file."""
    with open(json_path) as f:
        return json.load(f)


def ingest_restaurant(data, force=False, validate_only=False):
    """Ingest a restaurant's nutrition data with full validation.

    Args:
        data: Parsed JSON dict with restaurant, categories, ingredients, template_meals
        force: If True, delete existing data for this restaurant first
        validate_only: If True, validate but don't write to database
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    restaurant = data["restaurant"]
    rest_id = restaurant["id"]

    # Check existing
    existing_ingredients = c.execute(
        "SELECT COUNT(*) FROM ingredients WHERE restaurant_id = ?", (rest_id,)
    ).fetchone()[0]
    restaurant_exists = c.execute(
        "SELECT COUNT(*) FROM restaurants WHERE id = ?", (rest_id,)
    ).fetchone()[0] > 0
    has_existing_data = existing_ingredients > 0 or restaurant_exists

    if has_existing_data and not force and not validate_only:
        print(
            f"{restaurant['name']} already exists ({existing_ingredients} ingredients). "
            "Use --force to re-ingest."
        )
        conn.close()
        return False

    if has_existing_data and force:
        if validate_only:
            print(
                f"Validate-only mode: keeping existing {restaurant['name']} data in DB."
            )
        else:
            print(f"Force mode: clearing existing {restaurant['name']} data...")
            c.execute("DELETE FROM template_meal_ingredients WHERE template_meal_id IN "
                      "(SELECT id FROM template_meals WHERE restaurant_id = ?)", (rest_id,))
            c.execute("DELETE FROM template_meals WHERE restaurant_id = ?", (rest_id,))
            c.execute("DELETE FROM ingredients WHERE restaurant_id = ?", (rest_id,))
            c.execute("DELETE FROM menu_categories WHERE restaurant_id = ?", (rest_id,))
            c.execute("DELETE FROM restaurants WHERE id = ?", (rest_id,))

    header = f"{restaurant['name'].upper()} NUTRITION INGESTION"
    print(f"\n{'=' * 60}")
    print(header)
    if restaurant.get("nutrition_source"):
        print(f"Source: {restaurant['nutrition_source']}")
    if validate_only:
        print("MODE: VALIDATE ONLY (no database writes)")
    print(f"{'=' * 60}")

    # ── Restaurant ──────────────────────────────────────
    if not validate_only:
        c.execute("""
            INSERT INTO restaurants (id, name, logo_emoji, cuisine, website, nutrition_source, food_keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (rest_id, restaurant["name"], restaurant.get("logo_emoji", ""),
              restaurant.get("cuisine", ""), restaurant.get("website", ""),
              restaurant.get("nutrition_source", ""), restaurant.get("food_keywords", "")))
    print(f"\n[+] Restaurant: {restaurant['name']}")

    # ── Categories ──────────────────────────────────────
    categories = data.get("categories", [])
    for cat in categories:
        if not validate_only:
            c.execute("""
                INSERT INTO menu_categories (id, restaurant_id, name, display_order, selection_type, description)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (cat["id"], rest_id, cat["name"],
                  cat.get("display_order", 0), cat.get("selection_type", "single"),
                  cat.get("description", "")))
    print(f"[+] Categories: {len(categories)}")

    # ── Ingredients (with validation) ───────────────────
    ingredients = data.get("ingredients", [])
    print(f"\n--- Validating {len(ingredients)} ingredients ---")

    ingredients_data = {}
    errors_total = 0
    warnings_total = 0

    for ing in ingredients:
        nutrition = {
            "calories": ing["calories"],
            "calories_from_fat": ing.get("calories_from_fat", 0),
            "total_fat_g": ing.get("total_fat_g", 0),
            "saturated_fat_g": ing.get("saturated_fat_g", 0),
            "trans_fat_g": ing.get("trans_fat_g", 0),
            "cholesterol_mg": ing.get("cholesterol_mg", 0),
            "sodium_mg": ing.get("sodium_mg", 0),
            "carbohydrate_g": ing.get("carbohydrate_g", 0),
            "dietary_fiber_g": ing.get("dietary_fiber_g", 0),
            "sugar_g": ing.get("sugar_g", 0),
            "protein_g": ing.get("protein_g", 0),
        }

        is_valid, issues = validate_ingredient(ing["name"], nutrition)
        print_validation_report(ing["name"], ing.get("portion_size", ""), is_valid, issues)

        if not is_valid:
            errors_total += 1
            continue

        if issues:
            warnings_total += 1

        ingredients_data[ing["id"]] = nutrition

        if not validate_only:
            c.execute("""
                INSERT INTO ingredients
                (id, restaurant_id, category_id, name, portion_size,
                 calories, calories_from_fat, total_fat_g, saturated_fat_g, trans_fat_g,
                 cholesterol_mg, sodium_mg, carbohydrate_g, dietary_fiber_g, sugar_g, protein_g,
                 is_default, is_premium, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ing["id"], rest_id, ing.get("category_id"),
                ing["name"], ing.get("portion_size", ""),
                ing["calories"], ing.get("calories_from_fat", 0),
                ing.get("total_fat_g", 0), ing.get("saturated_fat_g", 0),
                ing.get("trans_fat_g", 0), ing.get("cholesterol_mg", 0),
                ing.get("sodium_mg", 0), ing.get("carbohydrate_g", 0),
                ing.get("dietary_fiber_g", 0), ing.get("sugar_g", 0),
                ing.get("protein_g", 0),
                1 if ing.get("is_default") else 0,
                1 if ing.get("is_premium") else 0,
                restaurant.get("nutrition_source", ""),
            ))

    summarize_validation(len(ingredients), len(ingredients) - errors_total, errors_total, warnings_total)

    # ── Template Meals ──────────────────────────────────
    meals = data.get("template_meals", [])
    meal_ranges = {k: tuple(v) for k, v in data.get("meal_ranges", {}).items()}

    if meals:
        print(f"\n--- Validating {len(meals)} template meals ---")

        for meal in meals:
            # Normalize ingredients to (id, qty) pairs
            normalized = []
            for item in meal.get("ingredients", []):
                if isinstance(item, dict):
                    normalized.append((item["id"], item.get("quantity", 1)))
                elif isinstance(item, str):
                    normalized.append((item, 1))

            # Sum nutrition
            total_cal = 0
            total_prot = 0
            total_carbs = 0
            total_fat = 0
            missing = []

            for iid, qty in normalized:
                if iid in ingredients_data:
                    total_cal += ingredients_data[iid]["calories"] * qty
                    total_prot += ingredients_data[iid]["protein_g"] * qty
                    total_carbs += ingredients_data[iid]["carbohydrate_g"] * qty
                    total_fat += ingredients_data[iid]["total_fat_g"] * qty
                else:
                    missing.append(iid)

            if missing:
                print(f"\n  FAIL: {meal['name']} — missing: {missing}")
                continue

            # Cross-check
            meal_warnings = validate_meal_total(meal["name"], total_cal, meal_ranges)
            status = "WARN" if meal_warnings else "OK"
            for w in meal_warnings:
                print(f"  {w}")
            print(f"  {status}: {meal['name']} = {total_cal:.0f} cal, {total_prot:.0f}g P, "
                  f"{total_carbs:.0f}g C, {total_fat:.1f}g F")

            if not validate_only:
                c.execute("""
                    INSERT INTO template_meals
                    (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    meal["id"], rest_id, meal["name"],
                    meal.get("description", ""), meal.get("meal_type", ""),
                    1 if meal.get("is_swap") else 0,
                    meal.get("swap_for"), meal.get("swap_rationale"),
                    meal.get("display_order", 0),
                ))

                # Insert ingredient links (aggregate quantities)
                qty_map = {}
                for iid, qty in normalized:
                    qty_map[iid] = qty_map.get(iid, 0) + qty

                for iid, qty in qty_map.items():
                    c.execute("""
                        INSERT INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity)
                        VALUES (?, ?, ?)
                    """, (meal["id"], iid, qty))

    # ── Swap Summary ────────────────────────────────────
    if not validate_only and meals:
        conn.commit()
        swaps = c.execute("""
            SELECT t.name, t.swap_for FROM template_meals t
            WHERE t.is_swap = 1 AND t.restaurant_id = ?
        """, (rest_id,)).fetchall()

        if swaps:
            print("\n--- Swap Savings ---")
            for swap_name, orig_id in swaps:
                orig_cal = c.execute("""
                    SELECT SUM(i.calories * tmi.quantity) FROM template_meal_ingredients tmi
                    JOIN ingredients i ON i.id = tmi.ingredient_id
                    WHERE tmi.template_meal_id = ?
                """, (orig_id,)).fetchone()[0] or 0

                swap_meal_id = c.execute(
                    "SELECT id FROM template_meals WHERE name = ? AND restaurant_id = ?",
                    (swap_name, rest_id)
                ).fetchone()
                if swap_meal_id:
                    swap_cal = c.execute("""
                        SELECT SUM(i.calories * tmi.quantity) FROM template_meal_ingredients tmi
                        JOIN ingredients i ON i.id = tmi.ingredient_id
                        WHERE tmi.template_meal_id = ?
                    """, (swap_meal_id[0],)).fetchone()[0] or 0
                    savings = orig_cal - swap_cal
                    print(f"  {swap_name}: {swap_cal:.0f} cal (saves {savings:.0f} cal)")

    if not validate_only:
        conn.commit()

    conn.close()

    print(f"\n{'=' * 60}")
    print("COMPLETE" + (" (validate only)" if validate_only else ""))
    print(f"{'=' * 60}")
    return errors_total == 0


def main():
    if len(sys.argv) < 2:
        print("Usage: python ingest_restaurant.py <data.json> [--force] [--validate-only]")
        print("\nSee docstring for JSON format specification.")
        sys.exit(1)

    json_path = sys.argv[1]
    force = "--force" in sys.argv
    validate_only = "--validate-only" in sys.argv

    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        sys.exit(1)

    data = load_data(json_path)
    success = ingest_restaurant(data, force=force, validate_only=validate_only)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
