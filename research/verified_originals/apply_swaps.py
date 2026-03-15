#!/usr/bin/env python3
"""Apply verified nutrition data to swap snack items."""

import sqlite3
import json
import glob

DB_PATH = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
RESEARCH_DIR = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

def main():
    conn = sqlite3.connect(DB_PATH)

    # Verify columns exist (should already from originals migration)
    existing = {row[1] for row in conn.execute("PRAGMA table_info(snack_items)")}
    needed = ["verified_serving", "verified_serving_grams", "verified_calories",
              "verified_protein_g", "verified_carbs_g", "verified_fat_g",
              "verified_fiber_g", "verified_sugar_g", "verified_source_url",
              "verified_notes", "verification_status"]
    for col in needed:
        if col not in existing:
            print(f"ERROR: Column {col} missing from snack_items")
            return

    # Get all valid swap item IDs
    valid_ids = {row[0] for row in conn.execute(
        "SELECT id FROM snack_items WHERE id IN (SELECT swap_snack_id FROM snack_swaps)"
    )}
    print(f"Valid swap item IDs in DB: {len(valid_ids)}")

    # Process all swap_verified files
    files = sorted(glob.glob(f"{RESEARCH_DIR}/swap_verified_*.json"))

    total = 0
    applied = 0
    skipped = 0
    not_found = 0
    by_status = {"confirmed": 0, "close": 0, "needs_update": 0}

    for fpath in files:
        fname = fpath.split("/")[-1]
        with open(fpath) as f:
            entries = json.load(f)

        print(f"\n--- {fname} ({len(entries)} entries) ---")

        for entry in entries:
            total += 1
            db_id = entry.get("db_id", "")

            if db_id not in valid_ids:
                print(f"  SKIP (not in DB): {db_id}")
                not_found += 1
                continue

            status = entry.get("status", "unknown")
            verified_cal = entry.get("verified_calories", 0)
            db_cal = entry.get("db_calories", 0)
            delta = verified_cal - db_cal if verified_cal and db_cal else 0

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
                verified_cal,
                entry.get("verified_protein_g", 0),
                entry.get("verified_carbs_g", 0),
                entry.get("verified_fat_g", 0),
                entry.get("verified_fiber_g", 0),
                entry.get("verified_sugar_g", 0),
                entry.get("source_url", ""),
                entry.get("notes", ""),
                status,
                db_id,
            ))

            applied += 1
            by_status[status] = by_status.get(status, 0) + 1

            if status == "needs_update":
                delta_str = f" (delta: {delta:+d})" if delta != 0 else ""
                print(f"  FIX {db_id}: DB={db_cal} → Verified={verified_cal}{delta_str}")

    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print(f"SWAP VERIFICATION APPLIED")
    print(f"{'='*60}")
    print(f"Total entries: {total}")
    print(f"Applied: {applied}")
    print(f"Not found in DB: {not_found}")
    print(f"By status: {by_status}")

if __name__ == "__main__":
    main()
