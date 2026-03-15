-- P.F. Chang's v2 — Official Nutrition PDF (Revised October 2025)
-- ALL numbers from official PDF. NO estimates, NO oil buffers.
-- Ingredient breakdowns are logical splits that SUM to official totals.

-- ============================================================
-- 1. RESTAURANT (keep existing or insert)
-- ============================================================
INSERT OR REPLACE INTO restaurants (id, name, logo_emoji, cuisine, website, nutrition_source, restaurant_type)
VALUES ('pfchangs', 'P.F. Chang''s', '🥡', 'chinese', 'https://www.pfchangs.com',
        'P.F. Chang''s Nutrition PDF (Revised October 2025)', 'chain');

-- ============================================================
-- 2. MENU CATEGORIES
-- ============================================================
INSERT OR IGNORE INTO menu_categories (id, restaurant_id, name, display_order, selection_type, description) VALUES
('pfchangs_appetizers', 'pfchangs', 'Appetizers', 1, 'single', 'Starters and shareables'),
('pfchangs_soups', 'pfchangs', 'Soups', 2, 'single', 'Soup options'),
('pfchangs_entrees', 'pfchangs', 'Main Entrees (Traditional)', 3, 'single', 'Full-size entrees — NO rice included'),
('pfchangs_dinner_specials', 'pfchangs', 'Dinner Specials', 4, 'single', 'Smaller portions — NO rice included'),
('pfchangs_noodles_rice', 'pfchangs', 'Noodles & Rice Entrees', 5, 'single', 'Complete noodle/rice dishes'),
('pfchangs_sides', 'pfchangs', 'Sides', 6, 'single', 'Rice, noodle sides'),
('pfchangs_add_protein', 'pfchangs', 'Add Extra Protein', 7, 'single', 'Extra protein add-ons');

-- ============================================================
-- 3. INGREDIENTS — Official PDF nutrition values
-- ============================================================

-- ── MAIN ENTREES / TRADITIONAL SIZED (pages 4-5) ────────────
-- These are the FULL entree, all-in nutrition. No rice included.

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_mongolian_beef_trad', 'pfchangs', 'pfchangs_entrees', 'Mongolian Beef (Traditional)', '1 serving', 680, 34.0, 40.0, 54.0, 'eamon'),
('pfc_beef_broccoli_trad', 'pfchangs', 'pfchangs_entrees', 'Beef with Broccoli (Traditional)', '1 serving', 600, 26.0, 46.0, 46.0, 'eamon'),
('pfc_teriyaki_beef_trad', 'pfchangs', 'pfchangs_entrees', 'Teriyaki Beef (Traditional)', '1 serving', 800, 30.0, 70.0, 36.0, 'eamon'),
('pfc_pepper_steak_trad', 'pfchangs', 'pfchangs_entrees', 'Pepper Steak (Traditional)', '1 serving', 600, 30.0, 30.0, 48.0, 'eamon'),
('pfc_sesame_beef_trad', 'pfchangs', 'pfchangs_entrees', 'Sesame Beef (Traditional)', '1 serving', 820, 32.0, 80.0, 50.0, 'eamon'),
('pfc_kung_pao_beef_trad', 'pfchangs', 'pfchangs_entrees', 'Kung Pao Beef (Traditional)', '1 serving', 900, 54.0, 52.0, 56.0, 'eamon'),
('pfc_changs_spicy_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Chang''s Spicy Chicken (Traditional)', '1 serving', 1060, 52.0, 66.0, 50.0, 'eamon'),
('pfc_crispy_honey_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Crispy Honey Chicken (Traditional)', '1 serving', 1380, 82.0, 112.0, 44.0, 'eamon'),
('pfc_sesame_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Sesame Chicken (Traditional)', '1 serving', 980, 48.0, 60.0, 48.0, 'eamon'),
('pfc_orange_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Orange Chicken (Traditional)', '1 serving', 1260, 74.0, 108.0, 44.0, 'eamon'),
('pfc_chicken_broccoli_trad', 'pfchangs', 'pfchangs_entrees', 'Chicken with Broccoli (Traditional)', '1 serving', 480, 14.0, 30.0, 60.0, 'eamon'),
('pfc_sweet_sour_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Sweet & Sour Chicken (Traditional)', '1 serving', 880, 42.0, 88.0, 36.0, 'eamon'),
('pfc_teriyaki_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Teriyaki Chicken (Traditional)', '1 serving', 980, 44.0, 82.0, 40.0, 'eamon'),
('pfc_kung_pao_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Kung Pao Chicken (Traditional)', '1 serving', 1040, 68.0, 30.0, 54.0, 'eamon'),
('pfc_black_pepper_chicken_trad', 'pfchangs', 'pfchangs_entrees', 'Black Pepper Chicken (Traditional)', '1 serving', 880, 50.0, 76.0, 30.0, 'eamon'),
('pfc_firecracker_shrimp_trad', 'pfchangs', 'pfchangs_entrees', 'Firecracker Shrimp (Traditional)', '1 serving', 580, 34.0, 28.0, 44.0, 'eamon'),
('pfc_crispy_honey_shrimp_trad', 'pfchangs', 'pfchangs_entrees', 'Crispy Honey Shrimp (Traditional)', '1 serving', 1180, 80.0, 78.0, 30.0, 'eamon'),
('pfc_miso_salmon_trad', 'pfchangs', 'pfchangs_entrees', 'Miso Glazed Salmon (Traditional)', '1 serving', 680, 38.0, 32.0, 52.0, 'eamon');

-- ── RICE / NOODLE SIDES (page 3) ────────────────────────────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_white_rice', 'pfchangs', 'pfchangs_sides', 'White Rice', '8 oz', 290, 0.0, 65.0, 5.0, 'eamon'),
('pfc_brown_rice', 'pfchangs', 'pfchangs_sides', 'Brown Rice', '8 oz', 250, 2.0, 53.0, 5.0, 'eamon'),
('pfc_fried_rice_side', 'pfchangs', 'pfchangs_sides', 'Fried Rice (side)', '1 serving', 500, 15.0, 76.0, 13.0, 'eamon'),
('pfc_lo_mein_noodles_side', 'pfchangs', 'pfchangs_sides', 'Lo Mein Noodles (side)', '1 serving', 560, 12.0, 97.0, 15.0, 'eamon');

-- ── DINNER SPECIALS (page 2) — smaller portions, NO rice ────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_mongolian_beef_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Mongolian Beef (Dinner Special)', '1 serving', 400, 20.0, 24.0, 31.0, 'eamon'),
('pfc_mongolian_tofu_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Mongolian Tofu (Dinner Special)', '1 serving', 550, 38.0, 40.0, 13.0, 'eamon'),
('pfc_changs_spicy_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Chang''s Spicy Chicken (Dinner Special)', '1 serving', 610, 31.0, 34.0, 29.0, 'eamon'),
('pfc_firecracker_shrimp_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Firecracker Shrimp (Dinner Special)', '1 serving', 450, 30.0, 22.0, 26.0, 'eamon'),
('pfc_sesame_chicken_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Sesame Chicken (Dinner Special)', '1 serving', 640, 31.0, 43.0, 30.0, 'eamon'),
('pfc_beef_broccoli_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Beef & Broccoli (Dinner Special)', '1 serving', 430, 19.0, 35.0, 30.0, 'eamon'),
('pfc_teriyaki_beef_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Teriyaki Beef (Dinner Special)', '1 serving', 510, 20.0, 61.0, 23.0, 'eamon'),
('pfc_teriyaki_chicken_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Teriyaki Chicken (Dinner Special)', '1 serving', 670, 29.0, 46.0, 26.0, 'eamon'),
('pfc_crispy_honey_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Crispy Honey Chicken (Dinner Special)', '1 serving', 790, 42.0, 73.0, 26.0, 'eamon'),
('pfc_orange_chicken_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Orange Chicken (Dinner Special)', '1 serving', 760, 42.0, 71.0, 27.0, 'eamon'),
('pfc_kung_pao_chicken_dinner', 'pfchangs', 'pfchangs_dinner_specials', 'Kung Pao Chicken (Dinner Special)', '1 serving', 650, 43.0, 19.0, 33.0, 'eamon');

-- ── APPETIZERS (page 1) ─────────────────────────────────────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_lettuce_wraps_full', 'pfchangs', 'pfchangs_appetizers', 'Chang''s Chicken Lettuce Wraps (Full)', '1 serving', 660, 26.0, 66.0, 38.0, 'eamon'),
('pfc_veggie_lettuce_wraps', 'pfchangs', 'pfchangs_appetizers', 'Veggie Lettuce Wraps', '1 serving', 640, 34.0, 76.0, 14.0, 'eamon'),
('pfc_lettuce_wraps_half', 'pfchangs', 'pfchangs_appetizers', 'Chang''s Chicken Lettuce Wraps (Half)', '1 serving', 440, 23.0, 38.0, 19.0, 'eamon');

-- ── SOUPS (page 2) ──────────────────────────────────────────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_wonton_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Wonton Soup (Bowl)', '1 bowl', 480, 14.0, 52.0, 40.0, 'eamon'),
('pfc_wonton_soup_cup', 'pfchangs', 'pfchangs_soups', 'Wonton Soup (Cup)', '1 cup', 130, 3.5, 14.0, 9.0, 'eamon'),
('pfc_egg_drop_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Egg Drop Soup (Bowl)', '1 bowl', 280, 6.0, 44.0, 8.0, 'eamon'),
('pfc_egg_drop_soup_cup', 'pfchangs', 'pfchangs_soups', 'Egg Drop Soup (Cup)', '1 cup', 40, 1.0, 6.0, 1.0, 'eamon'),
('pfc_hot_sour_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Hot & Sour Soup (Bowl)', '1 bowl', 480, 12.0, 60.0, 28.0, 'eamon'),
('pfc_hot_sour_soup_cup', 'pfchangs', 'pfchangs_soups', 'Hot & Sour Soup (Cup)', '1 cup', 70, 2.0, 9.0, 4.0, 'eamon');

-- ── ADD EXTRA PROTEIN (page 5) ──────────────────────────────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_add_chicken_steamed', 'pfchangs', 'pfchangs_add_protein', 'Add Chicken (Steamed)', '1 serving', 100, 3.0, 0.0, 18.0, 'eamon'),
('pfc_add_chicken_wok_fried', 'pfchangs', 'pfchangs_add_protein', 'Add Chicken (Wok Fried)', '1 serving', 120, 6.0, 2.0, 16.0, 'eamon'),
('pfc_add_shrimp_steamed', 'pfchangs', 'pfchangs_add_protein', 'Add Shrimp (Steamed)', '1 serving', 40, 0.0, 0.0, 8.0, 'eamon'),
('pfc_add_tofu', 'pfchangs', 'pfchangs_add_protein', 'Add Tofu', '1 serving', 120, 11.0, 2.0, 5.0, 'eamon');

-- ── NOODLES & RICE ENTREES — TRADITIONAL (page 5) ───────────

INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_pad_thai_plain', 'pfchangs', 'pfchangs_noodles_rice', 'Pad Thai (Plain)', '1 serving', 1320, 46.0, 194.0, 36.0, 'eamon'),
('pfc_pad_thai_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Chicken Pad Thai', '1 serving', 1480, 50.0, 194.0, 64.0, 'eamon'),
('pfc_lo_mein_veg', 'pfchangs', 'pfchangs_noodles_rice', 'Lo Mein Vegetables', '1 serving', 720, 14.0, 126.0, 22.0, 'eamon'),
('pfc_lo_mein_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Lo Mein Chicken', '1 serving', 860, 22.0, 120.0, 44.0, 'eamon'),
('pfc_lo_mein_beef', 'pfchangs', 'pfchangs_noodles_rice', 'Lo Mein Beef', '1 serving', 860, 26.0, 118.0, 40.0, 'eamon'),
('pfc_fried_rice_veg', 'pfchangs', 'pfchangs_noodles_rice', 'Fried Rice with Vegetables', '1 serving', 900, 16.0, 162.0, 24.0, 'eamon'),
('pfc_fried_rice_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Fried Rice with Chicken', '1 serving', 1020, 20.0, 152.0, 54.0, 'eamon'),
('pfc_fried_rice_beef', 'pfchangs', 'pfchangs_noodles_rice', 'Fried Rice with Beef', '1 serving', 1040, 26.0, 154.0, 56.0, 'eamon'),
('pfc_singapore_noodles', 'pfchangs', 'pfchangs_noodles_rice', 'Singapore Street Noodles', '1 serving', 1220, 14.0, 224.0, 52.0, 'eamon');

-- ── BUDDHA'S FEAST (page 4) ─────────────────────────────────
-- Official: 480 cal, 30g fat, 38g carbs, 16g protein (stir-fried version)
INSERT OR REPLACE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, source) VALUES
('pfc_buddhas_feast', 'pfchangs', 'pfchangs_entrees', 'Buddha''s Feast', '1 serving', 480, 30.0, 38.0, 16.0, 'eamon');


-- ============================================================
-- 4. TEMPLATE MEALS — "ENEMY" MEALS (what people typically order)
-- ============================================================

-- Enemy 1: Crispy Honey Chicken + White Rice (1380 + 290 = 1670)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_crispy_honey_combo', 'pfchangs', 'Crispy Honey Chicken + White Rice',
'Crispy Honey Chicken (Traditional) with white rice. 1,380 cal entree + 290 cal rice = 1,670 total. Deep-fried battered chicken drowning in honey glaze — this is the calorie king.',
'entree', 0, NULL, 1, 'eamon');

-- Enemy 2: Orange Chicken + Fried Rice (1260 + 500 = 1760)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_orange_chicken_combo', 'pfchangs', 'Orange Chicken + Fried Rice',
'Orange Chicken (Traditional) with fried rice. 1,260 cal entree + 500 cal fried rice = 1,760 total. Battered fried chicken in sweet orange glaze on top of oily fried rice.',
'entree', 0, NULL, 2, 'eamon');

-- Enemy 3: Chang's Spicy Chicken + White Rice (1060 + 290 = 1350)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_spicy_chicken_combo', 'pfchangs', 'Chang''s Spicy Chicken + White Rice',
'Chang''s Spicy Chicken (Traditional) with white rice. 1,060 cal entree + 290 cal rice = 1,350 total. Crispy chicken tossed in a chili sauce with dried chilies.',
'entree', 0, NULL, 3, 'eamon');

-- Enemy 4: Kung Pao Chicken + White Rice (1040 + 290 = 1330)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_kung_pao_combo', 'pfchangs', 'Kung Pao Chicken + White Rice',
'Kung Pao Chicken (Traditional) with white rice. 1,040 cal entree + 290 cal rice = 1,330 total. 68g fat from peanuts and wok oil, surprisingly only 30g carbs in the entree itself.',
'entree', 0, NULL, 4, 'eamon');

-- Enemy 5: Sesame Chicken + White Rice (980 + 290 = 1270)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_sesame_chicken_combo', 'pfchangs', 'Sesame Chicken + White Rice',
'Sesame Chicken (Traditional) with white rice. 980 cal entree + 290 cal rice = 1,270 total. Battered chicken in sweet sesame glaze.',
'entree', 0, NULL, 5, 'eamon');

-- Enemy 6: Mongolian Beef + White Rice (680 + 290 = 970)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_mongolian_beef_combo', 'pfchangs', 'Mongolian Beef + White Rice',
'Mongolian Beef (Traditional) with white rice. 680 cal entree + 290 cal rice = 970 total. Stir-fried beef in sweet soy glaze with scallions. One of the lighter beef options.',
'entree', 0, NULL, 6, 'eamon');

-- Enemy 7: Chicken Lo Mein (860 — includes noodles)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_lo_mein_combo', 'pfchangs', 'Chicken Lo Mein',
'Chicken Lo Mein. 860 cal total — already includes noodles. 120g carbs from the noodles alone.',
'entree', 0, NULL, 7, 'eamon');

-- Enemy 8: Chicken Pad Thai (1480 — includes noodles)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_pad_thai_combo', 'pfchangs', 'Chicken Pad Thai',
'Chicken Pad Thai. 1,480 cal total — already includes rice noodles. 194g carbs. This is almost an entire day of food in one dish.',
'entree', 0, NULL, 8, 'eamon');

-- Enemy 9: Chicken Fried Rice (1020 — includes rice)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_fried_rice_combo', 'pfchangs', 'Chicken Fried Rice',
'Fried Rice with Chicken. 1,020 cal total — already includes rice. 152g carbs cooked in oil.',
'entree', 0, NULL, 9, 'eamon');

-- Enemy 10: Chang's Lettuce Wraps (Full) (660)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_lettuce_wraps_meal', 'pfchangs', 'Chang''s Lettuce Wraps (Full Order)',
'Chang''s Chicken Lettuce Wraps — full order. 660 cal. Not terrible but 66g carbs from the sauce, water chestnuts, and crispy noodles.',
'appetizer', 0, NULL, 10, 'eamon');


-- ============================================================
-- 5. TEMPLATE MEALS — "HERO" SWAP MEALS
-- ============================================================

-- Swap 1: Chicken with Broccoli (no rice) → swaps for Crispy Honey Chicken + Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_chicken_broc_rice', 'pfchangs', 'Chicken with Broccoli + Brown Rice',
'Chicken with Broccoli (Traditional) + Brown Rice. 480 + 250 = 730 cal, 65g protein.',
'entree', 1, 'pfc_crispy_honey_combo',
'Swap Crispy Honey Chicken + White Rice (1,670 cal, 49g protein) for Chicken with Broccoli + Brown Rice (730 cal, 65g protein). Save 940 calories and get 16g MORE protein. The honey chicken is deep-fried and sugar-glazed. The broccoli version is stir-fried with lean chicken breast.',
11, 'eamon',
'Can I get the Chicken with Broccoli with a side of brown rice please? Sauce on the side.');

-- Swap 2: Firecracker Shrimp (no rice) → swaps for Orange Chicken + Fried Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_firecracker_shrimp', 'pfchangs', 'Firecracker Shrimp (No Rice)',
'Firecracker Shrimp (Traditional), no rice. 580 cal, 44g protein.',
'entree', 1, 'pfc_orange_chicken_combo',
'Swap Orange Chicken + Fried Rice (1,760 cal, 57g protein) for Firecracker Shrimp no rice (580 cal, 44g protein). Save 1,180 calories. The orange chicken is deep-fried in batter with sweet glaze, paired with oily fried rice. The shrimp is lighter with real protein.',
12, 'eamon',
'Can I get the Firecracker Shrimp, no rice please.');

-- Swap 3: Miso Glazed Salmon (no rice) → swaps for Sesame Chicken + Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_miso_salmon', 'pfchangs', 'Miso Glazed Salmon (No Rice)',
'Miso Glazed Salmon (Traditional), no rice. 680 cal, 52g protein. Omega-3 rich.',
'entree', 1, 'pfc_sesame_chicken_combo',
'Swap Sesame Chicken + White Rice (1,270 cal, 53g protein) for Miso Glazed Salmon no rice (680 cal, 52g protein). Save 590 calories with the SAME protein. Plus you get healthy omega-3 fats from the salmon instead of fried batter fat.',
13, 'eamon',
'Can I get the Miso Glazed Salmon, no rice please. Steamed vegetables on the side if possible.');

-- Swap 4: Mongolian Beef Dinner Special (no rice) → swaps for Mongolian Beef + Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_mongolian_dinner', 'pfchangs', 'Mongolian Beef (Dinner Special, No Rice)',
'Mongolian Beef Dinner Special, no rice. 400 cal, 31g protein. Smaller portion, same flavor.',
'entree', 1, 'pfc_mongolian_beef_combo',
'Swap Mongolian Beef + White Rice (970 cal, 59g protein) for Mongolian Beef Dinner Special no rice (400 cal, 31g protein). Save 570 calories. Same dish, smaller portion — you skip the 290-cal rice side and get a right-sized entree.',
14, 'eamon',
'Can I get the Mongolian Beef from the Dinner Specials menu, no rice please.');

-- Swap 5: Beef with Broccoli (no rice) → swaps for Chicken Lo Mein
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_beef_broccoli', 'pfchangs', 'Beef with Broccoli (No Rice)',
'Beef with Broccoli (Traditional), no rice. 600 cal, 46g protein.',
'entree', 1, 'pfc_lo_mein_combo',
'Swap Chicken Lo Mein (860 cal, 44g protein) for Beef with Broccoli no rice (600 cal, 46g protein). Save 260 calories with 2g MORE protein. The lo mein has 120g carbs from noodles — the broccoli dish has real vegetables instead.',
15, 'eamon',
'Can I get the Beef with Broccoli, no rice, extra broccoli if possible. Sauce on the side.');

-- Swap 6: Chicken with Broccoli (no rice) → swaps for Chicken Pad Thai
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_chicken_broccoli', 'pfchangs', 'Chicken with Broccoli (No Rice)',
'Chicken with Broccoli (Traditional), no rice. 480 cal, 60g protein. Best protein-to-calorie ratio on the menu.',
'entree', 1, 'pfc_pad_thai_combo',
'Swap Chicken Pad Thai (1,480 cal, 64g protein) for Chicken with Broccoli no rice (480 cal, 60g protein). Save 1,000 calories with nearly the same protein. The pad thai has 194g carbs from rice noodles. The chicken with broccoli is actual food.',
16, 'eamon',
'Can I get the Chicken with Broccoli, no rice please. Sauce on the side.');

-- Swap 7: Pepper Steak (no rice) → swaps for Chang's Spicy Chicken + Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_pepper_steak', 'pfchangs', 'Pepper Steak (No Rice)',
'Pepper Steak (Traditional), no rice. 600 cal, 48g protein.',
'entree', 1, 'pfc_spicy_chicken_combo',
'Swap Chang''s Spicy Chicken + White Rice (1,350 cal, 55g protein) for Pepper Steak no rice (600 cal, 48g protein). Save 750 calories. The spicy chicken is battered and fried. The pepper steak is stir-fried beef with peppers — real food, not candy.',
17, 'eamon',
'Can I get the Pepper Steak, no rice please. Sauce on the side.');

-- Swap 8: Wonton Soup Bowl → swaps for Kung Pao Chicken + Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_wonton_soup', 'pfchangs', 'Wonton Soup (Bowl)',
'Wonton Soup Bowl. 480 cal, 40g protein. Broth-based, surprisingly high protein from the wontons.',
'soup', 1, 'pfc_kung_pao_combo',
'Swap Kung Pao Chicken + White Rice (1,330 cal, 59g protein) for Wonton Soup Bowl (480 cal, 40g protein). Save 850 calories. The kung pao has 68g fat mostly from peanuts and oil. The soup is warm, filling, and mostly protein from the wontons.',
18, 'eamon',
'Can I get a bowl of the Wonton Soup please.');

-- Swap 9: Buddha's Feast + Steamed Chicken → swaps for Chicken Fried Rice
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_buddhas_chicken', 'pfchangs', 'Buddha''s Feast + Add Steamed Chicken',
'Buddha''s Feast + Add Steamed Chicken. 480 + 100 = 580 cal, 34g protein. All vegetables plus lean protein.',
'entree', 1, 'pfc_fried_rice_combo',
'Swap Chicken Fried Rice (1,020 cal, 54g protein) for Buddha''s Feast + Add Steamed Chicken (580 cal, 34g protein). Save 440 calories. The fried rice has 152g carbs cooked in oil. This swap gives you a plate full of vegetables with clean steamed chicken.',
19, 'eamon',
'Can I get the Buddha''s Feast and add a side of steamed chicken to it? No rice.');

-- Swap 10: Egg Drop Soup + Half Lettuce Wraps → swaps for Lettuce Wraps (meal)
INSERT OR REPLACE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_soup_wraps', 'pfchangs', 'Egg Drop Soup Bowl + Half Lettuce Wraps',
'Egg Drop Soup (Bowl) + Chang''s Chicken Lettuce Wraps (Half Order). 280 + 440 = 720 cal, 27g protein. A filling two-course meal.',
'combo', 1, 'pfc_lettuce_wraps_meal',
'Pair Egg Drop Soup Bowl + Half Lettuce Wraps (720 cal, 27g protein) instead of full Lettuce Wraps alone (660 cal, 38g protein). Similar calories but you get a warm soup course that fills you up first. More food, more satisfying.',
20, 'eamon',
'Can I get a bowl of the Egg Drop Soup and a half order of the Chang''s Chicken Lettuce Wraps please.');


-- ============================================================
-- 6. TEMPLATE MEAL INGREDIENTS (link meals to components)
-- ============================================================

-- ── ENEMY MEALS ─────────────────────────────────────────────

-- Crispy Honey Chicken + White Rice (1380 + 290 = 1670)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_crispy_honey_combo', 'pfc_crispy_honey_chicken_trad', 1.0, 0),
('pfc_crispy_honey_combo', 'pfc_white_rice', 1.0, 1);

-- Orange Chicken + Fried Rice (1260 + 500 = 1760)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_orange_chicken_combo', 'pfc_orange_chicken_trad', 1.0, 0),
('pfc_orange_chicken_combo', 'pfc_fried_rice_side', 1.0, 1);

-- Chang's Spicy Chicken + White Rice (1060 + 290 = 1350)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_spicy_chicken_combo', 'pfc_changs_spicy_chicken_trad', 1.0, 0),
('pfc_spicy_chicken_combo', 'pfc_white_rice', 1.0, 1);

-- Kung Pao Chicken + White Rice (1040 + 290 = 1330)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_kung_pao_combo', 'pfc_kung_pao_chicken_trad', 1.0, 0),
('pfc_kung_pao_combo', 'pfc_white_rice', 1.0, 1);

-- Sesame Chicken + White Rice (980 + 290 = 1270)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_sesame_chicken_combo', 'pfc_sesame_chicken_trad', 1.0, 0),
('pfc_sesame_chicken_combo', 'pfc_white_rice', 1.0, 1);

-- Mongolian Beef + White Rice (680 + 290 = 970)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_mongolian_beef_combo', 'pfc_mongolian_beef_trad', 1.0, 0),
('pfc_mongolian_beef_combo', 'pfc_white_rice', 1.0, 1);

-- Chicken Lo Mein (860 — single ingredient, includes noodles)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_lo_mein_combo', 'pfc_lo_mein_chicken', 1.0, 0);

-- Chicken Pad Thai (1480 — single ingredient, includes noodles)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_pad_thai_combo', 'pfc_pad_thai_chicken', 1.0, 0);

-- Chicken Fried Rice (1020 — single ingredient, includes rice)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_fried_rice_combo', 'pfc_fried_rice_chicken', 1.0, 0);

-- Chang's Lettuce Wraps Full (660 — single ingredient)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_lettuce_wraps_meal', 'pfc_lettuce_wraps_full', 1.0, 0);


-- ── HERO SWAP MEALS ─────────────────────────────────────────

-- Chicken with Broccoli + Brown Rice (480 + 250 = 730)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_chicken_broc_rice', 'pfc_chicken_broccoli_trad', 1.0, 0),
('pfc_swap_chicken_broc_rice', 'pfc_brown_rice', 1.0, 1);

-- Firecracker Shrimp no rice (580)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_firecracker_shrimp', 'pfc_firecracker_shrimp_trad', 1.0, 0);

-- Miso Glazed Salmon no rice (680)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_miso_salmon', 'pfc_miso_salmon_trad', 1.0, 0);

-- Mongolian Beef Dinner Special no rice (400)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_mongolian_dinner', 'pfc_mongolian_beef_dinner', 1.0, 0);

-- Beef with Broccoli no rice (600)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_beef_broccoli', 'pfc_beef_broccoli_trad', 1.0, 0);

-- Chicken with Broccoli no rice (480)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_chicken_broccoli', 'pfc_chicken_broccoli_trad', 1.0, 0);

-- Pepper Steak no rice (600)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_pepper_steak', 'pfc_pepper_steak_trad', 1.0, 0);

-- Wonton Soup Bowl (480)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_wonton_soup', 'pfc_wonton_soup_bowl', 1.0, 0);

-- Buddha's Feast + Add Steamed Chicken (480 + 100 = 580)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_buddhas_chicken', 'pfc_buddhas_feast', 1.0, 0),
('pfc_swap_buddhas_chicken', 'pfc_add_chicken_steamed', 1.0, 0);

-- Egg Drop Soup Bowl + Half Lettuce Wraps (280 + 440 = 720)
INSERT OR REPLACE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_soup_wraps', 'pfc_egg_drop_soup_bowl', 1.0, 0),
('pfc_swap_soup_wraps', 'pfc_lettuce_wraps_half', 1.0, 0);
