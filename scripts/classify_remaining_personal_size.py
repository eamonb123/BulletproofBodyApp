#!/usr/bin/env python3
"""
Classify all 340 snack_items where has_personal_size IS NULL.
Sets has_personal_size, personal_size_serving, personal_size_calories,
personal_size_protein_g, and package_note for each item.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'bulletproof_body.db')

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def classify_all():
    conn = get_conn()
    c = conn.cursor()

    # First, get all NULL items so we can copy calories/protein where needed
    c.execute("SELECT id, brand, name, calories, protein_g, swap_craving_category FROM snack_items WHERE has_personal_size IS NULL")
    items = {row['id']: dict(row) for row in c.fetchall()}
    print(f"Found {len(items)} items with has_personal_size IS NULL")

    # Build classification lists
    # Format: (id, has_personal_size, personal_size_serving, personal_size_calories, personal_size_protein_g, package_note)
    # For "copy existing cal" we use None and fill from DB

    classifications = []

    # ========== TRUE ITEMS ==========

    # --- Beverages: ALL TRUE ---
    beer_ids = [
        'amstel-amstel-light', 'anheuser-busch-bud-light',
        'blue-moon-blue-moon-belgian-white', 'budweiser-budweiser-lager',
        'budweiser-budweiser-zero-non-alcoholic',
        'coors-coors-banquet-original', 'coors-coors-light',
        'corona-corona-extra', 'corona-corona-premier', 'corona-corona-sunbrew-non-alcoholic',
        'guinness-guinness-draught',
        'heineken-heineken-00-non-alcoholic', 'heineken-heineken-original-lager', 'heineken-heineken-silver',
        'lagunitas-lagunitas-ipa', 'lagunitas-lagunitas-ipna-non-alcoholic-ipa',
        'michelob-michelob-ultra', 'michelob-michelob-ultra-infusions-lime-prickly-pear-cactus',
        'miller-miller-lite',
        'new-belgium-voodoo-ranger-ipa',
        'samuel-adams-sam-adams-light',
        'sierra-nevada-sierra-nevada-pale-ale',
        'stella-artois-stella-artois-lager',
        'yuengling-yuengling-light-lager',
    ]
    for bid in beer_ids:
        if bid in items:
            classifications.append((bid, True, '1 can/bottle (12 oz)', items[bid]['calories'], items[bid]['protein_g'], ''))

    seltzer_ids = [
        'bud-light-bud-light-seltzer',
        'high-noon-high-noon-sun-sips-vodka-soda',
        'topo-chico-topo-chico-hard-seltzer',
        'truly-truly-hard-seltzer-original',
        'vizzy-vizzy-hard-seltzer-with-vitamin-c',
        'white-claw-white-claw-hard-seltzer-original',
    ]
    for sid in seltzer_ids:
        if sid in items:
            classifications.append((sid, True, '1 can (12 oz)', items[sid]['calories'], items[sid]['protein_g'], ''))

    wine_ids = [
        'fitvine-fitvine-cabernet-sauvignon',
        'skinnygirl-skinnygirl-california-white',
    ]
    for wid in wine_ids:
        if wid in items:
            classifications.append((wid, True, '1 glass (5 oz)', items[wid]['calories'], items[wid]['protein_g'], ''))

    # Other beverages (individual cans/bottles)
    other_bev_true = [
        ('arizona-zero-calorie-green-tea-with-gi-grocery', '1 bottle', ''),
        ('coca-cola-diet-coke-grocery', '1 can (12 oz)', ''),
        ('fever-tree-fever-tree-refreshingly-light-tonic', '1 bottle', ''),
        ('hint-hint-water-blackberry-grocery', '1 bottle', ''),
        ('lacroix-sparkling-water-grocery', '1 can (12 oz)', ''),
        ('ocean-spray-cranberry-juice-cocktail', '1 bottle/box (8 oz)', ''),
        ('perrier-sparkling-natural-mineral-wate-grocery', '1 bottle', ''),
        ('propel-electrolyte-water-grocery', '1 bottle', ''),
        ('schweppes-tonic-water', '1 can (12 oz)', ''),
        ('snapple-diet-peach-tea-grocery', '1 bottle (16 oz)', ''),
        ('topo-chico-sparkling-mineral-water-grocery', '1 bottle', ''),
        ('waterloo-sparkling-water-blackberry-lem-grocery', '1 can (12 oz)', ''),
        ('waterloo-sparkling-water-raspberry-grocery', '1 can (12 oz)', ''),
        ('waterloo-sparkling-water-summer-berry-grocery', '1 can (12 oz)', ''),
    ]
    for bid, serving, note in other_bev_true:
        if bid in items:
            classifications.append((bid, True, serving, items[bid]['calories'], items[bid]['protein_g'], note))

    # Beverage educational/swap items — not actual products, mark FALSE
    bev_educational = [
        'na-swap-ipa-→-light-beer',
        'na-swap-margarita-→-tequila-soda',
        'na-swap-vodka-tonic-→-vodka-soda',
        'na-the-math-i-only-had-3-drinks',
        'na-the-real-issue-drunk-eating',
    ]
    for eid in bev_educational:
        if eid in items:
            classifications.append((eid, False, '', 0, 0.0, 'Educational content, not a product.'))

    # --- Frozen Treat ---
    classifications.append(('drumstick-classic-orig', True, '1 cone', 290, 5.0, ''))

    # --- Chewy/Gummy TRUE (individual bags) ---
    final_boss_ids = [
        'finalboss-blue-raspberry-mango-dippers-level-3-swap',
        'finalboss-cantaloupe-fingers-dippers-level-3-swap',
        'finalboss-green-apple-level-4-swap',
        'finalboss-strawberry-x-mango-level-2-swap',
        'finalboss-watermelon-kiwis-level-3-swap',
    ]
    for fid in final_boss_ids:
        if fid in items:
            classifications.append((fid, True, '1 bag (1.8 oz)', items[fid]['calories'], items[fid]['protein_g'], ''))

    classifications.append(('haribo-goldbears-orig', True, '1 bag (2 oz)', 100, 2.0, ''))
    classifications.append(('smartsweets-lollipops-blue-raspberry-watermelon-swap', True, '1 bag', 40, 0.0, ''))
    classifications.append(('sourpatch-watermelon-orig', True, '1 bag (2 oz)', 150, 0.0, ''))
    classifications.append(('swedish-fish-orig', True, '1 bag (2 oz)', 105, 0.0, ''))

    # --- Chewy/Gummy FALSE (bulk bags of dried fruit) ---
    chewy_false = [
        ('sunsweet-mediterranean-dried-apricots', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('sunsweet-pitted-prunes-dried-plums', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('mariani-dried-apricots', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('nutscom-fancy-california-dried-apricots', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('natural-delights-medjool-dates', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('philippine-brand-dried-mangoes', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
        ('rind-snacks-straw-peary-dried-fruit-blend', 'Sold in bags. Measure portions — easy to overeat dried fruit.'),
    ]
    for cid, note in chewy_false:
        if cid in items:
            classifications.append((cid, False, '', 0, 0.0, note))

    # --- Frozen Fruit TRUE (smoothie packs) ---
    classifications.append(('blendtopia-superfood-smoothie-kit-glow', True, '1 pack', 160, 3.0, ''))
    classifications.append(('pitaya-plus-dragon-fruit-smoothie-packs', True, '1 pack', 60, 1.0, ''))
    classifications.append(('sambazon-organic-acai-smoothie-packs-original-blend', True, '1 pack', 100, 2.0, ''))

    # USDA Fresh fruits
    usda_fruit_ids = [
        'usda-fresh-apricot-baseline', 'usda-fresh-banana-baseline',
        'usda-fresh-cherries-baseline', 'usda-fresh-cranberries-baseline',
        'usda-fresh-grapes-baseline-for-raisins', 'usda-fresh-mango-baseline',
        'usda-fresh-peach-baseline', 'usda-fresh-pineapple-baseline',
    ]
    for fid in usda_fruit_ids:
        if fid in items:
            classifications.append((fid, True, '1 medium fruit', items[fid]['calories'], items[fid]['protein_g'], 'One piece = one serving.'))

    # --- Salty & Crunchy TRUE (personal bags) ---
    classifications.append(('pirates-booty-aged-white-cheddar-puffs', True, '0.5 oz bag', 65, 1.0, ''))
    classifications.append(('popchips-cheddar-potato-chips', True, '0.8 oz bag', 90, 2.0, ''))
    classifications.append(('popchips-sea-salt-potato-chips', True, '0.8 oz bag', 90, 2.0, ''))
    classifications.append(('harvest-snaps-green-pea-snack-crisps-lightly-salted', True, '1 oz bag', 130, 5.0, ''))
    classifications.append(('harvest-snaps-lentil-snack-crisps-white-cheddar', True, '1 oz bag', 140, 5.0, ''))
    classifications.append(('sensible-portions-garden-veggie-straws-sea-salt', True, '1 oz bag', 130, 1.0, ''))
    classifications.append(('lays-classic-potato-chips', True, '1 oz bag', 160, 2.0, ''))
    classifications.append(('nabisco-wheat-thins-original', True, 'snack pack (1 oz)', 140, 2.0, ''))
    classifications.append(('nabisco-ritz-crackers-original', True, 'snack pack (1 oz)', 80, 1.0, ''))
    classifications.append(('snyders-of-hanover-mini-pretzels', True, '1 oz bag', 110, 3.0, ''))
    classifications.append(('bingeworthy-beef-crisps-bbq', True, '1 oz bag', items['bingeworthy-beef-crisps-bbq']['calories'], items['bingeworthy-beef-crisps-bbq']['protein_g'], ''))
    classifications.append(('bingeworthy-beef-crisps-original', True, '1 oz bag', items['bingeworthy-beef-crisps-original']['calories'], items['bingeworthy-beef-crisps-original']['protein_g'], ''))
    classifications.append(('bingeworthy-beef-crisps-spicy', True, '1 oz bag', items['bingeworthy-beef-crisps-spicy']['calories'], items['bingeworthy-beef-crisps-spicy']['protein_g'], ''))

    # Salty & Crunchy FALSE (bulk)
    salty_crunchy_false = [
        ('nabisco-triscuit-original', 'Box. Count out 6 crackers = 1 serving.'),
        ('gg-scandinavian-fiber-crispbread', 'Package. 2-3 pieces per serving.'),
        ('wasa-light-rye-crispbread', 'Package. 2-3 slices per serving.'),
        ('wasa-sourdough-crispbread', 'Package. 2-3 slices per serving.'),
        ('lundberg-thin-stackers-5-grain-salt-free', 'Package. 2-3 cakes per serving.'),
        ('lundberg-thin-stackers-red-rice-quinoa', 'Package. 2-3 cakes per serving.'),
        ('kims-magic-pop-original', 'Bag. 3-5 pops per serving.'),
        ('crunchmaster-multi-seed-crackers', 'Box/bag. Count out 15 crackers = 1 serving.'),
        ('quinn-gluten-free-sea-salt-pretzel-sticks', 'Bag. Measure 1 oz per serving.'),
        ('unique-snacks-extra-dark-pretzel-splits', 'Bag. 1 oz per serving.'),
        ('unique-snacks-original-pretzel-splits', 'Bag. 1 oz per serving.'),
        ('chips-queso-orig', 'Restaurant serving. Ask for a small portion.'),
        ('na-category-comparison-per-100g-fat-content-rankings', 'Educational content, not a product.'),
    ]
    for sid, note in salty_crunchy_false:
        if sid in items:
            classifications.append((sid, False, '', 0, 0.0, note))

    # --- Salty Crunch ---
    # Whisps
    classifications.append(('whisps-asiago-pepper-jack-swap', True, 'single-serve bag (0.63 oz)', 100, 8.0, ''))
    # Rold Gold (both entries)
    classifications.append(('roldgold-tiny-twists-orig', True, '1 oz bag', 120, 3.0, ''))
    classifications.append(('rold-gold-tiny-twists-orig', True, '1 oz bag', 120, 3.0, ''))
    # Crisp Power — individual bags
    crisp_power_ids = [
        'crisppower-cheddar-swap', 'crisppower-everything-swap',
        'crisppower-seasalt-swap', 'crisppower-sesame-swap',
    ]
    for cpid in crisp_power_ids:
        if cpid in items:
            classifications.append((cpid, True, '1 bag (1.5 oz)', items[cpid]['calories'], items[cpid]['protein_g'], ''))

    classifications.append(('jollytime-healthypop-swap', True, '1 bag (microwave)', 80, 2.0, 'Individual microwave bag.'))
    classifications.append(('love-corn-cheesy-swap', True, '1 bag (1.6 oz)', 120, 2.0, ''))

    # Salty Crunch FALSE
    salty_crunch_false = [
        ('pepperidge-sesame-sticks-orig', 'Bag. 1 oz per serving.'),
        ('snyders-cheddar-pretzel-orig', 'Bag. 1 oz per serving.'),
        ('snyders-everything-orig', 'Bag. 1 oz per serving.'),
    ]
    for sid, note in salty_crunch_false:
        if sid in items:
            classifications.append((sid, False, '', 0, 0.0, note))

    # --- Protein TRUE (individually packaged) ---
    # Jerky
    jerky_ids = [
        'butterball-original-turkey-jerky-grocery',
        'krave-sea-salt-original-beef-jerky-grocery',
        'old-trapper-kippered-beef-steak-steak-stri-grocery',
        'old-trapper-old-fashioned-beef-jerky-origi-grocery',
        'old-trapper-peppered-beef-jerky-grocery',
        'perky-jerky-original-turkey-jerky-grocery',
        'think-jerky-classic-grass-fed-beef-jerky-grocery',
    ]
    for jid in jerky_ids:
        if jid in items:
            classifications.append((jid, True, '1 bag (1 oz)', items[jid]['calories'], items[jid]['protein_g'], ''))

    # Hard-boiled eggs
    hb_egg_ids = [
        'generic-usda-hard-boiled-egg-whole',
        'great-value-walmart-hard-boiled-eggs-peeled',
        'kirkland-signature-c-organic-hard-boiled-eggs-grocery',
        'pete-gerrys-organic-hard-boiled-eggs',
        'vital-farms-pasture-raised-hard-boiled-eggs-2-pack',
    ]
    for eid in hb_egg_ids:
        if eid in items:
            classifications.append((eid, True, '2-pack', items[eid]['calories'], items[eid]['protein_g'], ''))

    # Go Snackers
    classifications.append(('go-snackers-toppers-chicken-breast-bites-grocery', True, '1 bag', 170, 30.0, ''))

    # Wild Planet tuna
    classifications.append(('wild-planet-wild-skipjack-light-tuna-grocery', True, '1 can (5 oz)', 90, 20.0, ''))

    # Raw whole eggs — individual by nature
    raw_egg_ids = [
        'generic-usda-large-whole-egg-raw',
        'generic-usda-large-egg-white-only-raw',
    ]
    for eid in raw_egg_ids:
        if eid in items:
            classifications.append((eid, True, '1 egg', items[eid]['calories'], items[eid]['protein_g'], ''))

    # Frozen burger patties — individually frozen
    patty_ids = [
        'bubba-burgers-original-usda-choice-beef-patty-frozen-~7327',
        'butterball-frozen-turkey-burger-patty',
        'jennie-o-turkey-burger-patty-frozen',
        'trident-seafoods-alaska-salmon-burger-patty-frozen',
        'impossible-foods-impossible-burger-patty-frozen-plant-based',
        'beyond-meat-beyond-burger-patty-frozen-plant-based',
        'applegate-organic-chicken-burger-patty-frozen',
        'don-lee-farms-grilled-chicken-patties',
    ]
    for pid in patty_ids:
        if pid in items:
            classifications.append((pid, True, '1 patty', items[pid]['calories'], items[pid]['protein_g'], 'Individually frozen patties.'))

    # Hot dogs / sausage links — individually portioned by nature
    link_ids = [
        'aidells-chicken-apple-sausage',
        'applegate-chicken-sage-breakfast-sausage-links',
        'applegate-natural-uncured-turkey-hot-dog',
        'applegate-the-great-organic-turkey-hot-dog',
        'ball-park-turkey-franks',
        'beyond-meat-beyond-sausage-brat-original',
        'beyond-meat-beyond-sausage-hot-italian',
        'bilinskis-buffalo-style-chicken-sausage',
        'bilinskis-chicken-parmesan-sausage',
        'bilinskis-organic-mild-italian-chicken-sausage',
        'bilinskis-organic-spinach-feta-chicken-sausage',
        'field-roast-classic-smoked-frankfurters-plant-based',
        'foster-farms-turkey-franks',
        'hebrew-national-beef-franks',
        'lightlife-smart-dogs-plant-based',
        'nathans-famous-skinless-beef-franks',
        'oscar-mayer-classic-wieners',
        'oscar-mayer-turkey-hot-dogs',
        'true-story-foods-organic-sweet-italian-chicken-sausage',
        'al-fresco-buffalo-style-chicken-sausage',
        'al-fresco-roasted-pepper-asiago-chicken-sausage',
        'al-fresco-sweet-italian-style-chicken-sausage',
    ]
    for lid in link_ids:
        if lid in items:
            classifications.append((lid, True, '1 link', items[lid]['calories'], items[lid]['protein_g'], ''))

    # Kevin's Natural Foods meals — individual trays
    kevins_meal_ids = [
        'kevins-natural-foods-cilantro-lime-chicken',
        'kevins-natural-foods-teriyaki-style-chicken',
        'kevins-natural-foods-thai-style-coconut-chicken-bow-grocery',
    ]
    for kid in kevins_meal_ids:
        if kid in items:
            classifications.append((kid, True, '1 tray', items[kid]['calories'], items[kid]['protein_g'], ''))

    # Healthy Choice Power Bowls — individual trays
    hc_ids = [
        'healthy-choice-power-bowls-greek-style-chicke-grocery',
        'healthy-choice-power-bowls-spicy-black-bean-c-grocery',
    ]
    for hid in hc_ids:
        if hid in items:
            classifications.append((hid, True, '1 tray', items[hid]['calories'], items[hid]['protein_g'], ''))

    # Trident Seafoods Alaska Salmon Burgers (non-frozen entry)
    if 'trident-seafoods-alaska-salmon-burgers' in items:
        classifications.append(('trident-seafoods-alaska-salmon-burgers', True, '1 patty', items['trident-seafoods-alaska-salmon-burgers']['calories'], items['trident-seafoods-alaska-salmon-burgers']['protein_g'], 'Individually frozen patties.'))

    # --- Protein FALSE (bulk/packages) ---
    # Ground meats
    ground_meat_ids = [
        'generic-usda-ground-beef-7030-raw', 'generic-usda-ground-beef-8020-raw',
        'generic-usda-ground-beef-8515-raw', 'generic-usda-ground-beef-9010-raw',
        'generic-usda-ground-beef-937-raw', 'generic-usda-ground-beef-955-raw',
        'generic-usda-ground-beef-964-extra-lean-raw',
        'generic-usda-ground-turkey-raw-~93-lean',
        'butterball-99-fat-free-ground-turkey-breast-raw',
        'butterball-ground-turkey-937-raw',
        'jennie-o-extra-lean-ground-turkey-breast-991-raw',
        'jennie-o-ground-turkey-8515-raw',
        'jennie-o-italian-seasoned-ground-turkey-raw',
        'jennie-o-lean-ground-turkey-937-raw',
        'jennie-o-taco-seasoned-ground-turkey-raw',
        'perdue-ground-chicken-raw', 'perdue-ground-chicken-breast-raw-extra-lean',
        'shadybrook-farms-ground-turkey-raw',
        'beyond-meat-beyond-beef-ground-plant-based-raw',
        'impossible-foods-impossible-burger-ground-plant-based-raw',
        'great-range-generic-ground-bison-9010-raw',
        'silver-fern-farms-generic-ground-venison-raw',
    ]
    for gid in ground_meat_ids:
        if gid in items:
            classifications.append((gid, False, '', 0, 0.0, 'Weigh portions on a food scale. 4 oz raw = 1 serving.'))

    # Raw poultry breast
    raw_poultry_ids = [
        'generic-usda-chicken-breast-boneless-skinless-raw',
        'generic-usda-turkey-breast-boneless-skinless-raw',
        'generic-usda-pork-tenderloin-raw',
    ]
    for rid in raw_poultry_ids:
        if rid in items:
            classifications.append((rid, False, '', 0, 0.0, 'Weigh portions on a food scale. 4 oz raw = 1 serving.'))

    # Deli meats
    deli_ids = [
        'applegate-oven-roasted-turkey-breast-del-grocery',
        'applegate-naturals-oven-roasted-turkey-breast-grocery',
        'boars-head-ovengold-roasted-turkey-breast-grocery',
        'columbus-herb-roasted-turkey-breast-deli-sliced',
        'columbus-craft-meats-oven-roasted-turkey-breast-grocery',
        'generic-usda-96-lean-deli-turkey-breast',
        'h-e-b-mesquite-smoked-turkey-breast--grocery',
        'h-e-b-reserve-applewood-smoked-turkey-breast-grocery',
        'h-e-b-reserve-cherrywood-smoked-uncured-ham--grocery',
        'hillshire-farm-ultra-thin-oven-roasted-turkey-grocery',
        'hormel-natural-choice-oven-roasted-de-grocery',
        'kirkland-signature-c-oven-roasted-turkey-breast-del-grocery',
        'land-ofrost-premium-oven-roasted-turkey-breast-grocery',
        'oscar-mayer-deli-fresh-mesquite-turkey-bre-grocery',
        'oscar-mayer-deli-fresh-oven-roasted-turkey-grocery',
    ]
    for did in deli_ids:
        if did in items:
            classifications.append((did, False, '', 0, 0.0, 'Package. Use 2 oz (4-5 slices) per serving.'))

    # Frozen chicken strips/bites (bags)
    frozen_strips_ids = [
        'tyson-grilled-ready-chicken-breast-s-grocery',
        'kirkland-signature-c-grilled-chicken-breast-strips-grocery',
        'just-bare-lightly-breaded-chicken-breast-chunks',
        'just-bare-roasted-chicken-breast-bites-grocery',
        'john-soules-foods-so-fully-cooked-fajita-angus-beef-grocery',
        'john-soules-foods-so-fully-cooked-fajita-chicken-br-grocery',
        'perdue-short-cuts-carved-grilled-chic-grocery',
        'perdue-short-cuts-original-roasted-ch-grocery',
        'kirkland-signature-c-rotisserie-chicken-breast-meat-grocery',
    ]
    for fsid in frozen_strips_ids:
        if fsid in items:
            classifications.append((fsid, False, '', 0, 0.0, 'Bag of frozen pieces. Weigh portions — 4 oz = 1 serving.'))

    # Liquid egg whites
    egg_white_ids = [
        'allwhites-100-liquid-egg-whites',
        'egg-beaters-original-99-egg-whites',
        'egg-beaters-southwestern-style',
        'egglands-best-100-liquid-egg-whites',
        'great-value-walmart-100-liquid-egg-whites',
        'organic-valley-organic-liquid-egg-whites',
        'simple-truth-kroger-liquid-egg-whites',
    ]
    for ewid in egg_white_ids:
        if ewid in items:
            classifications.append((ewid, False, '', 0, 0.0, 'Carton. Pour 1/4 cup (46g) per serving.'))

    # Just Egg
    classifications.append(('just-egg-plant-based-egg-pourable', False, '', 0, 0.0, 'Bottle. Pour 3 tbsp per serving.'))

    # Protein powder
    protein_powder_ids = [
        'kos-organic-plant-protein-chocolate',
        'kos-organic-plant-protein-vanilla',
        'naked-nutrition-naked-whey-unflavored',
        'vital-proteins-collagen-peptides-unflavored',
    ]
    # Sports Research not in DB, skip
    for ppid in protein_powder_ids:
        if ppid in items:
            classifications.append((ppid, False, '', 0, 0.0, 'Tub/bag. Use 1 scoop per serving.'))

    # Bacon
    classifications.append(('bacon-regular-orig', False, '', 0, 0.0, 'Package. 2-3 slices per serving.'))
    classifications.append(('bacon-turkey-swap', False, '', 0, 0.0, 'Package. 2-3 slices per serving.'))

    # Bibigo dumplings
    classifications.append(('bibigo-steamed-dumplings-chicken-vegetable', False, '', 0, 0.0, 'Bag of frozen. 4 dumplings = 1 serving.'))

    # Crepini Egg White Thins
    classifications.append(('crepini-egg-white-thins-with-cauliflower', False, '', 0, 0.0, 'Package. 1 thin per serving.'))

    # Morey's Salmon
    classifications.append(('moreys-smoke-roasted-salmon-bites-lab-grocery', False, '', 0, 0.0, 'Package. Use 4 oz per serving.'))
    classifications.append(('moreys-smoked-salmon-closest-to-smoke-grocery', False, '', 0, 0.0, 'Package. Use 4 oz per serving.'))

    # --- Sweet Crunch TRUE ---
    classifications.append(('poptarts-strawberry-orig', True, '1 pastry', 185, 2.0, 'Sold in 2-packs (370 cal total). Personal size = eat 1 pastry.'))
    classifications.append(('highkey-brownie-swap', True, '1 pouch', 140, 10.0, ''))
    classifications.append(('smartcake-raspberry-swap', True, '1 cake', 38, 4.0, ''))
    classifications.append(('lennylarry-cremes-swap', True, '1 pack', 130, 5.0, ''))
    classifications.append(('hostess-twinkie-orig', True, '1 cake', 140, 2.0, 'Sold in multi-packs. Individually wrapped.'))
    classifications.append(('jolly-rancher-regular-orig', True, '3 pieces', 93, 0.0, 'Individual pieces. Limit to 3.'))
    # Crisp Power Cinnamon Crunch — individual bags
    classifications.append(('crisppower-cinnamon-swap', True, '1 bag (1.5 oz)', items['crisppower-cinnamon-swap']['calories'], items['crisppower-cinnamon-swap']['protein_g'], ''))

    # Sweet Crunch FALSE (bulk/sharing)
    sweet_crunch_false = [
        ('cinnamontoast-orig', 'Box. 3/4 cup per serving.'),
        ('cocoapuffs-orig', 'Box. 3/4 cup per serving.'),
        ('luckycharms-orig', 'Box. 3/4 cup per serving.'),
        ('entenmanns-donut-orig', 'Box of donuts. 1 donut = 1 serving.'),
        ('skittles-original-orig', 'Sharing bag (440 cal total). Pour a small portion, close the bag.'),
        ('sour-patch-kids-orig', 'Sharing bag (360 cal total). Pour a small portion, close the bag.'),
        ('mariani-philippine-dried-mangoes', 'Bag. 1/4 cup per serving.'),
    ]
    for sid, note in sweet_crunch_false:
        if sid in items:
            classifications.append((sid, False, '', 0, 0.0, note))

    # --- Dairy TRUE (individually wrapped) ---
    classifications.append(('borden-american-cheese-singles', True, '1 slice', 60, 3.0, ''))
    classifications.append(('borden-2-milk-american-singles', True, '1 slice', 50, 4.0, ''))
    classifications.append(('borden-fat-free-american-singles', True, '1 slice', 30, 4.0, ''))
    classifications.append(('velveeta-original-cheese-slices', True, '1 slice', 40, 3.0, ''))
    # Sargento Ultra Thin
    sargento_thin_ids = [
        'sargento-ultra-thin-sliced-mild-cheddar',
        'sargento-ultra-thin-sliced-provolone',
        'sargento-ultra-thin-sliced-swiss',
    ]
    for stid in sargento_thin_ids:
        if stid in items:
            classifications.append((stid, True, '1 slice', items[stid]['calories'], items[stid]['protein_g'], ''))

    # Icelandic Provisions — individual cup
    classifications.append(('icelandic-provisions-vanilla-skyr-grocery', True, '1 cup (5.3 oz)', 130, 15.0, ''))
    # YQ by Yoplait — individual cup
    classifications.append(('yq-by-yoplait-plain-yogurt-grocery', True, '1 cup', 100, 17.0, ''))

    # Dairy FALSE (bags/tubs)
    dairy_false = [
        ('kraft-natural-shredded-mild-cheddar-regular', 'Use a 1/4 cup measuring cup for portions.'),
        ('sargento-shredded-mild-cheddar-regular', 'Use a 1/4 cup measuring cup for portions.'),
        ('sargento-shredded-reduced-fat-4-cheese-mexican', 'Use a 1/4 cup measuring cup for portions.'),
        ('tillamook-farmstyle-shredded-mozzarella', 'Use a 1/4 cup measuring cup for portions.'),
        ('tillamook-farmstyle-shredded-sharp-cheddar', 'Use a 1/4 cup measuring cup for portions.'),
        ('kraft-2-milk-reduced-fat-shredded-sharp-cheddar', 'Use a 1/4 cup measuring cup for portions.'),
        ('kraft-fat-free-shredded-cheddar', 'Use a 1/4 cup measuring cup for portions.'),
        ('breakstones-fat-free-small-curd-cottage-cheese', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('breakstones-lowfat-small-curd-cottage-cheese-2', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('breakstones-small-curd-cottage-cheese-4-milkfat', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('daisy-cottage-cheese-4-milkfat', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('daisy-low-fat-cottage-cheese-2-milkfat', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('friendship-1-lowfat-cottage-cheese', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('hood-low-fat-cottage-cheese', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('muuna-2-lowfat-plain-cottage-cheese', 'Scoop into a bowl. 1/2 cup = 1 serving.'),
        ('cabot-50-reduced-fat-sharp-cheddar', 'Block/bar. Slice portions — 1 oz = 1 serving.'),
        ('daisy-sour-cream-orig', 'Tub. Use 2 tablespoons per serving.'),
    ]
    for did, note in dairy_false:
        if did in items:
            classifications.append((did, False, '', 0, 0.0, note))

    # --- Chocolate Fix ---
    classifications.append(('professor-nutz-chocolate-swap', False, '', 0, 0.0, 'Spoon portions carefully — 1 tbsp at a time.'))
    classifications.append(('choczero-milk-swap', False, '', 0, 0.0, 'Box of squares. Limit to 2-3 squares per sitting.'))
    classifications.append(('mms-peanut-orig', False, '', 0, 0.0, "Sharing bag (480 cal total). Pour into a small bowl, don't eat from the bag."))

    # --- Creamy Dessert ---
    classifications.append(('skinnycow-vanilla-cone-swap', True, '1 cone', 170, 4.0, ''))
    # Creamy Dessert FALSE
    classifications.append(('half-baked-orig', False, '', 0, 0.0, 'Pint (1,110 cal total). Scoop into a bowl — never eat from the container.'))
    classifications.append(('haagendazs-vanilla-orig', False, '', 0, 0.0, 'Pint (1,070 cal total). Scoop into a bowl — never eat from the container.'))
    classifications.append(('nicks-vanilla-pint-swap', False, '', 0, 0.0, 'Pint container. Scoop into a bowl.'))
    classifications.append(('protein-pints-chocolate-swap', False, '', 0, 0.0, 'Pint container. Scoop into a bowl.'))
    classifications.append(('talenti-cccd-orig', False, '', 0, 0.0, 'Pint (900 cal total). Use a measuring cup for portions.'))
    # Reddi-wip in Creamy Dessert category — these are spray cans, TRUE
    classifications.append(('reddi-wip-fatfree-swap', True, '2 tbsp spray', 5, 0.0, 'Portion controlled by spray nozzle.'))
    classifications.append(('reddi-wip-orig', True, '2 tbsp spray', 15, 0.0, 'Portion controlled by spray nozzle.'))

    # --- Bread & Wrap FALSE ---
    bread_false = [
        'crepini-egg-wraps-with-cauliflower',
        'egglife-egg-white-wraps-everything-bagel',
        'egglife-egg-white-wraps-original',
        'egglife-egg-white-wraps-roasted-garlic-herb',
        'egglife-egg-white-wraps-southwest-style',
        'egglife-egg-white-wraps-sweet-cinnamon',
        'egglife-eggwhite-wrap-swap',
        'labanderita-zeronet-swap',
        'mission-carbbalance-burrito-swap',
        'mission-carbbalance-taco-swap',
        'outteraisle-cauliflower-swap',
        'royo-30cal-bread-swap',
        'schmidt-647-bread-swap',
        'tumaros-carbwise-swap',
    ]
    for bid in bread_false:
        if bid in items:
            note = 'Bag of 6 wraps. Use 1 per meal.' if 'egglife' in bid or 'crepini' in bid else 'Bag of bread/wraps. Use serving size listed.'
            classifications.append((bid, False, '', 0, 0.0, note))

    # --- Cereal FALSE ---
    cereal_ids = [
        'bear-naked-bear-naked-fit-granola-triple-berry',
        'bobs-red-mill-bobs-red-mill-high-protein-oat-grain-hot-cerea',
        'bobs-red-mill-bobs-red-mill-muesli-old-country-style',
        'bobs-red-mill-bobs-red-mill-old-fashioned-rolled-oats',
        'bobs-red-mill-bobs-red-mill-steel-cut-oats',
        'cream-of-rice-cream-of-rice',
        'cream-of-wheat-cream-of-wheat-original-25-minute',
        'frostedflakes-orig',
        'general-mills-cheerios-original',
        'julian-bakery-progranola-espresso-cluster',
        'julian-bakery-progranola-vanilla-cinnamon-cluster',
        'kashi-go-protein-fiber-cereal-original',
        'kashi-kashi-go-chocolate-crunch',
        'kashi-kashi-go-original',
        'kelloggs-frosted-mini-wheats',
        'kelloggs-special-k-original',
        'kirkland-costco-kirkland-organic-old-fashioned-rolled-oats',
        'kodiak-cakes-kodiak-power-cakes-mix-buttermilk',
        'natures-path-organic-granola-pumpkin-seed-flax',
        'post-grape-nuts',
        'quaker-capn-crunch',
        'quaker-life-cereal-original',
        'quaker-quaker-old-fashioned-rolled-oats',
        'quaker-quaker-steel-cut-oats',
    ]
    for cid in cereal_ids:
        if cid in items:
            classifications.append((cid, False, '', 0, 0.0, "Measure with 3/4 cup measuring cup. Don't pour from box to bowl."))

    # MUSH — individual sealed cup (TRUE)
    classifications.append(('mush-mush-ready-to-eat-overnight-oats-dark-chocolate', True, '1 cup', 220, 6.0, 'Individual sealed cup. One cup = one serving.'))

    # --- Spread FALSE (tubs) ---
    spread_false = [
        ('cool-whip-fat-free-whipped-topping', 'Tub. Use 2 tablespoons per serving.'),
        ('cool-whip-lite-whipped-topping', 'Tub. Use 2 tablespoons per serving.'),
        ('cool-whip-original-whipped-topping', 'Tub. Use 2 tablespoons per serving.'),
        ('truwhip-skinny-whipped-topping', 'Tub. Use 2 tablespoons per serving.'),
        ('truwhip-whipped-topping', 'Tub. Use 2 tablespoons per serving.'),
    ]
    for sid, note in spread_false:
        if sid in items:
            classifications.append((sid, False, '', 0, 0.0, note))

    # Spread TRUE (spray cans — in Spread category)
    classifications.append(('reddi-wip-fat-free-whipped-cream', True, '2 tbsp spray', 5, 0.0, 'Portion controlled by spray nozzle.'))
    classifications.append(('reddi-wip-original-whipped-cream', True, '2 tbsp spray', 15, 0.0, 'Portion controlled by spray nozzle.'))

    # --- Savory Cooking ---
    classifications.append(('polynesian-sauce-orig', True, '1 packet', 110, 0.0, 'Individual sauce packet from restaurant.'))
    classifications.append(('hoffy-extra-lean-franks-swap', True, '1 frank', 90, 10.0, ''))
    classifications.append(('oscar-wieners-orig', True, '1 frank', 120, 5.0, ''))
    classifications.append(('kaizen-protein-pasta-swap', False, '', 0, 0.0, 'Box. 2 oz dry per serving.'))
    classifications.append(('kraft-fatfree-cheddar-shreds-swap', False, '', 0, 0.0, 'Bag. 1/4 cup per serving.'))
    classifications.append(('kraft-mild-cheddar-shreds-orig', False, '', 0, 0.0, 'Bag. 1/4 cup per serving.'))
    classifications.append(('shirataki-noodles-swap', False, '', 0, 0.0, 'Package. Use full package as 1 serving (very low calorie).'))

    # ========== APPLY ALL CLASSIFICATIONS ==========
    true_count = 0
    false_count = 0
    classified_ids = set()

    for item_id, has_ps, ps_serving, ps_cal, ps_protein, pkg_note in classifications:
        if item_id not in items:
            print(f"  WARNING: ID '{item_id}' not found in NULL items (may already be classified)")
            continue
        if item_id in classified_ids:
            print(f"  WARNING: Duplicate classification for '{item_id}', using last one")
        classified_ids.add(item_id)

        c.execute("""
            UPDATE snack_items SET
                has_personal_size = ?,
                personal_size_serving = ?,
                personal_size_calories = ?,
                personal_size_protein_g = ?,
                package_note = ?
            WHERE id = ?
        """, (
            1 if has_ps else 0,
            ps_serving,
            ps_cal if ps_cal else 0,
            ps_protein if ps_protein else 0.0,
            pkg_note,
            item_id
        ))

        if has_ps:
            true_count += 1
        else:
            false_count += 1

    conn.commit()

    # Check for any remaining NULLs
    c.execute("SELECT id, brand, name, swap_craving_category FROM snack_items WHERE has_personal_size IS NULL")
    remaining = c.fetchall()

    print(f"\n{'='*60}")
    print(f"CLASSIFICATION SUMMARY")
    print(f"{'='*60}")
    print(f"Classified TRUE (has personal size):  {true_count}")
    print(f"Classified FALSE (no personal size):  {false_count}")
    print(f"Total classified:                     {true_count + false_count}")
    print(f"Remaining NULL:                       {len(remaining)}")

    if remaining:
        print(f"\n--- REMAINING NULL ITEMS ({len(remaining)}) ---")
        for r in remaining:
            print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}")
    else:
        print("\nAll items classified successfully!")

    conn.close()

if __name__ == '__main__':
    classify_all()
