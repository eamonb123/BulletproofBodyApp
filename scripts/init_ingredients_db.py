#!/usr/bin/env python3
"""Add ingredient-level tables to the Bulletproof Body database.

New tables:
  - restaurants: Chain restaurants (Chipotle, Cava, etc.)
  - menu_categories: Categories within a restaurant (Proteins, Rice, Toppings)
  - ingredients: Individual ingredients with full nutrition per serving
  - template_meals: Pre-built common orders (composed of ingredients)
  - template_meal_ingredients: Junction table linking meals to ingredients
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")


def init_ingredient_tables():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    c = conn.cursor()

    # ── Restaurants ──────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS restaurants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            logo_emoji TEXT DEFAULT '',
            cuisine TEXT,
            website TEXT,
            nutrition_source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Menu Categories ─────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS menu_categories (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
            name TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            selection_type TEXT DEFAULT 'single',
            description TEXT
        )
    """)

    # ── Ingredients ─────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS ingredients (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
            category_id TEXT REFERENCES menu_categories(id),
            name TEXT NOT NULL,
            portion_size TEXT,
            calories INTEGER NOT NULL,
            calories_from_fat INTEGER DEFAULT 0,
            total_fat_g REAL DEFAULT 0,
            saturated_fat_g REAL DEFAULT 0,
            trans_fat_g REAL DEFAULT 0,
            cholesterol_mg REAL DEFAULT 0,
            sodium_mg REAL DEFAULT 0,
            carbohydrate_g REAL DEFAULT 0,
            dietary_fiber_g REAL DEFAULT 0,
            sugar_g REAL DEFAULT 0,
            protein_g REAL DEFAULT 0,
            is_default BOOLEAN DEFAULT 0,
            is_premium BOOLEAN DEFAULT 0,
            source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Template Meals ──────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS template_meals (
            id TEXT PRIMARY KEY,
            restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
            name TEXT NOT NULL,
            description TEXT,
            meal_type TEXT,
            is_swap BOOLEAN DEFAULT 0,
            swap_for TEXT REFERENCES template_meals(id),
            swap_rationale TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Template Meal Ingredients (junction) ────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS template_meal_ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_meal_id TEXT NOT NULL REFERENCES template_meals(id),
            ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
            quantity REAL DEFAULT 1.0,
            is_removable BOOLEAN DEFAULT 1,
            UNIQUE(template_meal_id, ingredient_id)
        )
    """)

    # ── Indexes ─────────────────────────────────────────
    c.execute("CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant ON ingredients(restaurant_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_template_meals_restaurant ON template_meals(restaurant_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_template_meal_ingredients_meal ON template_meal_ingredients(template_meal_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_template_meal_ingredients_ingredient ON template_meal_ingredients(ingredient_id)")

    conn.commit()
    conn.close()
    print(f"Ingredient tables initialized in {DB_PATH}")


if __name__ == "__main__":
    init_ingredient_tables()
