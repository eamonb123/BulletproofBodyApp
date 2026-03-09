#!/usr/bin/env python3
"""Universal nutrition data validation engine.

Used by ALL restaurant ingestion scripts. Every ingredient must pass these
checks before entering the database. No exceptions.

VALIDATION LAYERS:
  1. Range checks — is each nutrient within physically possible bounds?
  2. Macro math — do calories roughly equal (P*4 + C*4 + F*9)?
  3. Cal-from-fat check — does it roughly equal fat * 9?
  4. Cross-reference — compare against online sources if available
  5. Meal totals — do composed meals fall within restaurant's stated ranges?

PHILOSOPHY:
  - Hard errors BLOCK insertion (out-of-range = bad data)
  - Warnings FLAG but allow insertion (rounding differences are normal)
  - Every warning is logged so humans can audit
  - Trust official PDFs/websites over computed values
  - Low-cal items (<50 cal) get wider tolerance (rounding matters more)
"""


# ══════════════════════════════════════════════════════════
# RANGE CHECKS
# ══════════════════════════════════════════════════════════

# Per-serving ranges — supports both atomic ingredients and full menu combo rows.
# Some restaurants also model "no sugar/no sauce" modifiers as negative deltas.
VALID_RANGES = {
    "calories":         (-500, 3500),
    "calories_from_fat": (0, 2500),
    "total_fat_g":      (0, 250),
    "saturated_fat_g":  (0, 100),
    "trans_fat_g":      (0, 20),
    "cholesterol_mg":   (0, 1500),
    "sodium_mg":        (0, 8000),
    "carbohydrate_g":   (-100, 500),
    "dietary_fiber_g":  (0, 80),
    "sugar_g":          (-100, 300),
    "protein_g":        (0, 200),
}

# Macro math tolerance: stated cal vs computed cal
# Low-cal items need wider tolerance (rounding has bigger % impact)
MACRO_TOLERANCE_NORMAL = 0.20   # 20% for items > 50 cal
MACRO_TOLERANCE_LOW_CAL = 0.50  # 50% for items <= 50 cal

# Cal-from-fat tolerance
CAL_FROM_FAT_TOLERANCE = 0.30


def validate_ingredient(name, data):
    """Validate a single ingredient's nutrition data.

    Args:
        name: Human-readable ingredient name
        data: Dict with keys matching VALID_RANGES + calories, protein_g, etc.

    Returns:
        (is_valid, issues) where:
          - is_valid=False means HARD ERRORS (do not insert)
          - issues is a list of strings (errors or warnings)
    """
    errors = []
    warnings = []

    # ── Layer 1: Range checks ────────────────────────────
    for field, (low, high) in VALID_RANGES.items():
        val = data.get(field, 0) or 0
        if val < low or val > high:
            errors.append(f"RANGE: {field}={val} outside [{low}, {high}]")

    # ── Layer 2: Macro math ──────────────────────────────
    cal = data.get("calories", 0) or 0
    prot = data.get("protein_g", 0) or 0
    carbs = data.get("carbohydrate_g", 0) or 0
    fat = data.get("total_fat_g", 0) or 0

    if cal > 0:
        expected_cal = (prot * 4) + (carbs * 4) + (fat * 9)
        if expected_cal > 0:
            ratio = cal / expected_cal
            tolerance = MACRO_TOLERANCE_LOW_CAL if cal <= 50 else MACRO_TOLERANCE_NORMAL
            if ratio < (1 - tolerance) or ratio > (1 + tolerance):
                warnings.append(
                    f"MACRO_MATH: stated {cal} cal vs computed {expected_cal:.0f} cal "
                    f"(P:{prot}*4 + C:{carbs}*4 + F:{fat}*9) ratio={ratio:.2f}"
                )

    # ── Layer 3: Cal-from-fat check ──────────────────────
    cal_from_fat = data.get("calories_from_fat", 0) or 0
    if cal_from_fat > 0 and fat > 0:
        expected_cff = fat * 9
        if abs(cal_from_fat - expected_cff) > expected_cff * CAL_FROM_FAT_TOLERANCE:
            warnings.append(
                f"CAL_FROM_FAT: stated {cal_from_fat} vs fat*9={expected_cff:.0f}"
            )

    # ── Layer 4: Sanity checks ───────────────────────────
    # Fat can't contribute more calories than total calories
    if fat * 9 > cal * 1.1 and cal > 10:
        errors.append(f"IMPOSSIBLE: fat ({fat}g = {fat*9} cal) > total calories ({cal})")

    # Protein can't contribute more calories than total calories
    if prot * 4 > cal * 1.1 and cal > 10:
        errors.append(f"IMPOSSIBLE: protein ({prot}g = {prot*4} cal) > total calories ({cal})")

    # Saturated fat can't exceed total fat
    sat_fat = data.get("saturated_fat_g", 0) or 0
    if sat_fat > fat + 0.5:  # 0.5g rounding tolerance
        errors.append(f"IMPOSSIBLE: saturated fat ({sat_fat}g) > total fat ({fat}g)")

    if errors:
        return False, errors
    return True, warnings


def validate_meal_total(name, total_cal, stated_ranges):
    """Check a composed meal's total calories against stated ranges.

    Args:
        name: Meal name (checked against range keys)
        total_cal: Computed total from ingredients
        stated_ranges: Dict of {meal_type: (low, high)} from restaurant

    Returns:
        List of warning strings (empty = OK)
    """
    warnings = []
    for meal_type, (low, high) in stated_ranges.items():
        if meal_type in name.lower():
            if total_cal < low or total_cal > high:
                warnings.append(
                    f"MEAL_TOTAL: '{name}' = {total_cal} cal, "
                    f"outside stated range [{low}, {high}] for {meal_type}"
                )
            break
    return warnings


def print_validation_report(name, portion, is_valid, issues):
    """Pretty-print validation results."""
    if not is_valid:
        print(f"\n  FAIL: {name} ({portion})")
        for e in issues:
            print(f"    {e}")
    elif issues:
        print(f"\n  WARN: {name} ({portion})")
        for w in issues:
            print(f"    {w}")
    # Silent on success — less noise


def summarize_validation(total, inserted, errors, warnings):
    """Print summary of validation run."""
    print(f"\n  Validated: {total} | Inserted: {inserted} | "
          f"Errors: {errors} | Warnings: {warnings}")
    if errors > 0:
        print("  *** HARD ERRORS — review data before using ***")
