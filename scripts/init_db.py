#!/usr/bin/env python3
"""Initialize the Bulletproof Body SQLite database and seed with food data."""

import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    c = conn.cursor()

    # ── Food Items ────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS food_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            restaurant TEXT NOT NULL,
            cuisine TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'takeout',
            calories INTEGER NOT NULL,
            protein_g REAL NOT NULL,
            carbs_g REAL NOT NULL,
            fat_g REAL NOT NULL,
            fiber_g REAL DEFAULT 0,
            serving TEXT NOT NULL,
            emoji TEXT DEFAULT '',
            image_url TEXT,
            source TEXT,
            ingredients_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Serving Sizes ─────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS serving_sizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_item_id TEXT NOT NULL REFERENCES food_items(id),
            description TEXT NOT NULL,
            multiplier REAL DEFAULT 1.0,
            is_default BOOLEAN DEFAULT 0
        )
    """)

    # ── Food Swaps ────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS food_swaps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_id TEXT NOT NULL REFERENCES food_items(id),
            swap_id TEXT NOT NULL REFERENCES food_items(id),
            calorie_savings INTEGER NOT NULL,
            protein_gain REAL DEFAULT 0,
            same_restaurant BOOLEAN DEFAULT 1,
            rationale TEXT NOT NULL,
            difficulty TEXT DEFAULT 'easy',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── User Sessions ─────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            age INTEGER,
            weight_lbs REAL,
            height_inches REAL,
            gender TEXT,
            goal_weight_lbs REAL,
            rmr REAL,
            tdee REAL,
            daily_deficit REAL,
            weekly_fat_loss_lbs REAL,
            projected_goal_date TEXT,
            email TEXT,
            phone TEXT,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )
    """)

    # ── User Selections ──────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_selections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES user_sessions(id),
            original_food_id TEXT NOT NULL REFERENCES food_items(id),
            swap_food_id TEXT REFERENCES food_items(id),
            step INTEGER DEFAULT 0
        )
    """)

    # ── Funnel Events ─────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS funnel_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            event_type TEXT NOT NULL,
            event_data TEXT,
            screen_number INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Indexes ───────────────────────────────────────
    c.execute("CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_food_items_cuisine ON food_items(cuisine)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_food_swaps_original ON food_swaps(original_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email)")

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def seed_foods():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if already seeded
    count = c.execute("SELECT COUNT(*) FROM food_items").fetchone()[0]
    if count > 0:
        print(f"Database already has {count} food items. Skipping seed.")
        conn.close()
        return

    foods = [
        # ── Originals ──────────────────────────────
        ("chipotle_burrito", "Burrito", "Chipotle", "Mexican", "takeout", 1100, 52, 120, 42, 8, "1 burrito (rice, beans, chicken, sour cream, cheese)", "🌯"),
        ("pad_thai", "Pad Thai", "Thai", "Asian", "takeout", 900, 35, 110, 32, 3, "1 order with chicken", "🍜"),
        ("pepperoni_pizza", "Pepperoni Pizza", "Pizza", "American", "takeout", 700, 28, 72, 32, 3, "2 slices", "🍕"),
        ("tikka_masala", "Chicken Tikka Masala", "Indian", "Indian", "takeout", 1200, 45, 95, 55, 5, "1 order + naan + rice", "🍛"),
        ("burger_fries", "Burger + Fries", "Burger Joint", "American", "takeout", 1100, 42, 90, 55, 4, "1 burger + medium fries", "🍔"),
        ("poke_bowl", "Poke Bowl", "Poke", "Japanese", "takeout", 850, 38, 100, 28, 3, "1 bowl (white rice, spicy mayo)", "🥗"),
        ("orange_chicken", "Orange Chicken + Fried Rice", "Chinese", "Chinese", "takeout", 1400, 40, 160, 52, 3, "1 plate", "🥡"),
        ("chick_fil_a_combo", "Sandwich + Fries + Soda", "Chick-fil-A", "Fast Food", "takeout", 1300, 42, 140, 52, 4, "1 combo meal", "🐔"),
        ("caesar_wrap", "Chicken Caesar Wrap", "Deli", "American", "takeout", 780, 35, 55, 42, 3, "1 wrap", "🌮"),
        ("breakfast_burrito", "Breakfast Burrito", "Breakfast", "Breakfast", "takeout", 900, 32, 70, 50, 4, "1 burrito (bacon, egg, cheese, potatoes)", "🥚"),
        # ── Swaps ──────────────────────────────────
        ("chipotle_bowl", "Bowl (No Rice)", "Chipotle", "Mexican", "takeout", 540, 50, 35, 18, 10, "1 bowl (fajita veggies, chicken, salsa, lettuce)", "🥗"),
        ("basil_chicken", "Thai Basil Chicken", "Thai", "Asian", "takeout", 450, 40, 35, 15, 4, "1 order (half rice)", "🌿"),
        ("thin_crust_veggie", "Thin Crust Veggie", "Pizza", "American", "takeout", 420, 22, 48, 16, 4, "2 slices", "🍕"),
        ("tandoori_chicken", "Tandoori Chicken + Salad", "Indian", "Indian", "takeout", 550, 52, 20, 22, 5, "1 order + side salad", "🍗"),
        ("lettuce_wrap_burger", "Lettuce-Wrap Burger + Salad", "Burger Joint", "American", "takeout", 500, 38, 15, 30, 4, "1 burger (no bun) + side salad", "🥬"),
        ("poke_bowl_swap", "Poke Bowl (Brown Rice)", "Poke", "Japanese", "takeout", 550, 42, 60, 14, 5, "1 bowl (brown rice, no mayo, extra protein)", "🐟"),
        ("steamed_chicken_broccoli", "Steamed Chicken + Broccoli", "Chinese", "Chinese", "takeout", 550, 48, 45, 12, 6, "1 plate (brown rice)", "🥦"),
        ("chick_fil_a_swap", "Grilled Nuggets + Salad", "Chick-fil-A", "Fast Food", "takeout", 350, 38, 18, 10, 4, "12ct nuggets + side salad + water", "🥗"),
        ("grilled_chicken_salad", "Grilled Chicken Salad", "Deli", "American", "takeout", 400, 40, 15, 18, 5, "1 salad (dressing on side)", "🥗"),
        ("egg_white_wrap", "Egg White Wrap + Avocado", "Breakfast", "Breakfast", "takeout", 380, 28, 30, 16, 6, "1 wrap", "🥑"),
    ]

    c.executemany("""
        INSERT INTO food_items (id, name, restaurant, cuisine, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving, emoji)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, foods)

    swaps = [
        ("chipotle_burrito", "chipotle_bowl", 560, -2, 1, "Skip the tortilla and rice. Same Chipotle, 560 fewer calories.", "easy"),
        ("pad_thai", "basil_chicken", 450, 5, 1, "Thai basil chicken is packed with protein and half the carbs.", "easy"),
        ("pepperoni_pizza", "thin_crust_veggie", 280, -6, 1, "Thin crust + veggies. Still pizza. 280 calories lighter.", "easy"),
        ("tikka_masala", "tandoori_chicken", 650, 7, 1, "Tandoori is grilled, not swimming in cream sauce. Same spices, half the calories.", "easy"),
        ("burger_fries", "lettuce_wrap_burger", 600, -4, 1, "Ditch the bun and fries. You keep the burger — that's the part you actually want.", "easy"),
        ("poke_bowl", "poke_bowl_swap", 300, 4, 1, "Brown rice + extra protein, skip the spicy mayo. Same bowl, 300 calories saved.", "easy"),
        ("orange_chicken", "steamed_chicken_broccoli", 850, 8, 1, "Same Chinese restaurant. Steamed instead of deep-fried. 850 fewer calories.", "easy"),
        ("chick_fil_a_combo", "chick_fil_a_swap", 950, -4, 1, "Grilled nuggets are 38g protein for 350 calories. The combo was 1,300.", "easy"),
        ("caesar_wrap", "grilled_chicken_salad", 380, 5, 1, "Same chicken, lose the wrap and heavy dressing. Ask for it on the side.", "easy"),
        ("breakfast_burrito", "egg_white_wrap", 520, -4, 1, "Egg whites + avocado. Healthy fats, high protein, 520 fewer calories.", "easy"),
    ]

    c.executemany("""
        INSERT INTO food_swaps (original_id, swap_id, calorie_savings, protein_gain, same_restaurant, rationale, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, swaps)

    conn.commit()
    conn.close()
    print(f"Seeded {len(foods)} food items and {len(swaps)} swaps.")


if __name__ == "__main__":
    init_db()
    seed_foods()
