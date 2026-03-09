#!/usr/bin/env python3
"""Download/process a snack or grocery product image and optionally update DB.

Usage:
  # From URL:
  python scripts/snack_image_pipeline.py \
    --url "https://example.com/product.png" \
    --slug "olive-oil-orig" \
    --item-id "grocery_olive_oil_2tbsp_orig" \
    --db "./bulletproof_body.db" \
    --remove-bg

  # From local file (manual fallback):
  python scripts/snack_image_pipeline.py \
    --file "/path/to/manual-image.png" \
    --slug "olive-oil-orig" \
    --item-id "grocery_olive_oil_2tbsp_orig" \
    --remove-bg

Notes:
  - Background removal order:
      1) local `rembg` package (best)
      2) remove.bg API when REMOVE_BG_API_KEY is set
      3) fallback: keep original background
  - Output is a square PNG in app/public/snacks/.
"""

from __future__ import annotations

import argparse
import io
import os
import sqlite3
import sys
from pathlib import Path

import requests
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = ROOT / "app" / "public" / "snacks"
DEFAULT_DB = ROOT / "bulletproof_body.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Snack image ingestion pipeline")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--url", help="Direct image URL")
    source_group.add_argument("--file", help="Local image file path")
    parser.add_argument("--slug", required=True, help="Output filename slug (no extension)")
    parser.add_argument("--item-id", default=None, help="snack_items.id to update image_path")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite db path")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory")
    parser.add_argument(
        "--remove-bg",
        action="store_true",
        help="Attempt background removal (rembg first, then remove.bg API)",
    )
    parser.add_argument(
        "--canvas",
        type=int,
        default=1024,
        help="Square output size in pixels (default: 1024)",
    )
    parser.add_argument(
        "--pad",
        type=float,
        default=0.90,
        help="Max fill ratio inside canvas, 0.1-1.0 (default: 0.90)",
    )
    return parser.parse_args()


def download_image(url: str) -> bytes:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.google.com/",
    }
    resp = requests.get(url, timeout=30, headers=headers)
    resp.raise_for_status()
    return resp.content


def read_local_image(path: str) -> bytes:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Local image not found: {path}")
    return p.read_bytes()


def remove_bg_local(image_bytes: bytes) -> bytes | None:
    try:
        from rembg import remove  # type: ignore

        return remove(image_bytes)
    except Exception:
        return None


def remove_bg_api(image_bytes: bytes) -> bytes | None:
    api_key = os.environ.get("REMOVE_BG_API_KEY")
    if not api_key:
        return None

    resp = requests.post(
        "https://api.remove.bg/v1.0/removebg",
        files={"image_file": ("input.png", image_bytes)},
        data={"size": "auto"},
        headers={"X-Api-Key": api_key},
        timeout=60,
    )
    if resp.status_code != 200:
        return None
    return resp.content


def remove_bg_flat(image_bytes: bytes, tolerance: int = 24) -> bytes | None:
    """Cheap fallback background removal for flat studio backgrounds.

    Detects background from the 4 corner pixels and keys out near-matching tones.
    Useful for retailer pack-shot images with uniform light gray/white backgrounds.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    except Exception:
        return None

    w, h = img.size
    corners = [
        img.getpixel((0, 0)),
        img.getpixel((w - 1, 0)),
        img.getpixel((0, h - 1)),
        img.getpixel((w - 1, h - 1)),
    ]
    bg_r = int(sum(c[0] for c in corners) / 4)
    bg_g = int(sum(c[1] for c in corners) / 4)
    bg_b = int(sum(c[2] for c in corners) / 4)

    out_data = []
    for r, g, b, a in img.getdata():
        dr = abs(r - bg_r)
        dg = abs(g - bg_g)
        db = abs(b - bg_b)
        delta = max(dr, dg, db)

        if delta <= tolerance:
            out_data.append((r, g, b, 0))
        elif delta <= tolerance + 14:
            # Soft edge transition to avoid harsh cut lines.
            alpha = int(((delta - tolerance) / 14.0) * a)
            out_data.append((r, g, b, max(0, min(255, alpha))))
        else:
            out_data.append((r, g, b, a))

    img.putdata(out_data)
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def process_image(image_bytes: bytes, canvas: int, pad: float) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    target = int(canvas * max(0.1, min(1.0, pad)))
    scale = min(target / img.width, target / img.height)
    new_w = max(1, int(img.width * scale))
    new_h = max(1, int(img.height * scale))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    x = (canvas - new_w) // 2
    y = (canvas - new_h) // 2
    out.alpha_composite(img, (x, y))
    return out


def update_db(db_path: Path, item_id: str, filename: str) -> None:
    conn = sqlite3.connect(str(db_path), timeout=10)
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE snack_items SET image_path = ? WHERE id = ?",
            (filename, item_id),
        )
        if cur.rowcount == 0:
            raise RuntimeError(f"No snack_items row found for id={item_id}")
        conn.commit()
    finally:
        conn.close()


def main() -> int:
    args = parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    db_path = Path(args.db)
    out_name = f"{args.slug}.png"
    out_path = out_dir / out_name

    if args.url:
        raw = download_image(args.url)
        source_mode = "url"
    else:
        raw = read_local_image(args.file)
        source_mode = "file"

    bg_mode = "kept_original"
    candidate = raw
    if args.remove_bg:
        local_removed = remove_bg_local(raw)
        if local_removed:
            candidate = local_removed
            bg_mode = "removed_local_rembg"
        else:
            api_removed = remove_bg_api(raw)
            if api_removed:
                candidate = api_removed
                bg_mode = "removed_remove_bg_api"
            else:
                flat_removed = remove_bg_flat(raw)
                if flat_removed:
                    candidate = flat_removed
                    bg_mode = "removed_flat_bg_fallback"

    final = process_image(candidate, canvas=args.canvas, pad=args.pad)
    final.save(out_path, format="PNG")

    db_updated = False
    if args.item_id:
        update_db(db_path, args.item_id, out_name)
        db_updated = True

    print("SNACK_IMAGE_PIPELINE_OK")
    print(f"source_mode={source_mode}")
    if args.url:
        print(f"source_url={args.url}")
    if args.file:
        print(f"source_file={args.file}")
    print(f"output={out_path}")
    print(f"bg_mode={bg_mode}")
    print(f"db_updated={db_updated}")
    if args.item_id:
        print(f"item_id={args.item_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
