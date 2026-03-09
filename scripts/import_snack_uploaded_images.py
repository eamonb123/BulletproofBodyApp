#!/usr/bin/env python3
"""Compress screenshot images and ingest them into the snack database.

This script creates/updates a staging table (`snack_uploaded_images`) so that
all uploaded images are tracked in SQLite before item-level mapping.

Usage:
  python3 scripts/import_snack_uploaded_images.py \
    --input-dir "/path/to/images" \
    --db "./bulletproof_body.db"
"""

from __future__ import annotations

import argparse
import hashlib
import sqlite3
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "bulletproof_body.db"
DEFAULT_OUT_DIR = ROOT / "app" / "public" / "snacks" / "uploads"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import uploaded snack screenshots")
    parser.add_argument("--input-dir", required=True, help="Directory with source images")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite db path")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output image directory")
    parser.add_argument(
        "--max-dim",
        type=int,
        default=1600,
        help="Resize so max(width, height) <= max-dim (default: 1600)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=82,
        help="JPEG quality 1-95 (default: 82)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and report only; no writes",
    )
    return parser.parse_args()


def slugify(name: str) -> str:
    out = []
    for ch in name.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_"):
            out.append("-")
    slug = "".join(out).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:80] or "upload"


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS snack_uploaded_images (
            id TEXT PRIMARY KEY,
            source_filename TEXT NOT NULL UNIQUE,
            source_path TEXT NOT NULL,
            image_path TEXT NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            size_bytes INTEGER NOT NULL,
            sha256 TEXT NOT NULL,
            mapped_snack_item_id TEXT REFERENCES snack_items(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_snack_uploaded_images_mapped
        ON snack_uploaded_images(mapped_snack_item_id)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_snack_uploaded_images_created
        ON snack_uploaded_images(created_at)
        """
    )


def compress_image(src: Path, dst: Path, max_dim: int, quality: int) -> tuple[int, int, int, str]:
    with Image.open(src) as img:
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        w, h = img.size
        scale = min(1.0, float(max_dim) / float(max(w, h)))
        if scale < 1.0:
            new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, format="JPEG", quality=quality, optimize=True, progressive=True)

    data = dst.read_bytes()
    out_hash = hashlib.sha256(data).hexdigest()
    with Image.open(dst) as out_img:
        out_w, out_h = out_img.size
    return out_w, out_h, len(data), out_hash


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir).expanduser().resolve()
    db_path = Path(args.db).expanduser().resolve()
    out_dir = Path(args.out_dir).expanduser().resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Input dir not found: {input_dir}")
        return 1
    if not db_path.exists():
        print(f"DB not found: {db_path}")
        return 1

    files = sorted(
        [p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    )
    if not files:
        print("No image files found.")
        return 0

    conn = sqlite3.connect(str(db_path), timeout=20)
    try:
        ensure_schema(conn)
        inserted = 0
        updated = 0
        total_size = 0
        for idx, src in enumerate(files, start=1):
            stem = slugify(src.stem)
            out_name = f"{stem}-{idx:02d}.jpg"
            out_path = out_dir / out_name
            rel_path = str(Path("uploads") / out_name)

            if not args.dry_run:
                width, height, size_bytes, sha = compress_image(
                    src=src,
                    dst=out_path,
                    max_dim=args.max_dim,
                    quality=args.quality,
                )
            else:
                with Image.open(src) as dry_img:
                    width, height = dry_img.size
                size_bytes = src.stat().st_size
                sha = hashlib.sha256(src.read_bytes()).hexdigest()

            total_size += size_bytes
            rec_id = f"upload_{sha[:16]}"
            cur = conn.execute(
                """
                SELECT id
                FROM snack_uploaded_images
                WHERE source_filename = ?
                """,
                (src.name,),
            ).fetchone()

            if cur:
                if not args.dry_run:
                    conn.execute(
                        """
                        UPDATE snack_uploaded_images
                        SET id = ?, source_path = ?, image_path = ?, width = ?, height = ?,
                            size_bytes = ?, sha256 = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE source_filename = ?
                        """,
                        (
                            rec_id,
                            str(src),
                            rel_path,
                            width,
                            height,
                            size_bytes,
                            sha,
                            src.name,
                        ),
                    )
                updated += 1
            else:
                if not args.dry_run:
                    conn.execute(
                        """
                        INSERT INTO snack_uploaded_images
                        (id, source_filename, source_path, image_path, width, height, size_bytes, sha256)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rec_id,
                            src.name,
                            str(src),
                            rel_path,
                            width,
                            height,
                            size_bytes,
                            sha,
                        ),
                    )
                inserted += 1

            print(
                f"[{idx}/{len(files)}] {src.name} -> {rel_path} "
                f"({width}x{height}, {size_bytes} bytes)"
            )

        if not args.dry_run:
            conn.commit()
        print("IMPORT_OK")
        print(f"files={len(files)}")
        print(f"inserted={inserted}")
        print(f"updated={updated}")
        print(f"total_output_bytes={total_size}")
        print(f"out_dir={out_dir}")
        print(f"table=snack_uploaded_images")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
