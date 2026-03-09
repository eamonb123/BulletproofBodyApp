#!/usr/bin/env python3
"""Initialize Snack Bible tables and seed starter snack swaps.

This script is idempotent:
- Creates `snack_items` and `snack_swaps` if missing
- Upserts starter records so reruns are safe
"""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")


def init_tables(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snack_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            serving TEXT NOT NULL,
            calories INTEGER NOT NULL,
            protein_g REAL NOT NULL,
            sugar_g REAL DEFAULT 0,
            carbs_g REAL NOT NULL,
            fat_g REAL NOT NULL,
            image_path TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snack_swaps (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            context TEXT NOT NULL,
            craving TEXT NOT NULL,
            rationale TEXT NOT NULL,
            original_snack_id TEXT NOT NULL REFERENCES snack_items(id),
            swap_snack_id TEXT NOT NULL REFERENCES snack_items(id),
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snack_swaps_craving ON snack_swaps(craving)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snack_swaps_active_order ON snack_swaps(is_active, display_order)"
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS client_snack_profiles (
            id TEXT PRIMARY KEY,
            client_name TEXT NOT NULL,
            normalized_name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS client_snack_rows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL REFERENCES client_snack_profiles(id) ON DELETE CASCADE,
            snack_swap_id TEXT NOT NULL REFERENCES snack_swaps(id),
            frequency_per_week INTEGER DEFAULT 7,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(profile_id, snack_swap_id)
        )
        """
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_client_snack_rows_profile ON client_snack_rows(profile_id)"
    )


def ensure_columns(cursor: sqlite3.Cursor) -> None:
    columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(snack_items)").fetchall()
    }

    if "sugar_g" not in columns:
        cursor.execute("ALTER TABLE snack_items ADD COLUMN sugar_g REAL DEFAULT 0")

    if "image_path" not in columns:
        cursor.execute("ALTER TABLE snack_items ADD COLUMN image_path TEXT")


def upsert_seed_data(cursor: sqlite3.Cursor) -> None:
    snack_items = [
        (
            "hot-cheetos-orig",
            "Flamin' Hot Cheetos",
            "Cheetos",
            "1 bag (2 oz)",
            320,
            4,
            1,
            31,
            20,
            "hot-cheetos-orig.svg",
        ),
        (
            "hot-cheetos-swap",
            "Spicy Sweet Chili Protein Chips",
            "Quest",
            "1 bag",
            140,
            19,
            1,
            5,
            5,
            "hot-cheetos-swap.svg",
        ),
        (
            "snickers-orig",
            "Snickers Bar",
            "Mars",
            "1 bar (1.86 oz)",
            280,
            4,
            28,
            35,
            14,
            "snickers-orig.svg",
        ),
        (
            "snickers-swap",
            "Protein Crisp Bar",
            "BSN",
            "1 bar",
            200,
            20,
            3,
            22,
            7,
            "snickers-swap.svg",
        ),
        (
            "oreos-orig",
            "Oreo Cookies",
            "Oreo",
            "6 cookies",
            320,
            3,
            28,
            50,
            14,
            "oreos-orig.svg",
        ),
        (
            "oreos-swap",
            "Protein Pastry",
            "Legendary Foods",
            "1 pastry",
            180,
            20,
            2,
            22,
            6,
            "oreos-swap.svg",
        ),
        (
            "half-baked-orig",
            "Half Baked Ice Cream",
            "Ben & Jerry's",
            "1/2 pint",
            640,
            10,
            58,
            68,
            34,
            "half-baked-orig.svg",
        ),
        (
            "half-baked-swap",
            "Greek Frozen Yogurt Bar + Whey Shake",
            "Yasso + Any Whey Isolate",
            "1 bar + 1 scoop shake",
            220,
            25,
            14,
            20,
            4,
            "half-baked-swap.svg",
        ),
        (
            "granola-bars-orig",
            "Oats 'n Honey Bars",
            "Nature Valley",
            "2 bars",
            190,
            4,
            11,
            29,
            7,
            "granola-bars-orig.svg",
        ),
        (
            "granola-bars-swap",
            "Chocolate Peanut Butter Bar",
            "Pure Protein",
            "1 bar",
            180,
            20,
            2,
            17,
            6,
            "granola-bars-swap.svg",
        ),
        (
            "trail-mix-orig",
            "Trail Mix",
            "Store Mix",
            "1/2 cup",
            340,
            8,
            24,
            33,
            21,
            "trail-mix-orig.svg",
        ),
        (
            "trail-mix-swap",
            "Dry Roasted Edamame",
            "The Only Bean",
            "1 pack",
            130,
            14,
            1,
            10,
            4,
            "trail-mix-swap.svg",
        ),
        (
            "chips-queso-orig",
            "Tortilla Chips + Queso",
            "Restaurant To-Go",
            "1 basket + dip cup",
            430,
            8,
            2,
            38,
            28,
            "chips-queso-orig.svg",
        ),
        (
            "chips-queso-swap",
            "Pretzel Thins + Greek Yogurt Ranch Dip",
            "Snack Factory + Oikos",
            "1 serving + 3/4 cup dip",
            220,
            18,
            7,
            25,
            6,
            "chips-queso-swap.svg",
        ),
        (
            "chocolate-milk-orig",
            "Chocolate Bar + Milk",
            "Convenience Combo",
            "1 bar + 12oz milk",
            390,
            8,
            40,
            46,
            19,
            "chocolate-milk-orig.svg",
        ),
        (
            "chocolate-milk-swap",
            "Core Power Shake + Dark Chocolate Square",
            "Fairlife + Lindt",
            "1 bottle + 1 square",
            220,
            27,
            27,
            18,
            6,
            "chocolate-milk-swap.svg",
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO snack_items (
            id, name, brand, serving, calories, protein_g, sugar_g, carbs_g, fat_g, image_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            brand = excluded.brand,
            serving = excluded.serving,
            calories = excluded.calories,
            protein_g = excluded.protein_g,
            sugar_g = excluded.sugar_g,
            carbs_g = excluded.carbs_g,
            fat_g = excluded.fat_g,
            image_path = excluded.image_path,
            is_active = 1
        """,
        snack_items,
    )

    snack_swaps = [
        (
            "hot-cheetos",
            "Desk Drawer Chips",
            "Afternoon slump at work",
            "Spicy Crunch",
            "Keep the heat and crunch, but move to a chip option that gives real protein and far fewer calories.",
            "hot-cheetos-orig",
            "hot-cheetos-swap",
            1,
        ),
        (
            "snickers",
            "Chocolate Bar Habit",
            "Late-night sweet craving",
            "Chocolate Fix",
            "Same chocolate texture and sweetness, but much better satiety from protein so the craving cycle ends faster.",
            "snickers-orig",
            "snickers-swap",
            2,
        ),
        (
            "oreos",
            "Cookie Run",
            "Post-dinner sweet bite",
            "Sweet Crunch",
            "This keeps the handheld pastry feel while cutting calories and massively increasing protein.",
            "oreos-orig",
            "oreos-swap",
            3,
        ),
        (
            "half-baked",
            "Freezer Attack",
            "Stress eating before bed",
            "Creamy Dessert",
            "Still feels like dessert, but the swap cuts over 400 calories while keeping a satisfying creamy profile.",
            "half-baked-orig",
            "half-baked-swap",
            4,
        ),
        (
            "granola-bars",
            "Commute Snack",
            "Grab-and-go from the car",
            "Sweet Crunch",
            "Equivalent convenience and portability, but the swap gives 5x protein with similar calories.",
            "granola-bars-orig",
            "granola-bars-swap",
            5,
        ),
        (
            "trail-mix",
            "Mindless Handfuls",
            "Working through meetings",
            "Salty Crunch",
            "You still get the salty crunch, but with tighter calories and better protein-to-calorie ratio.",
            "trail-mix-orig",
            "trail-mix-swap",
            6,
        ),
        (
            "chips-queso",
            "Crunch + Dip Combo",
            "Movie night snack",
            "Salty Crunch",
            "Keep the dip experience, but replace high-fat queso with a high-protein yogurt dip base.",
            "chips-queso-orig",
            "chips-queso-swap",
            7,
        ),
        (
            "chocolate-milk",
            "Gas Station Stop",
            "On-the-go convenience buy",
            "Chocolate Fix",
            "Keeps the chocolate taste and convenience, but gives a cleaner macro profile and much more protein.",
            "chocolate-milk-orig",
            "chocolate-milk-swap",
            8,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO snack_swaps (
            id, title, context, craving, rationale, original_snack_id, swap_snack_id, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            context = excluded.context,
            craving = excluded.craving,
            rationale = excluded.rationale,
            original_snack_id = excluded.original_snack_id,
            swap_snack_id = excluded.swap_snack_id,
            display_order = excluded.display_order,
            is_active = 1
        """,
        snack_swaps,
    )


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()

    init_tables(cursor)
    ensure_columns(cursor)
    upsert_seed_data(cursor)

    conn.commit()
    conn.close()
    print(f"Snack Bible tables initialized and seeded in {DB_PATH}")


if __name__ == "__main__":
    main()
