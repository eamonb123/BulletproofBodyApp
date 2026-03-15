-- P.F. Chang's - Full Restaurant Seed
-- Nutrition data sourced from FatSecret / P.F. Chang's published nutrition info
-- Oil buffer (+100-150 cal) applied to non-swap "enemy" meals per Restaurant Bible rules

-- ============================================================
-- 1. RESTAURANT
-- ============================================================
INSERT OR IGNORE INTO restaurants (id, name, logo_emoji, cuisine, website, nutrition_source, restaurant_type)
VALUES ('pfchangs', 'P.F. Chang''s', '🥡', 'chinese', 'https://www.pfchangs.com', 'https://foods.fatsecret.com/calories-nutrition/pf-changs', 'chain');

-- ============================================================
-- 2. MENU CATEGORIES
-- ============================================================
INSERT OR IGNORE INTO menu_categories (id, restaurant_id, name, display_order, selection_type, description) VALUES
('pfchangs_appetizers', 'pfchangs', 'Appetizers', 1, 'single', 'Starters and shareables'),
('pfchangs_entrees', 'pfchangs', 'Entrees', 2, 'single', 'Main dishes - chicken, beef, seafood'),
('pfchangs_noodles_rice', 'pfchangs', 'Noodles & Rice', 3, 'single', 'Lo mein, fried rice, pad thai'),
('pfchangs_sides', 'pfchangs', 'Sides', 4, 'single', 'Rice, vegetables, soups'),
('pfchangs_soups', 'pfchangs', 'Soups', 5, 'single', 'Soup options');

-- ============================================================
-- 3. INGREDIENTS (individual components)
-- ============================================================

-- === PROTEINS ===
INSERT OR IGNORE INTO ingredients (id, restaurant_id, category_id, name, portion_size, calories, total_fat_g, carbohydrate_g, protein_g, sodium_mg, sugar_g, dietary_fiber_g, source) VALUES
('pfc_chicken_wok_fried', 'pfchangs', 'pfchangs_entrees', 'Wok-Fried Chicken', '4 oz', 60, 3.0, 1.0, 8.0, 0, 0, 0, 'fatsecret'),
('pfc_chicken_steamed', 'pfchangs', 'pfchangs_entrees', 'Steamed Chicken', '4 oz', 50, 1.5, 0.0, 9.0, 0, 0, 0, 'fatsecret'),
('pfc_shrimp_wok_fried', 'pfchangs', 'pfchangs_entrees', 'Wok-Fried Shrimp', '3 oz', 40, 1.5, 0.0, 6.0, 0, 0, 0, 'fatsecret'),
('pfc_shrimp_steamed', 'pfchangs', 'pfchangs_entrees', 'Steamed Shrimp', '3 oz', 20, 0.0, 0.0, 4.0, 0, 0, 0, 'fatsecret'),
('pfc_salmon', 'pfchangs', 'pfchangs_entrees', 'Salmon Fillet', '6 oz', 160, 13.0, 0.0, 11.0, 0, 0, 0, 'fatsecret'),
('pfc_beef_wok_fried', 'pfchangs', 'pfchangs_entrees', 'Wok-Fried Beef', '4 oz', 60, 3.5, 1.0, 6.0, 0, 0, 0, 'fatsecret'),

-- === ENTREE PREPARATIONS (full dishes as served) ===
('pfc_changs_spicy_chicken', 'pfchangs', 'pfchangs_entrees', 'Chang''s Spicy Chicken', '1 serving', 530, 26.0, 33.0, 25.0, 0, 0, 0, 'fatsecret'),
('pfc_mongolian_beef', 'pfchangs', 'pfchangs_entrees', 'Mongolian Beef', '1 serving', 340, 17.0, 20.0, 27.0, 0, 0, 0, 'fatsecret'),
('pfc_orange_chicken', 'pfchangs', 'pfchangs_entrees', 'Orange Chicken', '1 serving', 630, 37.0, 54.0, 22.0, 0, 0, 0, 'fatsecret'),
('pfc_kung_pao_chicken', 'pfchangs', 'pfchangs_entrees', 'Kung Pao Chicken', '1 serving', 520, 34.0, 15.0, 27.0, 0, 0, 0, 'fatsecret'),
('pfc_lo_mein_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Chicken Lo Mein', '1 serving', 430, 11.0, 60.0, 22.0, 0, 0, 0, 'fatsecret'),
('pfc_fried_rice_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Fried Rice with Chicken', '1 serving', 510, 10.0, 76.0, 27.0, 0, 0, 0, 'fatsecret'),
('pfc_lettuce_wraps', 'pfchangs', 'pfchangs_appetizers', 'Chang''s Chicken Lettuce Wraps', '1 serving', 330, 13.0, 33.0, 19.0, 0, 0, 0, 'fatsecret'),
('pfc_crispy_honey_chicken', 'pfchangs', 'pfchangs_entrees', 'Crispy Honey Chicken', '1 serving', 320, 11.0, 36.0, 19.0, 0, 0, 0, 'fatsecret'),
('pfc_beef_broccoli', 'pfchangs', 'pfchangs_entrees', 'Beef with Broccoli', '1 serving', 300, 13.0, 23.0, 23.0, 0, 0, 0, 'fatsecret'),
('pfc_sesame_chicken', 'pfchangs', 'pfchangs_entrees', 'Sesame Chicken', '1 serving', 490, 24.0, 30.0, 24.0, 0, 0, 0, 'fatsecret'),
('pfc_chicken_broccoli', 'pfchangs', 'pfchangs_entrees', 'Chicken with Broccoli', '1 serving', 240, 7.0, 15.0, 30.0, 0, 0, 0, 'fatsecret'),
('pfc_kung_pao_shrimp', 'pfchangs', 'pfchangs_entrees', 'Kung Pao Shrimp', '1 serving', 510, 35.0, 27.0, 24.0, 0, 0, 0, 'fatsecret'),
('pfc_miso_salmon', 'pfchangs', 'pfchangs_entrees', 'Miso Glazed Salmon', '1 serving', 340, 19.0, 16.0, 26.0, 0, 0, 0, 'fatsecret'),
('pfc_dynamite_shrimp', 'pfchangs', 'pfchangs_appetizers', 'Dynamite Shrimp', '1 serving', 290, 21.0, 20.0, 7.0, 0, 0, 0, 'fatsecret'),
('pfc_drunken_noodles', 'pfchangs', 'pfchangs_noodles_rice', 'Drunken Noodles', '1 serving', 290, 8.0, 39.0, 17.0, 0, 0, 0, 'fatsecret'),
('pfc_crispy_honey_shrimp', 'pfchangs', 'pfchangs_entrees', 'Crispy Honey Shrimp', '1 serving', 510, 28.0, 40.0, 23.0, 0, 0, 0, 'fatsecret'),
('pfc_ma_po_tofu', 'pfchangs', 'pfchangs_entrees', 'Ma Po Tofu', '1 serving', 510, 40.0, 25.0, 16.0, 0, 0, 0, 'fatsecret'),
('pfc_pad_thai_chicken', 'pfchangs', 'pfchangs_noodles_rice', 'Chicken Pad Thai', '1 serving', 740, 25.0, 97.0, 32.0, 0, 0, 0, 'fatsecret'),
('pfc_kung_pao_chicken_steamed', 'pfchangs', 'pfchangs_entrees', 'Steamed Kung Pao Chicken', '1 serving', 300, 14.0, 13.0, 32.0, 0, 0, 0, 'fatsecret'),
('pfc_korean_pork', 'pfchangs', 'pfchangs_entrees', 'Korean Inspired Pork', '1 serving', 490, 18.0, 61.0, 22.0, 0, 0, 0, 'fatsecret'),

-- === SIDES ===
('pfc_white_rice', 'pfchangs', 'pfchangs_sides', 'White Rice', '8 oz', 380, 0.0, 86.0, 7.0, 0, 0, 0, 'fatsecret'),
('pfc_brown_rice', 'pfchangs', 'pfchangs_sides', 'Brown Rice', '8 oz', 250, 2.0, 53.0, 5.0, 0, 0, 0, 'fatsecret'),
('pfc_brown_rice_small', 'pfchangs', 'pfchangs_sides', 'Brown Rice (Small)', '6 oz', 190, 0.0, 40.0, 4.0, 0, 0, 0, 'fatsecret'),
('pfc_fried_rice_plain', 'pfchangs', 'pfchangs_noodles_rice', 'Fried Rice (Plain)', '1 serving', 500, 15.0, 76.0, 13.0, 0, 0, 0, 'fatsecret'),
('pfc_lo_mein_noodles', 'pfchangs', 'pfchangs_noodles_rice', 'Lo Mein Noodles (Plain)', '1 serving', 560, 12.0, 97.0, 15.0, 0, 0, 0, 'fatsecret'),

-- === VEGETABLES ===
('pfc_buddhas_feast_steamed', 'pfchangs', 'pfchangs_entrees', 'Buddha''s Feast (Steamed)', '1 serving', 120, 2.5, 16.0, 11.0, 0, 0, 0, 'fatsecret'),
('pfc_buddhas_feast_stirfried', 'pfchangs', 'pfchangs_entrees', 'Buddha''s Feast (Stir-Fried)', '1 serving', 240, 15.0, 19.0, 8.0, 0, 0, 0, 'fatsecret'),
('pfc_baby_buddhas_steamed', 'pfchangs', 'pfchangs_sides', 'Baby Buddha''s Feast (Steamed)', '1 side', 90, 0.5, 18.0, 5.0, 0, 0, 0, 'fatsecret'),
('pfc_baby_buddhas_stirfried', 'pfchangs', 'pfchangs_sides', 'Baby Buddha''s Feast (Stir-Fried)', '1 side', 150, 5.0, 21.0, 5.0, 0, 0, 0, 'fatsecret'),

-- === APPETIZERS ===
('pfc_pork_egg_roll', 'pfchangs', 'pfchangs_appetizers', 'Pork Egg Roll', '1 roll', 370, 20.0, 37.0, 9.0, 0, 0, 0, 'fatsecret'),
('pfc_pork_dumplings_steamed', 'pfchangs', 'pfchangs_appetizers', 'Steamed Pork Dumplings', '3 pieces', 80, 3.5, 8.0, 3.0, 0, 0, 0, 'fatsecret'),
('pfc_shrimp_dumplings_steamed', 'pfchangs', 'pfchangs_appetizers', 'Steamed Shrimp Dumplings', '3 pieces', 60, 1.0, 7.0, 4.0, 0, 0, 0, 'fatsecret'),
('pfc_chicken_dumplings', 'pfchangs', 'pfchangs_appetizers', 'Chicken Dumplings', '3 pieces', 130, 2.5, 20.0, 8.0, 0, 0, 0, 'fatsecret'),
('pfc_veg_spring_roll', 'pfchangs', 'pfchangs_appetizers', 'Vegetable Spring Roll', '1 roll', 310, 13.0, 44.0, 3.0, 0, 0, 0, 'fatsecret'),

-- === SOUPS ===
('pfc_egg_drop_soup_cup', 'pfchangs', 'pfchangs_soups', 'Egg Drop Soup (Cup)', '1 cup', 40, 1.0, 6.0, 1.0, 0, 0, 0, 'fatsecret'),
('pfc_egg_drop_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Egg Drop Soup (Bowl)', '1 bowl', 70, 1.5, 11.0, 2.0, 0, 0, 0, 'fatsecret'),
('pfc_hot_sour_soup_cup', 'pfchangs', 'pfchangs_soups', 'Hot & Sour Soup (Cup)', '1 cup', 70, 2.0, 9.0, 4.0, 0, 0, 0, 'fatsecret'),
('pfc_hot_sour_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Hot & Sour Soup (Bowl)', '1 bowl', 120, 3.0, 15.0, 7.0, 0, 0, 0, 'fatsecret'),
('pfc_wonton_soup_cup', 'pfchangs', 'pfchangs_soups', 'Wonton Soup (Cup)', '1 cup', 130, 3.5, 14.0, 9.0, 0, 0, 0, 'fatsecret'),
('pfc_wonton_soup_bowl', 'pfchangs', 'pfchangs_soups', 'Wonton Soup (Bowl)', '1 bowl', 120, 3.5, 13.0, 10.0, 0, 0, 0, 'fatsecret'),

-- === SAUCES / COOKING OIL (hidden calorie sources) ===
('pfc_wok_oil', 'pfchangs', 'pfchangs_sides', 'Restaurant Wok Oil (estimated)', '1 serving', 150, 17.0, 0.0, 0.0, 0, 0, 0, 'estimated'),
('pfc_sweet_sauce', 'pfchangs', 'pfchangs_sides', 'Sweet Glaze/Sauce', '2 tbsp', 80, 0.0, 20.0, 0.0, 0, 0, 0, 'estimated'),
('pfc_spicy_sauce', 'pfchangs', 'pfchangs_sides', 'Spicy Chili Sauce', '2 tbsp', 40, 2.0, 5.0, 0.0, 0, 0, 0, 'estimated'),
('pfc_crispy_coating', 'pfchangs', 'pfchangs_sides', 'Crispy Batter Coating', '1 serving', 120, 5.0, 16.0, 2.0, 0, 0, 0, 'estimated');

-- ============================================================
-- 4. TEMPLATE MEALS — "ENEMY" MEALS (what people typically order)
-- ============================================================

-- Enemy 1: Chang's Spicy Chicken + White Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_spicy_chicken_combo', 'pfchangs', 'Chang''s Spicy Chicken + Rice', 'Chang''s Spicy Chicken with white rice — breaded chicken in chili sauce with a full side of rice. 530 cal entree + 380 cal rice + 100 cal oil buffer.', 'entree', 0, NULL, 1, 'llm');

-- Enemy 2: Mongolian Beef + White Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_mongolian_beef_combo', 'pfchangs', 'Mongolian Beef + Rice', 'Mongolian Beef with white rice — stir-fried beef in sweet soy sauce with scallions, plus rice. 340 cal entree + 380 cal rice + 100 cal oil buffer.', 'entree', 0, NULL, 2, 'llm');

-- Enemy 3: Orange Chicken + Fried Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_orange_chicken_combo', 'pfchangs', 'Orange Chicken + Fried Rice', 'Orange Chicken with fried rice — crispy battered chicken in orange glaze with fried rice. 630 cal entree + 500 cal fried rice + 100 cal oil buffer.', 'entree', 0, NULL, 3, 'llm');

-- Enemy 4: Kung Pao Chicken + White Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_kung_pao_combo', 'pfchangs', 'Kung Pao Chicken + Rice', 'Kung Pao Chicken with white rice — wok-tossed chicken with peanuts, chilies, and veggies. 520 cal entree + 380 cal rice + 100 cal oil buffer.', 'entree', 0, NULL, 4, 'llm');

-- Enemy 5: Chicken Lo Mein
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_lo_mein_combo', 'pfchangs', 'Chicken Lo Mein', 'Chicken Lo Mein — egg noodles stir-fried with chicken and vegetables in savory sauce. Already includes carbs in the noodles. 430 cal + 100 cal oil buffer.', 'entree', 0, NULL, 5, 'llm');

-- Enemy 6: Fried Rice with Chicken
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_fried_rice_combo', 'pfchangs', 'Fried Rice with Chicken', 'Fried Rice with Chicken — wok-tossed rice with chicken, egg, and vegetables. 510 cal + 100 cal oil buffer.', 'entree', 0, NULL, 6, 'llm');

-- Enemy 7: Chang's Lettuce Wraps (eaten as meal)
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_lettuce_wraps_meal', 'pfchangs', 'Chang''s Lettuce Wraps (Full Order)', 'Chang''s Chicken Lettuce Wraps — minced chicken in savory sauce with water chestnuts, served in lettuce cups. 330 cal + 100 cal oil buffer. Not terrible, but the sauce and water chestnuts add hidden carbs.', 'appetizer', 0, NULL, 7, 'llm');

-- Enemy 8: Crispy Honey Chicken + White Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_crispy_honey_combo', 'pfchangs', 'Crispy Honey Chicken + Rice', 'Crispy Honey Chicken with white rice — battered fried chicken in honey sauce with rice. 320 cal entree + 380 cal rice + 100 cal oil buffer.', 'entree', 0, NULL, 8, 'llm');

-- Enemy 9: Beef with Broccoli + White Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_beef_broccoli_combo', 'pfchangs', 'Beef with Broccoli + Rice', 'Beef with Broccoli and white rice — stir-fried beef and broccoli in ginger soy sauce with rice. 300 cal entree + 380 cal rice + 100 cal oil buffer.', 'entree', 0, NULL, 9, 'llm');

-- Enemy 10: Chicken Pad Thai
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, display_order, source)
VALUES ('pfc_pad_thai_combo', 'pfchangs', 'Chicken Pad Thai', 'Chicken Pad Thai — rice noodles with chicken, egg, bean sprouts in tamarind sauce. 740 cal + 100 cal oil buffer.', 'entree', 0, NULL, 10, 'llm');

-- ============================================================
-- 5. TEMPLATE MEALS — "HERO" SWAP MEALS
-- ============================================================

-- Swap 1: Chicken with Broccoli (no rice) — swaps for Chang's Spicy Chicken + Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_chicken_broccoli', 'pfchangs', 'Chicken with Broccoli (No Rice)', 'Chicken with Broccoli, no rice, sauce on the side — clean protein with vegetables', 'entree', 1, 'pfc_spicy_chicken_combo',
'Swap Chang''s Spicy Chicken + rice (1,010 cal, 25g protein) for Chicken with Broccoli no rice (240 cal, 30g protein). Saves 770 calories with MORE protein. The spicy chicken is breaded and sauced; the broccoli chicken is stir-fried with minimal coating.',
11, 'llm',
'Can I get the Chicken with Broccoli, no rice, sauce on the side please. Extra broccoli if possible.');

-- Swap 2: Steamed Kung Pao Chicken (no rice) — swaps for Kung Pao Chicken + Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_steamed_kung_pao', 'pfchangs', 'Steamed Kung Pao Chicken (No Rice)', 'Steamed Kung Pao Chicken, no rice — same peanuts and peppers, steamed instead of wok-fried', 'entree', 1, 'pfc_kung_pao_combo',
'Swap Kung Pao Chicken + rice (1,000 cal, 27g protein) for Steamed Kung Pao no rice (300 cal, 32g protein). Saves 700 calories and GAINS 5g protein. Steaming removes the wok oil entirely.',
12, 'llm',
'Can I get the Kung Pao Chicken steamed instead of stir-fried, no rice please.');

-- Swap 3: Buddha's Feast Steamed + Steamed Chicken — swaps for Orange Chicken + Fried Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_buddhas_chicken', 'pfchangs', 'Buddha''s Feast Steamed + Add Chicken', 'Buddha''s Feast steamed with added steamed chicken — all vegetables plus clean protein, no oil, no rice', 'entree', 1, 'pfc_orange_chicken_combo',
'Swap Orange Chicken + fried rice (1,230 cal, 22g protein) for Buddha''s Feast steamed + steamed chicken (170 cal, 20g protein). Saves 1,060 calories. Orange chicken is deep-fried and sugar-glazed on top of fried rice. The swap removes ALL the hidden fat.',
13, 'llm',
'Can I get the Buddha''s Feast steamed, and add a side of steamed chicken to it? No rice.');

-- Swap 4: Miso Glazed Salmon + Side Veggies — swaps for Mongolian Beef + Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_miso_salmon', 'pfchangs', 'Miso Glazed Salmon (No Rice, Side Veggies)', 'Miso Glazed Salmon with steamed vegetables instead of rice — omega-3 rich protein with clean sides', 'entree', 1, 'pfc_mongolian_beef_combo',
'Swap Mongolian Beef + rice (820 cal, 27g protein) for Miso Salmon + Baby Buddha''s steamed (430 cal, 31g protein). Saves 390 calories with more protein. The salmon has healthy fats (omega-3) vs the sweet soy glaze on Mongolian beef.',
14, 'llm',
'Can I get the Miso Glazed Salmon with steamed vegetables on the side instead of rice?');

-- Swap 5: Drunken Noodles — swaps for Chicken Lo Mein
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_drunken_noodles', 'pfchangs', 'Drunken Noodles (Lighter Noodle Option)', 'Drunken Noodles — flat rice noodles with chicken and Thai basil, lighter than lo mein', 'entree', 1, 'pfc_lo_mein_combo',
'Swap Chicken Lo Mein (530 cal, 22g protein) for Drunken Noodles (290 cal, 17g protein). Saves 240 calories. If you want noodles, this is the lightest option. Still has carbs but far less oil and noodle volume than lo mein.',
15, 'llm',
'Can I get the Drunken Noodles please, sauce on the side if possible.');

-- Swap 6: Beef with Broccoli (no rice, extra broccoli) — swaps for Beef with Broccoli + Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_beef_broccoli_lean', 'pfchangs', 'Beef with Broccoli (No Rice, Extra Veggies)', 'Beef with Broccoli, skip the rice, double the broccoli — same dish, remove the calorie bomb', 'entree', 1, 'pfc_beef_broccoli_combo',
'Swap Beef with Broccoli + rice (780 cal, 23g protein) for just Beef with Broccoli no rice (300 cal, 23g protein). Saves 480 calories. Same protein. The rice was adding 380 empty calories with only 7g protein.',
16, 'llm',
'Can I get the Beef with Broccoli, no rice, extra broccoli on the side please. Sauce on the side.');

-- Swap 7: Egg Drop Soup + Lettuce Wraps Combo — swaps for Chicken Pad Thai
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_soup_wraps', 'pfchangs', 'Egg Drop Soup Bowl + Lettuce Wraps', 'Egg Drop Soup (bowl) + Chang''s Chicken Lettuce Wraps — warm soup + protein wraps, satisfying combo without noodles', 'combo', 1, 'pfc_pad_thai_combo',
'Swap Chicken Pad Thai (840 cal, 32g protein) for Egg Drop Soup bowl + Lettuce Wraps (400 cal, 21g protein). Saves 440 calories. You still get a filling two-course meal. The pad thai alone has 97g carbs from noodles.',
17, 'llm',
'Can I get a bowl of the Egg Drop Soup and an order of the Chang''s Chicken Lettuce Wraps please.');

-- Swap 8: Wonton Soup + Steamed Shrimp Dumplings — swaps for Fried Rice with Chicken
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_soup_dumplings', 'pfchangs', 'Wonton Soup + Steamed Shrimp Dumplings', 'Wonton Soup bowl + steamed shrimp dumplings (6) — broth-based protein meal, no fried anything', 'combo', 1, 'pfc_fried_rice_combo',
'Swap Fried Rice with Chicken (610 cal, 27g protein) for Wonton Soup + Steamed Shrimp Dumplings x6 (240 cal, 18g protein). Saves 370 calories. Fried rice is 76g carbs cooked in oil. The soup combo is warm, filling, and mostly protein.',
18, 'llm',
'Can I get a bowl of the Wonton Soup and a double order of the steamed shrimp dumplings please.');

-- Swap 9: Chicken with Broccoli + Brown Rice (small) — swaps for Crispy Honey Chicken + Rice
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_chicken_broc_rice', 'pfchangs', 'Chicken with Broccoli + Brown Rice (Small)', 'Chicken with Broccoli with a small brown rice — keeps the rice but uses the lean entree and smaller portion', 'entree', 1, 'pfc_crispy_honey_combo',
'Swap Crispy Honey Chicken + white rice (800 cal, 19g protein) for Chicken with Broccoli + small brown rice (430 cal, 34g protein). Saves 370 calories and nearly doubles the protein. Crispy = battered and fried, broccoli version = clean stir-fry.',
19, 'llm',
'Can I get the Chicken with Broccoli with a small side of brown rice? Sauce on the side please.');

-- Swap 10: Hot & Sour Soup + Chicken Lettuce Wraps — swaps for Lettuce Wraps as meal
INSERT OR IGNORE INTO template_meals (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, display_order, source, order_script)
VALUES ('pfc_swap_hotsour_wraps', 'pfchangs', 'Hot & Sour Soup + Lettuce Wraps (Light)', 'Hot & Sour Soup bowl + half order lettuce wraps — soup stretches the meal, wraps give protein', 'combo', 1, 'pfc_lettuce_wraps_meal',
'Upgrade the Lettuce Wraps meal (430 cal, 19g protein) by adding Hot & Sour Soup bowl and getting half wraps (340 cal, 17g protein). Saves 90 calories and feels like more food. The soup fills you up first so you eat less of the wraps.',
20, 'llm',
'Can I get a bowl of the Hot & Sour Soup and a half order of the Chang''s Chicken Lettuce Wraps?');

-- ============================================================
-- 6. TEMPLATE MEAL INGREDIENTS (link meals to their components)
-- ============================================================

-- Enemy meal ingredient links
-- Chang's Spicy Chicken + Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_spicy_chicken_combo', 'pfc_changs_spicy_chicken', 1.0, 0),
('pfc_spicy_chicken_combo', 'pfc_white_rice', 1.0, 1),
('pfc_spicy_chicken_combo', 'pfc_wok_oil', 1.0, 1);

-- Mongolian Beef + Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_mongolian_beef_combo', 'pfc_mongolian_beef', 1.0, 0),
('pfc_mongolian_beef_combo', 'pfc_white_rice', 1.0, 1),
('pfc_mongolian_beef_combo', 'pfc_wok_oil', 1.0, 1);

-- Orange Chicken + Fried Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_orange_chicken_combo', 'pfc_orange_chicken', 1.0, 0),
('pfc_orange_chicken_combo', 'pfc_fried_rice_plain', 1.0, 1),
('pfc_orange_chicken_combo', 'pfc_wok_oil', 1.0, 1);

-- Kung Pao Chicken + Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_kung_pao_combo', 'pfc_kung_pao_chicken', 1.0, 0),
('pfc_kung_pao_combo', 'pfc_white_rice', 1.0, 1),
('pfc_kung_pao_combo', 'pfc_wok_oil', 1.0, 1);

-- Chicken Lo Mein
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_lo_mein_combo', 'pfc_lo_mein_chicken', 1.0, 0),
('pfc_lo_mein_combo', 'pfc_wok_oil', 1.0, 1);

-- Fried Rice with Chicken
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_fried_rice_combo', 'pfc_fried_rice_chicken', 1.0, 0),
('pfc_fried_rice_combo', 'pfc_wok_oil', 1.0, 1);

-- Lettuce Wraps (full order as meal)
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_lettuce_wraps_meal', 'pfc_lettuce_wraps', 1.0, 0),
('pfc_lettuce_wraps_meal', 'pfc_wok_oil', 1.0, 1);

-- Crispy Honey Chicken + Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_crispy_honey_combo', 'pfc_crispy_honey_chicken', 1.0, 0),
('pfc_crispy_honey_combo', 'pfc_white_rice', 1.0, 1),
('pfc_crispy_honey_combo', 'pfc_wok_oil', 1.0, 1),
('pfc_crispy_honey_combo', 'pfc_crispy_coating', 1.0, 1);

-- Beef with Broccoli + Rice
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_beef_broccoli_combo', 'pfc_beef_broccoli', 1.0, 0),
('pfc_beef_broccoli_combo', 'pfc_white_rice', 1.0, 1),
('pfc_beef_broccoli_combo', 'pfc_wok_oil', 1.0, 1);

-- Chicken Pad Thai
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_pad_thai_combo', 'pfc_pad_thai_chicken', 1.0, 0),
('pfc_pad_thai_combo', 'pfc_wok_oil', 1.0, 1);

-- Swap meal ingredient links
-- Chicken with Broccoli (no rice)
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_chicken_broccoli', 'pfc_chicken_broccoli', 1.0, 0);

-- Steamed Kung Pao Chicken (no rice)
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_steamed_kung_pao', 'pfc_kung_pao_chicken_steamed', 1.0, 0);

-- Buddha's Feast + Steamed Chicken
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_buddhas_chicken', 'pfc_buddhas_feast_steamed', 1.0, 0),
('pfc_swap_buddhas_chicken', 'pfc_chicken_steamed', 1.0, 0);

-- Miso Salmon + Side Veggies
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_miso_salmon', 'pfc_miso_salmon', 1.0, 0),
('pfc_swap_miso_salmon', 'pfc_baby_buddhas_steamed', 1.0, 0);

-- Drunken Noodles
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_drunken_noodles', 'pfc_drunken_noodles', 1.0, 0);

-- Beef with Broccoli (no rice, lean)
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_beef_broccoli_lean', 'pfc_beef_broccoli', 1.0, 0);

-- Egg Drop Soup + Lettuce Wraps
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_soup_wraps', 'pfc_egg_drop_soup_bowl', 1.0, 0),
('pfc_swap_soup_wraps', 'pfc_lettuce_wraps', 1.0, 0);

-- Wonton Soup + Steamed Shrimp Dumplings
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_soup_dumplings', 'pfc_wonton_soup_bowl', 1.0, 0),
('pfc_swap_soup_dumplings', 'pfc_shrimp_dumplings_steamed', 2.0, 0);

-- Chicken with Broccoli + Brown Rice (small)
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_chicken_broc_rice', 'pfc_chicken_broccoli', 1.0, 0),
('pfc_swap_chicken_broc_rice', 'pfc_brown_rice_small', 1.0, 1);

-- Hot & Sour Soup + Lettuce Wraps
INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity, is_removable) VALUES
('pfc_swap_hotsour_wraps', 'pfc_hot_sour_soup_bowl', 1.0, 0),
('pfc_swap_hotsour_wraps', 'pfc_lettuce_wraps', 0.5, 0);
