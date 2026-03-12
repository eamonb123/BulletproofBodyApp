# Bulletproof Body App - Swap Coverage Audit

**Generated:** 2026-03-09

## Summary

| Metric | Value |
|--------|-------|
| Total restaurants | 50 |
| Total original meals | 250 |
| Total swap meals | 247 |
| Originals WITH a swap | 245 |
| Originals WITHOUT a swap | **5** |
| Swap coverage | **98.0%** |

## Restaurants Missing Swaps (5 meals across 5 restaurants)

| Restaurant | Missing Meal | Meal ID |
|------------|-------------|---------|
| KFC | Famous Bowl Meal | `kfc_famous_bowl_meal` |
| Moe's Southwest Grill | Steak Quesadilla | `moes_steak_quesadilla` |
| Popeyes Louisiana Kitchen | Popcorn Shrimp Dinner | `pop_shrimp_dinner` |
| Qdoba Mexican Eats | Street Style Chicken Tacos (3) | `qdoba_street_tacos` |
| Subway | Turkey Sub 6-inch | `subway_turkey_sub_6inch` |

### Why These Are Missing

These 5 restaurants each have 5 originals but only 4 swaps. The swap was never created for the meal listed above.

Two restaurants (Qdoba, Subway) mask the gap by having one original with 2 swaps pointed at it:
- **Qdoba:** "Chicken Queso Burrito (Signature)" has 2 swaps (Lean Chicken Queso Bowl + Protein-Packed Keto Bowl)
- **Subway:** "Chicken Bacon Ranch Footlong" has 2 swaps (Grilled Chicken Salad Bowl + Lean Grilled Chicken Sub)

## Per-Restaurant Breakdown

| Restaurant | Originals | Swaps | Coverage |
|------------|-----------|-------|----------|
| CAVA | 7 | 7 | 100% |
| Applebee's Grill & Bar | 5 | 5 | 100% |
| Arby's | 5 | 5 | 100% |
| BJ's Restaurant & Brewhouse | 5 | 5 | 100% |
| Buffalo Wild Wings | 5 | 5 | 100% |
| Burger King | 5 | 5 | 100% |
| The Cheesecake Factory | 5 | 5 | 100% |
| Chick-fil-A | 5 | 5 | 100% |
| Chili's | 5 | 5 | 100% |
| Chipotle Mexican Grill | 5 | 5 | 100% |
| Cracker Barrel | 5 | 5 | 100% |
| Dairy Queen | 5 | 5 | 100% |
| Denny's | 5 | 5 | 100% |
| Dunkin' | 5 | 5 | 100% |
| Firehouse Subs | 5 | 5 | 100% |
| First Watch | 5 | 5 | 100% |
| IHOP | 5 | 5 | 100% |
| In-N-Out Burger | 4 | 4 | 100% |
| Jersey Mike's | 5 | 5 | 100% |
| Jimmy John's | 5 | 5 | 100% |
| **KFC** | **5** | **4** | **80%** |
| Little Caesar's | 5 | 5 | 100% |
| LongHorn Steakhouse | 5 | 5 | 100% |
| McDonald's | 5 | 5 | 100% |
| **Moe's Southwest Grill** | **5** | **4** | **80%** |
| Olive Garden | 5 | 5 | 100% |
| Outback Steakhouse | 5 | 5 | 100% |
| Panda Express | 5 | 5 | 100% |
| Panera Bread | 5 | 5 | 100% |
| Papa John's | 5 | 5 | 100% |
| Pizza Hut | 5 | 5 | 100% |
| **Popeyes Louisiana Kitchen** | **5** | **4** | **80%** |
| Pura Vida | 5 | 5 | 100% |
| **Qdoba Mexican Eats** | **5** | **5*** | **80%** |
| Raising Cane's | 4 | 4 | 100% |
| Red Lobster | 5 | 5 | 100% |
| Sheetz | 5 | 5 | 100% |
| Smoothie King | 5 | 5 | 100% |
| Sonic Drive-In | 5 | 5 | 100% |
| **Subway** | **5** | **5*** | **80%** |
| Sweetgreen | 5 | 5 | 100% |
| Taco Bell | 5 | 5 | 100% |
| Texas Roadhouse | 5 | 5 | 100% |
| Tropical Smoothie Cafe | 5 | 5 | 100% |
| Waffle House | 5 | 5 | 100% |
| Wawa | 5 | 5 | 100% |
| Wendy's | 5 | 5 | 100% |
| Whataburger | 5 | 5 | 100% |
| Yard House | 5 | 5 | 100% |
| Zaxby's | 5 | 5 | 100% |

\* Qdoba and Subway have 5 swap rows total but one original has 2 swaps while another has 0 -- net result is 1 original uncovered.

## Snack Swaps (Separate System)

| Metric | Value |
|--------|-------|
| Total active snack items | 69 |
| Active snack swaps | 35 |
| Unique snacks with a swap (as original) | 34 |

Snack swaps are a different data model (`snack_items` / `snack_swaps`) and not directly comparable to the restaurant template meal system.

## Schema Notes

- **Active system:** `template_meals` table with `is_swap` boolean and `swap_for` FK back to the original meal
- **Legacy system:** `food_swaps` table (only 10 rows, appears unused)
- Each original meal is expected to have exactly 1 swap meal pointing at it via `swap_for`
