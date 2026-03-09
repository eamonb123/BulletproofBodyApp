#!/usr/bin/env python3
"""Backfill missing Snack Bible images using Google-image script + manual fallback map.

Usage:
  python scripts/backfill_snack_images.py

  python scripts/backfill_snack_images.py --manual-map /abs/path/manual_image_map.json

manual_image_map.json format:
{
  "grocery_cooking_spray_swap": "/abs/path/cooking-spray.png"
}
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "bulletproof_body.db"
GOOGLE_SCRIPT = ROOT / "scripts" / "snack_image_google_search.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill Snack Bible images")
    parser.add_argument("--db", default=str(DB_PATH), help="SQLite db path")
    parser.add_argument(
        "--manual-map",
        default=None,
        help="JSON file: snack_item_id -> local image path",
    )
    parser.add_argument("--remove-bg", action="store_true", help="Try background removal")
    parser.add_argument("--dry-run", action="store_true", help="Do not write files/DB")
    return parser.parse_args()


def slugify(text: str) -> str:
    chars = []
    for ch in text.lower():
        if ch.isalnum():
            chars.append(ch)
        elif ch in (" ", "-", "_"):
            chars.append("-")
    slug = "".join(chars)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:80] or "snack-image"


def main() -> int:
    args = parse_args()
    manual_map: dict[str, str] = {}
    if args.manual_map:
        manual_map = json.loads(Path(args.manual_map).read_text(encoding="utf-8"))

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT id, name, brand
        FROM snack_items
        WHERE image_path IS NULL OR trim(image_path) = ''
        ORDER BY created_at DESC
        """
    ).fetchall()
    conn.close()

    if not rows:
        print("No missing snack images.")
        return 0

    print(f"Missing snack images: {len(rows)}")
    successes = 0
    failures = 0

    for item_id, name, brand in rows:
        query = f"{brand} {name}".strip()
        slug = slugify(f"{brand}-{name}")
        cmd = [
            "python3",
            str(GOOGLE_SCRIPT),
            "--query",
            query,
            "--slug",
            slug,
            "--item-id",
            item_id,
        ]
        if args.remove_bg:
            cmd.append("--remove-bg")
        if args.dry_run:
            cmd.append("--dry-run")

        manual_file = manual_map.get(item_id)
        if manual_file:
            cmd.extend(["--manual-file", manual_file])

        print(f"\n[{item_id}] {name} ({brand})")
        print("cmd:", " ".join(cmd))
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode == 0:
            successes += 1
            print("status: OK")
        else:
            failures += 1
            print("status: FAIL")
        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()
        if stdout:
            print(stdout)
        if stderr:
            print(stderr)

    print("\nSUMMARY")
    print(f"successes={successes}")
    print(f"failures={failures}")
    print(f"total={len(rows)}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
