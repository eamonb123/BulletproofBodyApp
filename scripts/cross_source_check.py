#!/usr/bin/env python3
"""Cross-validate nutrition data between two sources.

Usage:
  python scripts/cross_source_check.py primary.json secondary.json

Accepted input formats:
  1) {"ingredients": [...]} where each ingredient has nutrition fields
  2) [...] raw list of ingredient objects

Exit codes:
  0 -> pass quality gate
  1 -> fail quality gate
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


CALORIES_FIELD = "calories"
MACRO_FIELDS = ("protein_g", "total_fat_g", "carbohydrate_g")


def normalize_name(name: str) -> str:
    """Normalize menu item names for loose matching across sources."""
    lowered = name.strip().lower()
    lowered = lowered.replace("&", " and ")
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def load_ingredients(path: Path) -> dict[str, dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        rows = data.get("ingredients", [])
    elif isinstance(data, list):
        rows = data
    else:
        raise ValueError(f"{path} must be a JSON object or list")

    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name", "")).strip()
        if not name:
            continue
        key = normalize_name(name)
        # Keep the first row on collision; collisions are usually naming variants.
        if key not in result:
            result[key] = row
    return result


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def field_mismatch(
    primary: float,
    secondary: float,
    *,
    abs_threshold: float,
    pct_threshold: float,
) -> tuple[bool, float, float]:
    diff = abs(primary - secondary)
    base = max(abs(primary), 1.0)
    pct = diff / base
    mismatch = diff > abs_threshold and pct > pct_threshold
    return mismatch, diff, pct


def compare_sources(
    primary: dict[str, dict[str, Any]],
    secondary: dict[str, dict[str, Any]],
    *,
    cal_abs_threshold: float,
    cal_pct_threshold: float,
    macro_abs_threshold: float,
    macro_pct_threshold: float,
) -> dict[str, Any]:
    primary_keys = set(primary.keys())
    secondary_keys = set(secondary.keys())
    overlap = sorted(primary_keys & secondary_keys)
    only_primary = sorted(primary_keys - secondary_keys)
    only_secondary = sorted(secondary_keys - primary_keys)

    mismatches: list[dict[str, Any]] = []
    comparable_count = 0

    for key in overlap:
        p = primary[key]
        s = secondary[key]

        item_issues: list[dict[str, Any]] = []

        p_cal = safe_float(p.get(CALORIES_FIELD))
        s_cal = safe_float(s.get(CALORIES_FIELD))
        if p_cal is not None and s_cal is not None:
            comparable_count += 1
            mismatch, diff, pct = field_mismatch(
                p_cal,
                s_cal,
                abs_threshold=cal_abs_threshold,
                pct_threshold=cal_pct_threshold,
            )
            if mismatch:
                item_issues.append(
                    {
                        "field": CALORIES_FIELD,
                        "primary": p_cal,
                        "secondary": s_cal,
                        "abs_diff": round(diff, 2),
                        "pct_diff": round(pct, 4),
                    }
                )

        for field in MACRO_FIELDS:
            p_val = safe_float(p.get(field))
            s_val = safe_float(s.get(field))
            if p_val is None or s_val is None:
                continue
            mismatch, diff, pct = field_mismatch(
                p_val,
                s_val,
                abs_threshold=macro_abs_threshold,
                pct_threshold=macro_pct_threshold,
            )
            if mismatch:
                item_issues.append(
                    {
                        "field": field,
                        "primary": p_val,
                        "secondary": s_val,
                        "abs_diff": round(diff, 2),
                        "pct_diff": round(pct, 4),
                    }
                )

        if item_issues:
            mismatches.append(
                {
                    "name_key": key,
                    "primary_name": p.get("name"),
                    "secondary_name": s.get("name"),
                    "issues": item_issues,
                }
            )

    return {
        "primary_count": len(primary_keys),
        "secondary_count": len(secondary_keys),
        "overlap_count": len(overlap),
        "comparable_count": comparable_count,
        "only_primary_count": len(only_primary),
        "only_secondary_count": len(only_secondary),
        "only_primary_examples": only_primary[:10],
        "only_secondary_examples": only_secondary[:10],
        "mismatch_count": len(mismatches),
        "mismatch_rate": (len(mismatches) / len(overlap)) if overlap else 1.0,
        "mismatches": mismatches,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cross-check nutrition data between two JSON sources."
    )
    parser.add_argument("primary", type=Path, help="Primary (typically official) JSON file")
    parser.add_argument("secondary", type=Path, help="Secondary comparison JSON file")
    parser.add_argument(
        "--min-overlap",
        type=int,
        default=10,
        help="Minimum overlapping item count required to trust comparison (default: 10)",
    )
    parser.add_argument(
        "--max-mismatch-rate",
        type=float,
        default=0.20,
        help="Maximum allowed mismatch rate across overlapping items (default: 0.20)",
    )
    parser.add_argument(
        "--cal-abs-threshold",
        type=float,
        default=30.0,
        help="Calories mismatch absolute threshold (default: 30)",
    )
    parser.add_argument(
        "--cal-pct-threshold",
        type=float,
        default=0.15,
        help="Calories mismatch percent threshold (default: 0.15)",
    )
    parser.add_argument(
        "--macro-abs-threshold",
        type=float,
        default=5.0,
        help="Macro mismatch absolute threshold in grams (default: 5)",
    )
    parser.add_argument(
        "--macro-pct-threshold",
        type=float,
        default=0.20,
        help="Macro mismatch percent threshold (default: 0.20)",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Optional path to write full JSON report",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    primary = load_ingredients(args.primary)
    secondary = load_ingredients(args.secondary)

    report = compare_sources(
        primary,
        secondary,
        cal_abs_threshold=args.cal_abs_threshold,
        cal_pct_threshold=args.cal_pct_threshold,
        macro_abs_threshold=args.macro_abs_threshold,
        macro_pct_threshold=args.macro_pct_threshold,
    )

    overlap = report["overlap_count"]
    mismatch_rate = report["mismatch_rate"]
    mismatch_count = report["mismatch_count"]
    pass_overlap = overlap >= args.min_overlap
    pass_mismatch_rate = mismatch_rate <= args.max_mismatch_rate
    passed = pass_overlap and pass_mismatch_rate

    print("NUTRITION CROSS-SOURCE CHECK")
    print("=" * 60)
    print(f"Primary items:   {report['primary_count']}")
    print(f"Secondary items: {report['secondary_count']}")
    print(f"Overlap items:   {overlap}")
    print(f"Mismatches:      {mismatch_count}")
    print(f"Mismatch rate:   {mismatch_rate:.1%}")
    print(f"Only in primary: {report['only_primary_count']}")
    print(f"Only in secondary: {report['only_secondary_count']}")
    print("-" * 60)

    if report["mismatches"]:
        print("Top mismatches:")
        for item in report["mismatches"][:15]:
            issue_summary = ", ".join(
                [
                    f"{issue['field']} (diff {issue['abs_diff']}, {issue['pct_diff']:.1%})"
                    for issue in item["issues"]
                ]
            )
            print(f"- {item['primary_name']} <-> {item['secondary_name']}: {issue_summary}")
        if len(report["mismatches"]) > 15:
            print(f"... {len(report['mismatches']) - 15} more mismatch rows")

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        with args.json_out.open("w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\nWrote JSON report: {args.json_out}")

    print("-" * 60)
    if not pass_overlap:
        print(
            f"FAIL: overlap {overlap} is below required minimum {args.min_overlap}"
        )
    if not pass_mismatch_rate:
        print(
            f"FAIL: mismatch rate {mismatch_rate:.1%} exceeds max {args.max_mismatch_rate:.1%}"
        )

    if passed:
        print("PASS: cross-source quality gate passed.")
        return 0

    print("FAIL: cross-source quality gate failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
