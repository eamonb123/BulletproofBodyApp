#!/usr/bin/env python3
"""Backfill Snack Bible images from Open Food Facts for placeholder/missing rows.

Targets snack_items where image_path is NULL/empty or points to .svg placeholder assets.
Saves processed PNGs into app/public/snacks and updates snack_items.image_path.
"""

from __future__ import annotations

import argparse
import io
import re
import sqlite3
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
    remove_bg_api,
    remove_bg_flat,
    remove_bg_local,
    update_db,
)


SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill snack images from Open Food Facts")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="SQLite db path")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output image directory")
    parser.add_argument("--remove-bg", action="store_true", help="Try background removal")
    parser.add_argument("--limit", type=int, default=50, help="Max rows to process")
    parser.add_argument("--dry-run", action="store_true", help="Do not write image files or DB")
    parser.add_argument(
        "--min-dim",
        type=int,
        default=120,
        help="Minimum shorter side in pixels to accept source image",
    )
    return parser.parse_args()


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:80] or "snack"


def tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def search_off(query: str, page_size: int = 12) -> list[dict[str, Any]]:
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": page_size,
    }
    resp = requests.get(SEARCH_URL, params=params, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    return payload.get("products", [])


def choose_product(name: str, brand: str, products: list[dict[str, Any]]) -> dict[str, Any] | None:
    target_tokens = tokenize(f"{brand} {name}")

    best: dict[str, Any] | None = None
    best_score = -1.0
    for p in products:
        img = p.get("image_front_url") or p.get("image_url")
        if not img:
            continue
        p_name = str(p.get("product_name") or p.get("product_name_en") or "")
        p_brand = str(p.get("brands") or "")
        p_tokens = tokenize(f"{p_brand} {p_name}")
        if not p_tokens:
            continue
        overlap = len(target_tokens & p_tokens)
        score = overlap / max(1, len(target_tokens))
        if brand and brand.lower() != "generic" and brand.lower() in p_brand.lower():
            score += 0.4
        if score > best_score:
            best = p
            best_score = score
    return best


def make_query_candidates(name: str, brand: str) -> list[str]:
    candidates: list[str] = []
    full = f"{brand} {name}".strip()
    if full:
        candidates.append(full)
    if name:
        candidates.append(name)
    if "+" in name:
        left = name.split("+", 1)[0].strip()
        if left:
            candidates.append(f"{brand} {left}".strip())
            candidates.append(left)
    if "/" in name:
        left = name.split("/", 1)[0].strip()
        if left:
            candidates.append(f"{brand} {left}".strip())
            candidates.append(left)
    if brand and brand.lower() != "generic":
        candidates.append(brand)

    # de-dupe preserve order
    out: list[str] = []
    seen = set()
    for c in candidates:
        c = c.strip()
        if not c:
            continue
        k = c.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(c)
    return out


def image_url_variants(url: str) -> list[str]:
    variants = [url]
    # Open Food Facts commonly serves thumbnails with ... .400.jpg, .200.jpg etc.
    # Try full-size image first when possible.
    full = re.sub(r"\.\d+\.(jpg|jpeg|png)$", r".full.\1", url, flags=re.IGNORECASE)
    if full != url:
        variants.insert(0, full)
    return variants


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
    db_path = Path(args.db)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT id, name, brand, image_path
        FROM snack_items
        WHERE image_path IS NULL
           OR trim(image_path) = ''
           OR lower(image_path) LIKE '%.svg'
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (args.limit,),
    ).fetchall()
    conn.close()

    if not rows:
        print("No snack items need backfill.")
        return 0

    print(f"Candidate rows: {len(rows)}")
    successes = 0
    failures = 0

    for item_id, name, brand, image_path in rows:
        print(f"\n[{item_id}] {name} ({brand})")

        try:
            best = None
            used_query = None
            for query in make_query_candidates(name, brand):
                products = search_off(query)
                best = choose_product(name, brand, products)
                if best:
                    used_query = query
                    break

            if not best:
                print("status=FAIL reason=no_match_with_image")
                failures += 1
                continue

            src = best.get("image_front_url") or best.get("image_url")
            product_name = best.get("product_name") or best.get("product_name_en") or ""
            print(f"source={src}")
            if used_query:
                print(f"query={used_query}")
            print(f"matched_product={product_name}")

            raw = None
            last_err = None
            for url in image_url_variants(src):
                try:
                    raw = download_image(url)
                    if url != src:
                        print(f"source_variant={url}")
                    break
                except Exception as exc:
                    last_err = exc
            if raw is None:
                raise RuntimeError(f"download_failed: {last_err}")

            # Basic dimension guard
            im = Image.open(io.BytesIO(raw))
            w, h = im.size
            if min(w, h) < args.min_dim:
                print(f"status=FAIL reason=too_small_{w}x{h}")
                failures += 1
                continue

            processed_bytes, bg_mode = apply_bg_mode(raw, args.remove_bg)
            final = process_image(processed_bytes, canvas=1024, pad=0.90)
            out_name = f"{slugify(item_id)}.png"
            out_path = out_dir / out_name

            if not args.dry_run:
                final.save(out_path, format="PNG")
                update_db(db_path, item_id, out_name)

            print(f"status=OK bg_mode={bg_mode} output={out_name}")
            successes += 1
        except Exception as exc:
            print(f"status=FAIL reason={exc}")
            failures += 1

    print("\nSUMMARY")
    print(f"successes={successes}")
    print(f"failures={failures}")
    print(f"total={len(rows)}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
