#!/usr/bin/env python3
"""
Apply verified nutrition data to snack_items table.
Adds verified_* columns and populates from research JSON files.
Matches research entries to DB rows by name similarity (fuzzy match on brand + name).
"""

import sqlite3
import json
import glob
import os
from difflib import SequenceMatcher

DB_PATH = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
RESEARCH_DIR = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

def add_columns(conn):
    """Add verified columns if they don't exist."""
    new_cols = [
        ("verified_serving", "TEXT DEFAULT ''"),
        ("verified_serving_grams", "REAL DEFAULT 0"),
        ("verified_calories", "INTEGER DEFAULT 0"),
        ("verified_protein_g", "REAL DEFAULT 0"),
        ("verified_carbs_g", "REAL DEFAULT 0"),
        ("verified_fat_g", "REAL DEFAULT 0"),
        ("verified_fiber_g", "REAL DEFAULT 0"),
        ("verified_sugar_g", "REAL DEFAULT 0"),
        ("verified_source_url", "TEXT DEFAULT ''"),
        ("verified_notes", "TEXT DEFAULT ''"),
        ("verification_status", "TEXT DEFAULT ''"),  # confirmed, needs_update, serving_mismatch
    ]

    existing = {row[1] for row in conn.execute("PRAGMA table_info(snack_items)")}
    added = 0
    for col_name, col_type in new_cols:
        if col_name not in existing:
            conn.execute(f"ALTER TABLE snack_items ADD COLUMN {col_name} {col_type}")
            added += 1

    if added:
        print(f"Added {added} new columns to snack_items")
    else:
        print("All verified columns already exist")

def load_originals(conn):
    """Load all original snack items (ones that appear as original_snack_id in swaps)."""
    rows = conn.execute("""
        SELECT si.id, si.name, si.brand, si.calories
        FROM snack_items si
        WHERE si.id IN (SELECT original_snack_id FROM snack_swaps)
    """).fetchall()
    return [{"db_id": r[0], "name": r[1], "brand": r[2], "calories": r[3]} for r in rows]

def fuzzy_match(research_entry, db_originals):
    """Find the best matching DB original for a research entry."""
    research_name = research_entry["name"].lower()
    research_brand = research_entry["brand"].lower()
    research_cal = research_entry.get("db_calories", 0)

    best_score = 0
    best_match = None

    for orig in db_originals:
        db_name = orig["name"].lower()
        db_brand = orig["brand"].lower()

        # Score: combine name similarity, brand similarity, and calorie proximity
        name_score = SequenceMatcher(None, research_name, db_name).ratio()
        brand_score = SequenceMatcher(None, research_brand, db_brand).ratio()

        # Calorie proximity (within 20% = bonus)
        if research_cal and orig["calories"]:
            cal_ratio = min(research_cal, orig["calories"]) / max(research_cal, orig["calories"]) if max(research_cal, orig["calories"]) > 0 else 0
        else:
            cal_ratio = 0.5

        # Weighted score
        score = name_score * 0.5 + brand_score * 0.3 + cal_ratio * 0.2

        if score > best_score:
            best_score = score
            best_match = orig

    return best_match, best_score

def apply_research(conn):
    """Read all research JSON files and apply verified data."""
    db_originals = load_originals(conn)
    print(f"Loaded {len(db_originals)} original snack items from DB\n")

    json_files = sorted(glob.glob(os.path.join(RESEARCH_DIR, "*.json")))

    total_matched = 0
    total_updated = 0
    unmatched = []
    matches = []

    for jf in json_files:
        filename = os.path.basename(jf)
        with open(jf) as f:
            entries = json.load(f)

        print(f"--- {filename} ({len(entries)} entries) ---")

        for entry in entries:
            match, score = fuzzy_match(entry, db_originals)

            if score < 0.35:
                unmatched.append(entry)
                print(f"  NO MATCH (score={score:.2f}): {entry['brand']} {entry['name']} ({entry.get('db_calories', '?')} cal)")
                continue

            total_matched += 1
            matches.append({
                "db_id": match["db_id"],
                "db_name": match["name"],
                "db_brand": match["brand"],
                "research_name": entry["name"],
                "research_brand": entry["brand"],
                "score": score,
                "status": entry["status"],
                "verified_calories": entry.get("verified_calories", 0),
                "db_calories": match["calories"],
            })

            # Apply the update
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
                match["db_id"],
            ))
            total_updated += 1

            status_icon = "✓" if entry["status"] == "confirmed" else "⚠" if entry["status"] == "needs_update" else "↔"
            delta = entry.get("verified_calories", 0) - match["calories"] if entry.get("verified_calories") else 0
            delta_str = f" (delta: {delta:+d})" if delta != 0 else ""
            print(f"  {status_icon} {match['db_id']}: {match['brand']} {match['name']} → {entry.get('verified_calories', '?')} cal{delta_str} [score={score:.2f}]")

    conn.commit()

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total research entries: {sum(len(json.load(open(f))) for f in json_files)}")
    print(f"Matched to DB: {total_matched}")
    print(f"Updated in DB: {total_updated}")
    print(f"Unmatched: {len(unmatched)}")

    # Count by status
    confirmed = sum(1 for m in matches if m["status"] == "confirmed")
    needs_update = sum(1 for m in matches if m["status"] == "needs_update")
    serving_mismatch = sum(1 for m in matches if m["status"] == "serving_mismatch")
    print(f"\nBy status: {confirmed} confirmed, {needs_update} needs_update, {serving_mismatch} serving_mismatch")

    if unmatched:
        print(f"\nUnmatched entries:")
        for u in unmatched:
            print(f"  - {u['brand']} {u['name']} (db_cal={u.get('db_calories', '?')})")

    # Show the biggest discrepancies
    discrepancies = sorted(
        [m for m in matches if m["status"] == "needs_update"],
        key=lambda x: abs(x["verified_calories"] - x["db_calories"]),
        reverse=True
    )
    if discrepancies:
        print(f"\nBiggest discrepancies (needs_update):")
        for d in discrepancies[:10]:
            delta = d["verified_calories"] - d["db_calories"]
            print(f"  {d['db_brand']} {d['db_name']}: DB={d['db_calories']} → Verified={d['verified_calories']} ({delta:+d})")

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    add_columns(conn)
    apply_research(conn)
    conn.close()
    print("\nDone.")
