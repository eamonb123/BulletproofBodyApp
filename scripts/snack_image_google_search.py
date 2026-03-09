#!/usr/bin/env python3
"""Find a snack/grocery product image via Google CSE and ingest it quickly.

Fast-fail strategy:
1) Try Google image API candidates (if key + cx available)
2) Accept first candidate passing objective quality checks
3) If none pass, optionally fallback to a manual file path
4) Save processed image + optional DB update

Env vars:
  GOOGLE_CSE_API_KEY
  GOOGLE_CSE_CX

Usage:
  python scripts/snack_image_google_search.py \
    --query "PAM cooking spray can" \
    --slug "grocery-cooking-spray-swap" \
    --item-id "grocery_cooking_spray_swap" \
    --remove-bg

  python scripts/snack_image_google_search.py \
    --query "PAM cooking spray can" \
    --slug "grocery-cooking-spray-swap" \
    --item-id "grocery_cooking_spray_swap" \
    --manual-file "/path/from/eamon.png" \
    --remove-bg
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path
from typing import Any

import requests
from PIL import Image

from snack_image_pipeline import (
    DEFAULT_DB,
    DEFAULT_OUT_DIR,
    download_image,
    process_image,
    read_local_image,
    remove_bg_api,
    remove_bg_flat,
    remove_bg_local,
    update_db,
)


GOOGLE_ENDPOINT = "https://www.googleapis.com/customsearch/v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Google CSE -> snack image ingestion")
    parser.add_argument("--query", required=True, help="Search query for product image")
    parser.add_argument("--slug", required=True, help="Output filename slug (no extension)")
    parser.add_argument("--item-id", default=None, help="snack_items.id to update image_path")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite db path")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory")
    parser.add_argument("--key", default=None, help="Google CSE API key (else env GOOGLE_CSE_API_KEY)")
    parser.add_argument("--cx", default=None, help="Google CSE engine ID (else env GOOGLE_CSE_CX)")
    parser.add_argument("--max-results", type=int, default=8, help="Max image results to inspect")
    parser.add_argument("--min-size", type=int, default=500, help="Min width/height threshold")
    parser.add_argument("--max-ratio", type=float, default=2.3, help="Max aspect ratio w/h or h/w")
    parser.add_argument("--manual-file", default=None, help="Local fallback image file path")
    parser.add_argument("--remove-bg", action="store_true", help="Try background removal")
    parser.add_argument("--canvas", type=int, default=1024, help="Square output size")
    parser.add_argument("--pad", type=float, default=0.90, help="Fill ratio in output canvas")
    parser.add_argument("--dry-run", action="store_true", help="Do not write files/DB")
    return parser.parse_args()


def google_image_candidates(query: str, key: str, cx: str, max_results: int) -> list[str]:
    params = {
        "q": query,
        "searchType": "image",
        "num": min(max_results, 10),
        "safe": "off",
        "key": key,
        "cx": cx,
    }
    resp = requests.get(GOOGLE_ENDPOINT, params=params, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    items = payload.get("items", [])
    return [item.get("link") for item in items if item.get("link")]


def image_quality_ok(image_bytes: bytes, min_size: int, max_ratio: float) -> tuple[bool, str]:
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        return False, "decode_failed"

    w, h = img.size
    if w < min_size or h < min_size:
        return False, f"too_small_{w}x{h}"

    ratio = max(w / max(h, 1), h / max(w, 1))
    if ratio > max_ratio:
        return False, f"bad_aspect_{w}x{h}"

    return True, f"ok_{w}x{h}"


def apply_bg_mode(image_bytes: bytes, remove_bg: bool) -> tuple[bytes, str]:
    if not remove_bg:
        return image_bytes, "kept_original"

    local_removed = remove_bg_local(image_bytes)
    if local_removed:
        return local_removed, "removed_local_rembg"

    api_removed = remove_bg_api(image_bytes)
    if api_removed:
        return api_removed, "removed_remove_bg_api"

    flat_removed = remove_bg_flat(image_bytes)
    if flat_removed:
        return flat_removed, "removed_flat_bg_fallback"

    return image_bytes, "kept_original"


def main() -> int:
    args = parse_args()

    key = args.key
    if not key:
        key = os.environ.get("GOOGLE_CSE_API_KEY", "").strip() or None
    cx = args.cx
    if not cx:
        cx = os.environ.get("GOOGLE_CSE_CX", "").strip() or None

    attempts: list[dict[str, Any]] = []
    selected_bytes: bytes | None = None
    selected_source: str | None = None

    # 1) Google candidates
    if key and cx:
        try:
            candidates = google_image_candidates(args.query, key, cx, args.max_results)
        except Exception as exc:
            attempts.append({"source": "google_api", "status": "error", "reason": str(exc)})
            candidates = []

        for url in candidates:
            try:
                img_bytes = download_image(url)
                ok, reason = image_quality_ok(img_bytes, args.min_size, args.max_ratio)
                attempts.append({"source": url, "status": "ok" if ok else "reject", "reason": reason})
                if ok:
                    selected_bytes = img_bytes
                    selected_source = url
                    break
            except Exception as exc:
                attempts.append({"source": url, "status": "error", "reason": str(exc)})
    else:
        attempts.append(
            {
                "source": "google_api",
                "status": "skip",
                "reason": "missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX",
            }
        )

    # 2) Manual fallback
    if selected_bytes is None and args.manual_file:
        try:
            img_bytes = read_local_image(args.manual_file)
            ok, reason = image_quality_ok(img_bytes, args.min_size, args.max_ratio)
            attempts.append(
                {
                    "source": f"manual:{args.manual_file}",
                    "status": "ok" if ok else "reject",
                    "reason": reason,
                }
            )
            if ok:
                selected_bytes = img_bytes
                selected_source = f"manual:{args.manual_file}"
        except Exception as exc:
            attempts.append(
                {
                    "source": f"manual:{args.manual_file}",
                    "status": "error",
                    "reason": str(exc),
                }
            )

    if selected_bytes is None:
        print("SNACK_IMAGE_GOOGLE_FAIL")
        print("No acceptable image found.")
        print("Tips:")
        print("- Provide GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX")
        print("- Or pass --manual-file /absolute/path/to/image.png")
        print("attempts=" + json.dumps(attempts, ensure_ascii=True))
        return 1

    processed_bytes, bg_mode = apply_bg_mode(selected_bytes, args.remove_bg)
    processed = process_image(processed_bytes, canvas=args.canvas, pad=args.pad)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = f"{args.slug}.png"
    out_path = out_dir / out_name

    if not args.dry_run:
        processed.save(out_path, format="PNG")
        if args.item_id:
            update_db(Path(args.db), args.item_id, out_name)

    print("SNACK_IMAGE_GOOGLE_OK")
    print(f"query={args.query}")
    print(f"selected_source={selected_source}")
    print(f"output={out_path}")
    print(f"bg_mode={bg_mode}")
    print(f"db_updated={bool(args.item_id and not args.dry_run)}")
    print("attempts=" + json.dumps(attempts, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
