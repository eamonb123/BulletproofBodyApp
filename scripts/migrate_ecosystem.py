#!/usr/bin/env python3
"""Add ecosystem dashboard tables to the Bulletproof Body database.

New tables:
  - ecosystem_profiles: One per client, stores body stats and targets
  - ecosystem_items: Every food item in a client's ecosystem (originals + swaps)

This script is idempotent — safe to run multiple times.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bulletproof_body.db")


def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    # ── Ecosystem Profiles ─────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS ecosystem_profiles (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            client_name TEXT NOT NULL,
            current_weight_lbs REAL,
            goal_weight_lbs REAL,
            height_inches REAL,
            age INTEGER,
            gender TEXT,
            rmr REAL,
            daily_calorie_target REAL,
            home_zip TEXT,
            work_zip TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Ecosystem Items ────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS ecosystem_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL REFERENCES ecosystem_profiles(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            item_state TEXT NOT NULL DEFAULT 'swap',

            -- Original item
            original_name TEXT NOT NULL,
            original_brand TEXT,
            original_calories REAL NOT NULL,
            original_protein_g REAL DEFAULT 0,
            original_carbs_g REAL DEFAULT 0,
            original_fat_g REAL DEFAULT 0,
            original_serving TEXT,
            original_image_url TEXT,

            -- Swap item (null for 'keep' state)
            swap_name TEXT,
            swap_brand TEXT,
            swap_calories REAL,
            swap_protein_g REAL DEFAULT 0,
            swap_carbs_g REAL DEFAULT 0,
            swap_fat_g REAL DEFAULT 0,
            swap_serving TEXT,
            swap_image_url TEXT,
            swap_instacart_url TEXT,
            swap_walmart_url TEXT,

            -- Context
            frequency_per_week REAL DEFAULT 3,
            client_context TEXT,
            why_they_eat_it TEXT,
            coach_note TEXT,
            education_text TEXT,

            -- Linking to existing DB
            template_meal_id TEXT,
            snack_swap_id TEXT,

            -- State
            is_toggled_on INTEGER DEFAULT 1,
            is_approved INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,

            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Indexes ────────────────────────────────────────
    c.execute(
        "CREATE INDEX IF NOT EXISTS idx_ecosystem_items_profile "
        "ON ecosystem_items(profile_id)"
    )
    c.execute(
        "CREATE INDEX IF NOT EXISTS idx_ecosystem_items_category "
        "ON ecosystem_items(profile_id, category)"
    )

    conn.commit()
    conn.close()
    print(f"Ecosystem tables migrated in {DB_PATH}")


if __name__ == "__main__":
    migrate()
