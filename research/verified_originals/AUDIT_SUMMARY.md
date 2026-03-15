# Snack Originals Verification Audit

> Date: 2026-03-14
> Audited: 82 original snack items across 6 categories
> Research method: Web search of official brand sites, FatSecret, CalorieKing, USDA, retailer listings
> Source files: `01_candy_bars.json` through `06_condiments_grocery.json`

## Purpose

The lead magnet uses intentionally generous portions (King Size, grab bags) to maximize the calorie savings story. For **client-facing coaching**, we need verified, standard serving sizes with accurate macros. This audit creates that truth layer.

---

## Results Overview

| Category | Items | Confirmed | Needs Update | Serving Mismatch |
|----------|-------|-----------|-------------|------------------|
| Candy/Gummy | 13 | 5 | 4 | 4 |
| Chips/Crackers | 14 | 10 | 4 | 0 |
| Cookies/Pastries | 13 | 11 | 2 | 0 |
| Frozen/Drinks | 13 | 9 | 4 | 0 |
| Cereal/Misc | 12 | 6 | 6 | 1 |
| Condiments/Grocery | 16 | 16 | 0 | 0 |
| **TOTAL** | **81** | **57** | **20** | **5** |

---

## CRITICAL Fixes (>50 cal off or data entry error)

| Item | DB Calories | Verified Calories | Delta | Issue |
|------|------------|------------------|-------|-------|
| **Tostitos Scoops (28g)** | 280 | **140** | -140 | Data entry error: entered 2 servings instead of 1 |
| **Haagen-Dazs Vanilla (14oz)** | 1070 | **~800** | -270 | Pint overcount (2.5 servings x 320 = 800) |
| **Talenti CCCD (16oz)** | 900 | **~720** | -180 | Pint overcount (3 servings x 240 = 720) |
| **Orville Popcorn (full bag)** | 425 | **~595** | +170 | Full bag UNDERcounted (3.5 servings x 170) |
| **Guac + Chips (half tub)** | 440 | **~560** | +120 | Chip portion underestimated |
| **Tortilla Chips + Queso** | 430 | **600-900** | +170-470 | Restaurant portion highly variable, DB too low |
| **M&M's Peanut (3.27oz)** | 480 | **420** | -60 | 3 servings x 140 = 420, not 480 |

## Moderate Fixes (10-50 cal off)

| Item | DB Calories | Verified Calories | Delta |
|------|------------|------------------|-------|
| Nutter Butter (6 cookies) | 360 | ~390 | +30 |
| Takis Fuego (3.25oz) | 490 | 460 | -30 |
| Sour Patch Kids (3.5oz) | 360 | ~385 | +25 |
| Cheetos Flamin' Hot (2oz) | 320 | 344 | +24 |
| Sara Lee Bagel | 240 | 260 | +20 |
| Frosted Flakes (bowl+milk) | 315 | 302 | -13 |
| Trail Mix (1/2 cup) | 340 | 353 | +13 |
| Goldfish Cheddar (1.5oz) | 200 | 210 | +10 |
| Sour Patch Watermelon (40g) | 150 | 140 | -10 |
| Rold Gold Pretzels (1oz) | 120 | 110 | -10 |
| Oscar Mayer Wieners | 120 | 110 | -10 |
| Mission Tortilla | 210 | 200 | -10 |
| Trolli Crawlers | 91 | 100 | +9 |

## Serving Size Mismatches (DB only has King/Sharing size)

These items only have the large format in the DB. For client work, we should know the standard size too:

| Item | DB Size | DB Cal | Standard Size | Standard Cal |
|------|---------|--------|---------------|-------------|
| Kit Kat | King Size 3oz | 420 | Standard 1.5oz | 210 |
| Twix | King Size 3.02oz | 440 | Standard 1.79oz | 250 |
| Hershey's Milk Choc | King Size 2.6oz | 370 | Standard 1.55oz | 220 |
| Reese's PB Cups | King Size 2.8oz | 400 | Standard 2-pack 1.5oz | 210 |
| Swedish Fish | ~30g | 105 | Standard label 40g | 140 |

Note: Reese's King Size may also be slightly off (400 vs ~420).

## Non-Existent Serving Size

| Item | DB Serving | Issue |
|------|-----------|-------|
| Rold Gold Tiny Twists 1.75oz | 1.75oz = 193 cal | No 1.75oz retail bag exists. Standard is 1oz (110 cal) or 2oz (220 cal) |

---

## Recommendations

1. **For the lead magnet**: Keep current numbers as-is. The King Size / grab bag framing makes the savings story more compelling.
2. **For client dashboards**: Use verified numbers from this audit. When building ecosystem items, reference verified_calories.
3. **Consider adding a `verified_calories` column** to `snack_items` so both values coexist — lead magnet shows `calories`, client tools show `verified_calories`.
4. **Standard size entries**: For candy bars, consider adding standard-size original entries alongside King Size for client use.
