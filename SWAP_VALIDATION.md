# Swap Calorie Validation Report

**Date:** 2026-03-09
**Database:** `bulletproof_body.db`

---

## Executive Summary

The database contains **3 swap systems** with a total of **292 swap pairs**. The vast majority are correctly configured. **3 snack swaps are flagged** as broken or questionable. All 247 restaurant meal swaps and all 10 legacy food swaps pass validation. Ingredient-level calorie math is internally consistent. Spot-checks against published nutrition data show accurate values.

---

## 1. Template Meal Swaps (Primary System)

**Total swap pairs:** 247 (across 50 restaurants, ~5 per restaurant)

| Status | Count | Percentage |
|--------|-------|------------|
| Swap correctly lower calorie | **247** | **100%** |
| Swap equal or higher calorie | **0** | **0%** |

### Savings Distribution

| Savings Range | Count |
|---------------|-------|
| 0-99 cal | 1 |
| 100-199 cal | 13 |
| 200-299 cal | 12 |
| 300-499 cal | 51 |
| 500-699 cal | 66 |
| 700-999 cal | 71 |
| 1000+ cal | 33 |

- **Average savings:** 681 cal
- **Minimum savings:** 20 cal (Pura Vida: Signature Acai Bowl -> Lean Pitaya Bowl)
- **Maximum savings:** 2,990 cal (Outback: Bloomin' Onion + Ribeye Dinner -> Lean Sirloin swap)

### Lowest-Savings Swaps (worth reviewing for user value)

| Restaurant | Original | Swap | Savings |
|-----------|----------|------|---------|
| Pura Vida | Signature Acai Bowl (600) | Lean Pitaya Bowl (580) | **20 cal** |
| Smoothie King | Caribbean Way 20oz (400) | Metabolism Boost Mango Ginger (280) | 120 cal |
| First Watch | Avocado Toast Brunch (710) | Lean Avocado Toast (585) | 125 cal |

The 20 cal savings at Pura Vida is functionally meaningless for the user. Consider flagging swaps under 100 cal savings as low-impact.

---

## 2. Snack Swaps

**Total swap pairs:** 35

| Status | Count | Percentage |
|--------|-------|------------|
| Swap correctly lower calorie | **32** | **91.4%** |
| Swap equal calorie | **1** | **2.9%** |
| Swap HIGHER calorie (BROKEN) | **2** | **5.7%** |

### BROKEN Snack Swaps

#### 1. Pretzel Protein Tradeoff (HIGHER by 90 cal)
- **Original:** Rold Gold Tiny Twists, 120 cal, 3g protein (1 oz)
- **Swap:** Crisp Power Sesame Protein Pretzels, **210 cal**, 27g protein (1 bag)
- **Rationale in DB:** "Protein-first swap: calories are higher, but protein and fiber are dramatically higher"
- **Assessment:** This is an intentional protein-for-calories tradeoff, NOT a calorie swap. The rationale acknowledges higher calories. However, in a system called "calorie swaps," users expect lower calories. This is misleading.

#### 2. Reese's to Protein Bar (HIGHER by 10 cal)
- **Original:** Reese's Peanut Butter Cups, 210 cal, 4g protein (42g)
- **Swap:** ONE Peanut Butter Cup Protein Bar, **220 cal**, 20g protein (60g)
- **Rationale in DB:** "Calories are similar, but sugar drops sharply while protein increases significantly"
- **Assessment:** Same issue -- protein upgrade, not a calorie swap. 10 cal difference is negligible, but direction is wrong.

#### 3. Chips to Meat Crisps (EQUAL at 160 cal)
- **Original:** Lay's Classic Potato Chips, 160 cal, 2g protein (1 oz)
- **Swap:** Carnivore Snax Ribeye Crisps, **160 cal**, 16g protein (1 oz)
- **Rationale in DB:** "Keeps the crunchy snack format while replacing refined carbs with high protein"
- **Assessment:** Zero calorie savings. Pure macronutrient swap. Again, not a calorie reduction.

### Accuracy Check on Snack Items (spot-checked against published nutrition)

| Item | DB Calories | Published Calories | Status |
|------|-----------|-------------------|--------|
| Flamin' Hot Cheetos (2 oz) | 320 | 320 | Correct |
| Snickers (1.86 oz) | 280 | 280 | Correct |
| Oreo (6 cookies) | 320 | 320 | Correct |
| Ben & Jerry's Half Baked (1/2 pint) | 640 | 640 | Correct |
| Pop-Tarts Frosted Strawberry (2 pastries) | 370 | 370 | Correct |
| Reese's PB Cups (42g) | 210 | 210 | Correct |
| Lay's Classic Chips (1 oz) | 160 | 160 | Correct |

---

## 3. Legacy Food Swaps (food_items table)

**Total swap pairs:** 10

| Status | Count |
|--------|-------|
| Swap correctly lower calorie | **10** |
| Stated savings matches actual | **10** |
| Discrepancy between stated/actual | **0** |

All 10 legacy swaps have stated `calorie_savings` that exactly match the difference between original and swap `calories` fields. No integrity issues.

---

## 4. Ingredient Math Validation

**Do ingredient calories add up correctly for template meals?**

Every template meal's total is computed as `SUM(ingredient.calories * quantity)`. There is no separate "stated total" field on `template_meals` -- the total IS the sum. This means ingredient math is inherently consistent by design. There are no template meals with zero ingredients or zero total calories among swap-related meals.

### Spot-checked Ingredient Accuracy vs Published Nutrition

#### Chipotle (published on chipotle.com)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Flour Tortilla (Burrito) | 320 | 320 | Correct |
| Cilantro-Lime White Rice | 210 | 210 | Correct |
| Black Beans | 130 | 130 | Correct |
| Chicken | 180 | 180 | Correct |
| Cheese | 110 | 110 | Correct |
| Sour Cream | 110 | 110 | Correct |
| **Chicken Burrito total** | **1,085** | **~1,085** | **Correct** |

#### Chick-fil-A (published on chick-fil-a.com)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Chicken Sandwich | 440 | 440 | Correct |
| Waffle Fries (Medium) | 420 | 420 | Correct |
| Nuggets 12ct | 380 | 380 | Correct |
| Grilled Nuggets 12ct | 200 | 200 | Correct |
| Egg White Grill | 300 | 300 | Correct |

#### McDonald's (published on mcdonalds.com)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Big Mac | 590 | 590 | Correct |
| Quarter Pounder w/ Cheese | 520 | 520 | Correct |
| Medium Fries | 320 | 320 | Correct |
| McNuggets 10pc | 410 | 410 | Correct |
| Egg McMuffin | 310 | 310 | Correct |

#### Panda Express (published on pandaexpress.com)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Orange Chicken | 370 | 380 | **-10 cal (minor)** |
| Fried Rice | 520 | 520 | Correct |
| Chow Mein | 510 | 510 | Correct |
| Beijing Beef | 470 | 470 | Correct |
| Broccoli Beef | 150 | 150 | Correct |

#### In-N-Out (published on in-n-out.com)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Double-Double w/ Onion | 670 | 670 | Correct |
| Cheeseburger w/ Onion | 480 | 480 | Correct |
| French Fries | 395 | 395 | Correct |
| Protein Style Double-Double | 520 | 520 | Correct |

#### Outback (Bloomin' Onion)
| Ingredient | DB Cal | Published Cal | Status |
|-----------|--------|---------------|--------|
| Bloomin' Onion | 1,950 | 1,950 | Correct |
| Ribeye (13 oz) | 950 | ~950 | Correct |

#### Subway
Footlong meals correctly use `quantity: 2.0` for 6-inch base ingredients. Verified that bread, protein, cheese, and sauce portions are properly doubled.

### Wildly Inaccurate Calorie Counts

**None found.** All spot-checked values match published restaurant nutrition data within 10 calories. The only minor discrepancy is Panda Express Orange Chicken (370 in DB vs 380 published), which is a 2.6% difference and likely from a menu update.

---

## 5. Summary of Issues

### MUST FIX (3 items)

1. **`pretzel-protein-swap`** -- Swap is 90 cal HIGHER (120 -> 210). Either remove from calorie swap system or re-categorize as "protein upgrade" with clear labeling.

2. **`reeses-protein-swap`** -- Swap is 10 cal HIGHER (210 -> 220). Same issue. The protein gain is legitimate (4g -> 20g) but it is not a calorie reduction.

3. **`chips-to-carnivore`** -- Swap has ZERO calorie savings (160 = 160). Pure macro swap, not a calorie swap.

### CONSIDER REVIEWING (1 item)

4. **Pura Vida Acai Bowl swap** -- Only 20 cal savings. Functionally meaningless. May confuse users who expect meaningful reductions.

### CLEAN (Everything Else)

- All 247 template meal swaps: correctly lower calorie
- All 10 legacy food swaps: correctly lower calorie, stated savings match actual
- All 32 remaining snack swaps: correctly lower calorie
- Ingredient math: inherently consistent (no separate stored total to mismatch)
- Calorie accuracy: spot-checks match published nutrition data across 6 major chains

---

## Totals

| System | Total Pairs | Correct | Broken | Pass Rate |
|--------|------------|---------|--------|-----------|
| Template Meals | 247 | 247 | 0 | 100% |
| Snack Swaps | 35 | 32 | 3 | 91.4% |
| Legacy Food Swaps | 10 | 10 | 0 | 100% |
| **TOTAL** | **292** | **289** | **3** | **99.0%** |
