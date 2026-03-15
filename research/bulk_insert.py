#!/usr/bin/env python3
"""
Bulk insert ~253 new snack flavors into bulletproof_body.db.
Reads all research JSON files, maps to existing originals, auto-computes swap_vectors.
"""
import json
import sqlite3
import re
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'bulletproof_body.db')
RESEARCH_DIR = os.path.dirname(__file__)

def slugify(text):
    """Convert text to kebab-case slug."""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def parse_grams(serving_str):
    """Extract gram weight from serving string like '1 bar (40g)' or '1 bag (32g)'."""
    if not serving_str:
        return None
    m = re.search(r'(\d+(?:\.\d+)?)\s*g\b', serving_str)
    if m:
        return float(m.group(1))
    return None

def cal_per_100g(calories, serving_grams):
    """Compute calories per 100g for volume comparison."""
    if not calories or not serving_grams or serving_grams == 0:
        return None
    return (calories / serving_grams) * 100

def compute_vectors(orig, swap, is_sour=False, is_frozen=False):
    """
    Compute swap_vectors from macro comparison.
    orig/swap are dicts with: calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, serving (str)
    """
    vectors = []

    oc, sc = orig.get('calories', 0), swap.get('calories', 0)
    op, sp = orig.get('protein_g', 0), swap.get('protein_g', 0)
    of_, sf = orig.get('fiber_g', 0), swap.get('fiber_g', 0)
    osu, ssu = orig.get('sugar_g', 0), swap.get('sugar_g', 0)

    # lower_cal: >= 30 cal savings
    if oc and sc and (oc - sc) >= 30:
        vectors.append('lower_cal')

    # higher_protein: >= 1.5x AND +5g absolute
    if op and sp and sp >= (op * 1.5) and (sp - op) >= 5:
        vectors.append('higher_protein')

    # higher_fiber: >= 3g increase
    if sf - of_ >= 3:
        vectors.append('higher_fiber')

    # less_sugar: >= 10g reduction
    if osu - ssu >= 10:
        vectors.append('less_sugar')

    # slower_eating: sour, frozen, cold form factor
    if is_sour or is_frozen:
        vectors.append('slower_eating')

    # higher_volume: compare cal/100g — swap must be >= 20% less calorie-dense
    og = parse_grams(orig.get('serving', ''))
    sg = parse_grams(swap.get('serving', ''))
    if og and sg and oc and sc:
        orig_density = cal_per_100g(oc, og)
        swap_density = cal_per_100g(sc, sg)
        if orig_density and swap_density and swap_density <= orig_density * 0.8:
            vectors.append('higher_volume')

    return ','.join(vectors)

def get_existing_brand_mappings(cur):
    """Get existing swap mappings: brand -> (original_snack_id, craving, original data)."""
    cur.execute("""
        SELECT si.brand, ss.original_snack_id, ss.craving,
               o.calories, o.protein_g, o.fiber_g, o.sugar_g, o.serving, o.name,
               si.name as swap_name
        FROM snack_swaps ss
        JOIN snack_items si ON si.id = ss.swap_snack_id
        JOIN snack_items o ON o.id = ss.original_snack_id
        WHERE ss.is_active = 1
        ORDER BY si.brand
    """)
    mappings = {}
    for row in cur.fetchall():
        brand = row[0]
        if brand not in mappings:
            mappings[brand] = []
        mappings[brand].append({
            'original_snack_id': row[1],
            'craving': row[2],
            'orig_calories': row[3],
            'orig_protein_g': row[4],
            'orig_fiber_g': row[5],
            'orig_sugar_g': row[6],
            'orig_serving': row[7],
            'orig_name': row[8],
            'swap_name': row[9],
        })
    return mappings

def insert_item(cur, item_id, name, brand, serving, calories, protein, carbs, fat,
                fiber=0, sugar=0, source='', notes='', item_category='snack', item_subcategory=''):
    """Insert a snack_item, skip if exists.

    item_category: 'snack' for grab-and-go snacks, 'grocery' for household items.
    item_subcategory: Required for grocery items (e.g. frozen_meal, protein, dairy, condiment,
                      beverage, cereal, pasta_grain, spread, bread_wrap, sweetener, supplement,
                      frozen_fruit, fresh_fruit, creamer, cooking_oil, precooked_protein).
    """
    cur.execute("INSERT OR IGNORE INTO snack_items (id, name, brand, serving, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, source_url, research_notes, verified_at, item_category, item_subcategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (item_id, name, brand, serving, calories, protein, carbs, fat, fiber, sugar, source, notes, datetime.now().isoformat(), item_category, item_subcategory))

def insert_swap(cur, swap_id, title, context, craving, rationale, orig_id, swap_id_ref, display_order, vectors=''):
    """Insert a snack_swap, skip if exists."""
    cur.execute("INSERT OR IGNORE INTO snack_swaps (id, title, context, craving, rationale, original_snack_id, swap_snack_id, display_order, is_active, swap_vectors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
        (swap_id, title, context, craving, rationale, orig_id, swap_id_ref, display_order, vectors))

def process_built_puffs(cur, data, display_start):
    """Process Built Puff new flavors."""
    count = 0
    for item in data:
        flavor = item['flavor']
        line = item.get('line', 'Built Puff')
        sub_line = item.get('sub_line', '')
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = item['serving']
        source = item.get('source', '')
        note = item.get('note', '')

        is_sour = 'Sour' in (sub_line or '')

        # Determine craving and original based on flavor profile
        if 'Sour' in (sub_line or ''):
            # Sour puffs → Sweet Crunch, vs Sour Patch Kids
            craving = 'Sweet Crunch'
            orig_id = 'sour-patch-kids-orig'
            orig_data = {'calories': 110, 'protein_g': 0, 'fiber_g': 0, 'sugar_g': 24, 'serving': '12 pieces (30g)'}
        elif any(x in flavor.lower() for x in ['chocolate', 'brownie', 'mocha', 'rocky road', 'mint chip', 'hazelnut']):
            # Chocolate flavors → Chocolate Fix, vs Snickers
            craving = 'Chocolate Fix'
            orig_id = 'snickers-orig'
            orig_data = {'calories': 280, 'protein_g': 4, 'fiber_g': 1, 'sugar_g': 30, 'serving': '1 bar (52g)'}
        elif any(x in flavor.lower() for x in ['peanut butter', 'pb']):
            # PB flavors → Sweet Crunch, vs Nutter Butter
            craving = 'Sweet Crunch'
            orig_id = 'nutterbutter-orig'
            orig_data = {'calories': 250, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 14, 'serving': '8 cookies (56g)'}
        else:
            # Default → Sweet Crunch, vs Little Debbie Cosmic Brownies
            craving = 'Sweet Crunch'
            orig_id = 'littledebbie-cosmic-orig'
            orig_data = {'calories': 280, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 24, 'serving': '1 package (48g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data, is_sour=is_sour)

        item_id = f"builtpuff-{slugify(flavor)}-swap"
        swap_pair_id = f"built-puff-{slugify(flavor)}"

        brand_label = f"Built Puff{' (Sour)' if is_sour else ''}"
        name = f"Puff {flavor} Bar"

        insert_item(cur, item_id, name, brand_label, serving, cal, pro, carbs, fat, fiber, sugar, source, note)

        title = f"{flavor} Puff Upgrade"
        context = f"When you want a {flavor.lower()} treat"
        rationale = f"{pro}g protein per bar with only {cal} cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1
    return count

def process_quest(cur, data, display_start):
    """Process Quest new flavors."""
    count = 0
    for item in data:
        flavor = item['flavor']
        line = item['product_line']
        cal = item.get('calories')
        pro = item.get('protein_g', 0)
        carbs = item.get('total_carbs_g')
        fat = item.get('total_fat_g')
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = item.get('serving_size', '')
        source = item.get('source', '')
        notes = item.get('notes', '')

        # Skip items with null calories (Crispy Chips line)
        if cal is None:
            print(f"  SKIP (null cal): Quest {flavor} ({line})")
            continue
        # Skip discontinued
        if 'DISCONTINUED' in (notes or '').upper():
            print(f"  SKIP (discontinued): Quest {flavor}")
            continue

        # Map to craving + original based on product line
        if 'Chips' in line and 'Tortilla' in line:
            craving = 'Salty Crunch'
            orig_id = 'doritos-nacho-orig'
            orig_data = {'calories': 260, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 bag (49g)'}
        elif 'Original Style' in line:
            craving = 'Salty Crunch'
            orig_id = 'lays-classic-orig'
            orig_data = {'calories': 230, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 bag (43g)'}
        elif 'Puffs' in line:
            craving = 'Spicy Crunch'
            orig_id = 'hot-cheetos-orig'
            orig_data = {'calories': 250, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 1, 'serving': '1 bag (50g)'}
        elif 'Crackers' in line:
            craving = 'Salty Crunch'
            orig_id = 'goldfish-cheddar-orig'
            orig_data = {'calories': 240, 'protein_g': 6, 'fiber_g': 1, 'sugar_g': 2, 'serving': '55 pieces (30g)'}
        elif 'Cookie' in line and 'Frosted' not in line:
            craving = 'Sweet Crunch'
            orig_id = 'chipsahoy-original-orig'
            orig_data = {'calories': 320, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 22, 'serving': '6 cookies (48g)'}
        elif 'Frosted' in line:
            craving = 'Sweet Crunch'
            orig_id = 'entenmanns-donut-orig'
            orig_data = {'calories': 310, 'protein_g': 3, 'fiber_g': 0, 'sugar_g': 19, 'serving': '1 donut (57g)'}
        elif 'Candy' in line:
            if 'Peanut Butter' in flavor or 'Peanut' in flavor:
                craving = 'Chocolate Fix'
                orig_id = 'reeses-cups-orig'
                orig_data = {'calories': 440, 'protein_g': 10, 'fiber_g': 2, 'sugar_g': 44, 'serving': '4 cups (68g)'}
            else:
                craving = 'Chocolate Fix'
                orig_id = 'snickers-orig'
                orig_data = {'calories': 280, 'protein_g': 4, 'fiber_g': 1, 'sugar_g': 30, 'serving': '1 bar (52g)'}
        elif 'Bake Shop' in line:
            craving = 'Sweet Crunch'
            orig_id = 'entenmanns-donut-orig'
            orig_data = {'calories': 310, 'protein_g': 3, 'fiber_g': 0, 'sugar_g': 19, 'serving': '1 donut (57g)'}
        else:
            craving = 'Salty Crunch'
            orig_id = 'lays-classic-orig'
            orig_data = {'calories': 230, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 bag (43g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"quest-{slugify(flavor)}-swap"
        swap_pair_id = f"quest-{slugify(line)}-{slugify(flavor)}"

        brand = "Quest"
        name = f"{item['product_name']}" if 'product_name' in item else f"Quest {flavor}"

        insert_item(cur, item_id, name, brand, serving, cal, pro, carbs or 0, fat or 0, fiber, sugar, source, notes)

        title = f"Quest {flavor} Upgrade"
        context = f"When you're craving {flavor.lower()}"
        rationale = f"{pro}g protein, only {cal} cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1
    return count

def process_halotop(cur, data, display_start):
    """Process Halo Top new flavors (pints + pops)."""
    count = 0

    # Pints — all swap vs Ben & Jerry's Half Baked (1100 cal/pint) or Haagen-Dazs (1000+ cal)
    for item in data.get('new_pint_flavors', []):
        flavor = item['flavor']
        cal = item['calories_per_pint']
        pro = item['protein_g']
        carbs = item['total_carbs_g']
        fat = item['total_fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = f"1 pint ({cal} cal)"

        # Compare vs Ben & Jerry's Half Baked (1100 cal pint, 16g protein)
        orig_id = 'half-baked-orig'
        orig_data = {'calories': 1100, 'protein_g': 16, 'fiber_g': 2, 'sugar_g': 96, 'serving': '1 pint (473ml)'}
        craving = 'Creamy Dessert'

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': '1 pint (473ml)'}
        vectors = compute_vectors(orig_data, swap_data, is_frozen=True)

        item_id = f"halotop-{slugify(flavor)}-pint-swap"
        swap_pair_id = f"benjerrys-halotop-{slugify(flavor)}"

        name = f"Halo Top {flavor} Ice Cream"
        insert_item(cur, item_id, name, "Halo Top", serving, cal, pro, carbs, fat, fiber, sugar, '', '')

        title = f"Halo Top {flavor}"
        context = f"When you want {flavor.lower()} ice cream"
        rationale = f"Entire pint is only {cal} cal vs 1100+ for premium ice cream"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # Pops — vs Drumstick (360 cal)
    for item in data.get('new_pop_flavors', []):
        flavor = item['flavor']
        cal = item['calories_per_bar']
        pro = item['protein_g']
        carbs = item['total_carbs_g']
        fat = item['total_fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        sg = item.get('serving_size_g', 78)
        serving = f"1 pop ({sg}g)"

        orig_id = 'drumstick-classic-orig'
        orig_data = {'calories': 360, 'protein_g': 5, 'fiber_g': 1, 'sugar_g': 24, 'serving': '1 cone (112g)'}
        craving = 'Creamy Dessert'

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data, is_frozen=True)

        item_id = f"halotop-{slugify(flavor)}-pop-swap"
        swap_pair_id = f"drumstick-halotop-{slugify(flavor)}-pop"

        keto = item.get('keto', False)
        name = f"Halo Top {flavor} {'Keto ' if keto else ''}Pop"
        insert_item(cur, item_id, name, "Halo Top", serving, cal, pro, carbs, fat, fiber, sugar, '', f"{'Keto. ' if keto else ''}")

        title = f"Halo Top {flavor} Pop"
        context = f"When you want a frozen {flavor.lower()} treat"
        rationale = f"Only {cal} cal vs 360 for a Drumstick"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    return count

def process_protein_bars(cur, data, display_start):
    """Process protein_bars_new_flavors.json (Barebells, ONE, Power Crunch, FitCrunch, No Cow, Prime Bites, Legendary)."""
    count = 0
    brands = data.get('brands', {})

    # --- Barebells ---
    # Existing swaps: Salty Peanut vs Reese's, Caramel Cashew vs Kit Kat
    for item in brands.get('Barebells', {}).get('new_flavors', []):
        flavor = item['name']
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = '1 bar (55g)'
        source = item.get('source', '')

        craving = 'Chocolate Fix'
        orig_id = 'kitkat-original-orig'
        orig_data = {'calories': 500, 'protein_g': 7, 'fiber_g': 1, 'sugar_g': 48, 'serving': '1 bar (73g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"barebells-{slugify(flavor)}-swap"
        swap_pair_id = f"kitkat-barebells-{slugify(flavor)}"

        name = f"Barebells {flavor} Protein Bar"
        insert_item(cur, item_id, name, "Barebells", serving, cal, pro, carbs, fat, fiber, sugar, source, '')

        title = f"Barebells {flavor}"
        context = f"When you want a {flavor.lower()} candy bar"
        rationale = f"{pro}g protein, only {cal} cal vs 500 for King Size Kit Kat"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- ONE Bar ---
    for item in brands.get('ONE Bar', {}).get('new_flavors', []):
        flavor = item['name']
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = '1 bar (60g)'
        source = item.get('source', '')

        craving = 'Chocolate Fix'
        orig_id = 'snickers-fullsize-orig'
        orig_data = {'calories': 510, 'protein_g': 8, 'fiber_g': 1, 'sugar_g': 54, 'serving': '1 bar (93g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"one-{slugify(flavor)}-swap"
        swap_pair_id = f"snickers-one-{slugify(flavor)}"

        name = f"ONE {flavor} Protein Bar"
        insert_item(cur, item_id, name, "ONE", serving, cal, pro, carbs, fat, fiber, sugar, source, '')

        title = f"ONE Bar {flavor}"
        context = f"When you want a {flavor.lower()} candy bar"
        rationale = f"20g protein + 10g fiber, only 220 cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- Power Crunch ---
    for item in brands.get('Power Crunch', {}).get('new_flavors', []):
        flavor = item['name']
        line = item.get('line', 'Original')
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        source = item.get('source', '')
        note = item.get('note', '')

        if line == 'Crisps':
            serving = item.get('serving_size', '1 canister (28g)')
            craving = 'Salty Crunch'
            orig_id = 'pringles-original-orig'
            orig_data = {'calories': 210, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 can (40g)'}
            item_id = f"powercrunch-crisps-{slugify(flavor)}-swap"
            swap_pair_id = f"pringles-powercrunch-{slugify(flavor)}"
            name = f"Power Crunch {flavor}"
        elif line == 'PRO':
            serving = '1 bar (61g)'
            craving = 'Chocolate Fix'
            orig_id = 'snickers-fullsize-orig'
            orig_data = {'calories': 510, 'protein_g': 8, 'fiber_g': 1, 'sugar_g': 54, 'serving': '1 bar (93g)'}
            item_id = f"powercrunch-pro-{slugify(flavor)}-swap"
            swap_pair_id = f"snickers-pcpro-{slugify(flavor)}"
            name = f"Power Crunch {flavor}"
        else:
            serving = '1 bar (40g)'
            craving = 'Sweet Crunch'
            orig_id = 'kitkat-original-orig'
            orig_data = {'calories': 500, 'protein_g': 7, 'fiber_g': 1, 'sugar_g': 48, 'serving': '1 bar (73g)'}
            item_id = f"powercrunch-{slugify(flavor)}-swap"
            swap_pair_id = f"kitkat-powercrunch-{slugify(flavor)}"
            name = f"Power Crunch {flavor} Wafer Bar"

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        insert_item(cur, item_id, name, "Power Crunch", serving, cal, pro, carbs, fat, fiber, sugar, source, note)

        title = f"Power Crunch {flavor}"
        context = f"When you want a crispy {flavor.lower()} snack"
        rationale = f"{pro}g protein wafer bar, only {cal} cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- FitCrunch ---
    for item in brands.get('FitCrunch', {}).get('new_flavors', []):
        flavor = item['name']
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        size = item.get('size', 'Full Size (88g)')
        source = item.get('source', '')
        note = item.get('note', '')

        if 'Snack' in size:
            serving = '1 bar (46g)'
        else:
            serving = '1 bar (88g)'

        craving = 'Chocolate Fix'
        orig_id = 'twix-original-orig'
        orig_data = {'calories': 500, 'protein_g': 5, 'fiber_g': 1, 'sugar_g': 44, 'serving': '1 bar (85.6g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"fitcrunch-{slugify(flavor)}-swap"
        swap_pair_id = f"twix-fitcrunch-{slugify(flavor)}"

        name = f"FitCrunch {flavor} Bar"
        insert_item(cur, item_id, name, "FitCrunch", serving, cal, pro, carbs, fat, fiber, sugar, source, note)

        title = f"FitCrunch {flavor}"
        context = f"When you want a {flavor.lower()} candy bar"
        rationale = f"{pro}g protein, {cal} cal — 6-layer baked bar"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- No Cow ---
    for item in brands.get('No Cow', {}).get('new_flavors', []):
        flavor = item['name']
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = '1 bar (60g)'
        source = item.get('source', '')

        craving = 'Chocolate Fix'
        orig_id = 'snickers-fullsize-orig'
        orig_data = {'calories': 510, 'protein_g': 8, 'fiber_g': 1, 'sugar_g': 54, 'serving': '1 bar (93g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"nocow-{slugify(flavor)}-swap"
        swap_pair_id = f"snickers-nocow-{slugify(flavor)}"

        name = f"No Cow {flavor} Bar"
        insert_item(cur, item_id, name, "No Cow", serving, cal, pro, carbs, fat, fiber, sugar, source, '')

        title = f"No Cow {flavor}"
        context = f"When you want a {flavor.lower()} candy bar"
        rationale = f"20g protein + 14g fiber, only 200 cal — plant-based"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- Prime Bites ---
    for item in brands.get('Prime Bites', {}).get('new_flavors', []):
        flavor = item['name']
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = '1 brownie (57g)'
        source = item.get('source', '')

        craving = 'Sweet Crunch'
        orig_id = 'littledebbie-cosmic-orig'
        orig_data = {'calories': 280, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 24, 'serving': '1 package (48g)'}

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        item_id = f"primebites-{slugify(flavor)}-swap"
        swap_pair_id = f"littledebbie-primebites-{slugify(flavor)}"

        name = f"Prime Bites {flavor} Brownie"
        insert_item(cur, item_id, name, "Prime Bites", serving, cal, pro, carbs, fat, fiber, sugar, source, '')

        title = f"Prime Bites {flavor}"
        context = f"When you want a {flavor.lower()} brownie"
        rationale = f"{pro}g protein brownie, only {cal} cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    # --- Legendary Foods ---
    for item in brands.get('Legendary Foods', {}).get('new_flavors', []):
        flavor = item['name']
        line = item.get('line', 'Protein Pastry')
        cal = item['calories']
        pro = item['protein_g']
        carbs = item['carbs_g']
        fat = item['fat_g']
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        source = item.get('source', '')

        if 'Donut' in line:
            serving = '2 donuts (42g)'
            craving = 'Sweet Crunch'
            orig_id = 'entenmanns-donut-orig'
            orig_data = {'calories': 310, 'protein_g': 3, 'fiber_g': 0, 'sugar_g': 19, 'serving': '1 donut (57g)'}
            item_id = f"legendary-donut-{slugify(flavor)}-swap"
            swap_pair_id = f"entenmanns-legendary-{slugify(flavor)}"
            name = f"Legendary {flavor}"
        elif 'Sweet Roll' in line:
            serving = '1 roll (55g)'
            craving = 'Sweet Crunch'
            orig_id = 'poptarts-strawberry-orig'
            orig_data = {'calories': 400, 'protein_g': 4, 'fiber_g': 1, 'sugar_g': 30, 'serving': '2 pastries (96g)'}
            item_id = f"legendary-sweetroll-{slugify(flavor)}-swap"
            swap_pair_id = f"poptart-legendary-sr-{slugify(flavor)}"
            name = f"Legendary {flavor}"
        else:  # Pastry
            serving = '1 pastry (45g)'
            craving = 'Sweet Crunch'
            orig_id = 'poptarts-strawberry-orig'
            orig_data = {'calories': 400, 'protein_g': 4, 'fiber_g': 1, 'sugar_g': 30, 'serving': '2 pastries (96g)'}
            item_id = f"legendary-{slugify(flavor)}-swap"
            swap_pair_id = f"poptart-legendary-{slugify(flavor)}"
            name = f"Legendary {flavor}"

        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data)

        insert_item(cur, item_id, name, "Legendary Foods", serving, cal, pro, carbs, fat, fiber, sugar, source, '')

        title = f"Legendary {flavor}"
        context = f"When you want a {flavor.lower().replace(' pastry','').replace(' (2-pack)','')} breakfast treat"
        rationale = f"{pro}g protein, only {cal} cal"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    return count

def process_finalboss(cur, data, display_start):
    """Process Final Boss Sour flavors."""
    count = 0
    for item in data:
        flavor = item['flavor']
        cal = item['calories']
        pro = item.get('protein_g', 0)
        carbs = item.get('carbs_g', 0)
        fat = item.get('fat_g', 0)
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = item.get('serving', '1 bag (30g)')
        source = item.get('source', '')
        notes = item.get('notes', '')

        # Original data from the JSON
        orig_name = item.get('proposed_original', 'Sour Patch Kids Original')
        orig_brand = item.get('original_brand', 'Sour Patch Kids')
        orig_cal = item.get('original_calories', 110)
        orig_pro = item.get('original_protein_g', 0)
        orig_carbs = item.get('original_carbs_g', 27)
        orig_fat = item.get('original_fat_g', 0)
        orig_fiber = item.get('original_fiber_g', 0)
        orig_sugar = item.get('original_sugar_g', 24)
        orig_serving = item.get('original_serving', '12 pieces (30g)')

        # Create original if needed
        orig_id = f"{slugify(orig_brand)}-{slugify(orig_name.split('(')[0].strip().split(' ')[-1] if ' ' in orig_name else orig_name)}-fbs-orig"
        # Use simpler IDs for known originals
        if 'Sour Patch' in orig_name and 'Watermelon' in orig_name:
            orig_id = 'sourpatch-watermelon-orig'
        elif 'Sour Patch' in orig_name:
            orig_id = 'sour-patch-kids-orig'
        elif 'Haribo' in orig_brand:
            orig_id = 'haribo-goldbears-orig'
        elif 'Swedish Fish' in orig_brand:
            orig_id = 'swedish-fish-orig'
        elif 'Trolli' in orig_brand:
            orig_id = 'trolli-crawlers-orig'

        insert_item(cur, orig_id, orig_name, orig_brand, orig_serving, orig_cal, orig_pro, orig_carbs, orig_fat, orig_fiber, orig_sugar, item.get('original_source', ''), '')

        # Swap item
        item_id = f"finalboss-{slugify(flavor.replace('Final Boss Sour - ',''))}-swap"

        orig_data = {'calories': orig_cal, 'protein_g': orig_pro, 'fiber_g': orig_fiber, 'sugar_g': orig_sugar, 'serving': orig_serving}
        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data, is_sour=True)

        craving = 'Chewy/Gummy'

        name = flavor.replace('Final Boss Sour - ', 'Final Boss Sour ')
        insert_item(cur, item_id, name, "Final Boss Sour", serving, cal, pro, carbs, fat, fiber, sugar, source, notes)

        swap_pair_id = f"fbs-{slugify(flavor.replace('Final Boss Sour - ',''))}"

        title = f"Final Boss {flavor.replace('Final Boss Sour - ','')}"
        context = f"When you want sour candy"
        rationale = f"Real dried fruit with sour powder — forces slower eating, cleaner ingredients"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    return count

def process_cereal_misc(cur, data, display_start):
    """Process cereal_misc_new_flavors.json (Magic Spoon, Catalina, Three Wishes, Ghost, etc.)."""
    count = 0

    for item in data:
        brand = item.get('brand', '')
        flavor = item.get('flavor', '')
        product_line = item.get('product_line', '')
        cal = item.get('calories') or item.get('total_calories')
        pro = item.get('protein_g') or item.get('total_protein_g', 0)
        carbs = item.get('total_carbs_g', 0)
        fat = item.get('total_fat_g', 0)
        fiber = item.get('fiber_g', 0)
        sugar = item.get('sugar_g', 0)
        serving = item.get('serving_size', '1 serving')
        source = item.get('source', '')
        notes = item.get('notes', '')

        if cal is None or cal == 0:
            print(f"  SKIP (null cal): {brand} {flavor}")
            continue

        # Determine craving and original based on brand/product type
        if brand in ('Magic Spoon', 'Catalina Crunch', 'Three Wishes', 'Ghost', 'Premier Protein') and 'Cereal' in product_line:
            craving = 'Sweet Crunch'
            if 'Cocoa' in flavor or 'Chocolate' in flavor or 'Dark Chocolate' in flavor:
                orig_id = 'cocoapuffs-orig'
                orig_data = {'calories': 160, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 13, 'serving': '1 cup (36g)'}
            elif 'Cinnamon' in flavor or 'Maple' in flavor or 'Honey' in flavor:
                orig_id = 'cinnamontoast-orig'
                orig_data = {'calories': 170, 'protein_g': 1, 'fiber_g': 2, 'sugar_g': 12, 'serving': '1 cup (41g)'}
            elif 'Fruity' in flavor or 'Berry' in flavor:
                orig_id = 'frostedflakes-orig'
                orig_data = {'calories': 150, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 14, 'serving': '1 cup (39g)'}
            elif 'Marshmallow' in flavor:
                orig_id = 'luckycharms-orig'
                orig_data = {'calories': 160, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 13, 'serving': '1 cup (36g)'}
            elif 'Peanut Butter' in flavor:
                orig_id = 'cocoapuffs-orig'
                orig_data = {'calories': 160, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 13, 'serving': '1 cup (36g)'}
            else:
                orig_id = 'frostedflakes-orig'
                orig_data = {'calories': 150, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 14, 'serving': '1 cup (39g)'}
        elif 'Sandwich Cookie' in product_line or 'Cookie' in product_line:
            craving = 'Sweet Crunch'
            orig_id = 'oreos-orig'
            orig_data = {'calories': 160, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 14, 'serving': '3 cookies (34g)'}
        elif brand == 'Wilde':
            craving = 'Salty Crunch'
            orig_id = 'doritos-nacho-orig'
            orig_data = {'calories': 260, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 bag (49g)'}
        elif brand == 'Twin Peaks':
            if 'Buffalo' in flavor or 'Hot' in flavor:
                craving = 'Spicy Crunch'
                orig_id = 'takis-fuego-orig'
                orig_data = {'calories': 280, 'protein_g': 3, 'fiber_g': 2, 'sugar_g': 1, 'serving': '1 bag (56g)'}
            else:
                craving = 'Salty Crunch'
                orig_id = 'hot-cheetos-orig'
                orig_data = {'calories': 250, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 1, 'serving': '1 bag (50g)'}
        elif brand == 'Whisps':
            craving = 'Salty Crunch'
            orig_id = 'goldfish-cheddar-orig'
            orig_data = {'calories': 240, 'protein_g': 6, 'fiber_g': 1, 'sugar_g': 2, 'serving': '55 pieces (30g)'}
        elif brand == 'PopCorners Flex':
            craving = 'Salty Crunch'
            orig_id = 'pringles-original-orig'
            orig_data = {'calories': 210, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 can (40g)'}
        elif brand == 'SmartSweets':
            craving = 'Chewy/Gummy'
            if 'Sour' in flavor:
                orig_id = 'sour-patch-kids-orig'
                orig_data = {'calories': 110, 'protein_g': 0, 'fiber_g': 0, 'sugar_g': 24, 'serving': '12 pieces (30g)'}
            else:
                orig_id = 'skittles-original-orig'
                orig_data = {'calories': 231, 'protein_g': 0, 'fiber_g': 0, 'sugar_g': 47, 'serving': '1 bag (56g)'}
        elif brand == 'Chomps':
            craving = 'Salty Crunch'
            orig_id = 'slimjim-monster-orig'
            orig_data = {'calories': 260, 'protein_g': 14, 'fiber_g': 0, 'sugar_g': 4, 'serving': '2 sticks (56g)'}
        elif brand == 'Love Corn':
            craving = 'Salty Crunch'
            orig_id = 'cornnuts-original-orig'
            orig_data = {'calories': 130, 'protein_g': 2, 'fiber_g': 1, 'sugar_g': 0, 'serving': '1/3 cup (28g)'}
        elif brand == 'HighKey':
            craving = 'Sweet Crunch'
            if 'Sandwich' in product_line:
                orig_id = 'oreos-orig'
                orig_data = {'calories': 160, 'protein_g': 1, 'fiber_g': 0, 'sugar_g': 14, 'serving': '3 cookies (34g)'}
            else:
                orig_id = 'chipsahoy-original-orig'
                orig_data = {'calories': 320, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 22, 'serving': '6 cookies (48g)'}
        elif brand == 'Olipop':
            craving = 'Refreshing Drink'
            orig_id = 'cocacola-orig'
            orig_data = {'calories': 240, 'protein_g': 0, 'fiber_g': 0, 'sugar_g': 65, 'serving': '1 bottle (591ml)'}
        else:
            craving = 'Salty Crunch'
            orig_id = 'lays-classic-orig'
            orig_data = {'calories': 230, 'protein_g': 3, 'fiber_g': 1, 'sugar_g': 2, 'serving': '1 bag (43g)'}

        is_sour = 'sour' in flavor.lower() or brand == 'SmartSweets'
        swap_data = {'calories': cal, 'protein_g': pro, 'fiber_g': fiber, 'sugar_g': sugar, 'serving': serving}
        vectors = compute_vectors(orig_data, swap_data, is_sour=is_sour)

        item_id = f"{slugify(brand)}-{slugify(flavor)}-swap"
        swap_pair_id = f"{slugify(brand)}-{slugify(flavor)}-pair"

        name = item.get('product_name', f"{brand} {flavor}")
        insert_item(cur, item_id, name, brand, serving, cal, pro, carbs, fat, fiber, sugar, source, notes)

        title = f"{brand} {flavor}"
        context = f"When you want {flavor.lower()}"
        rationale = f"{pro}g protein, only {cal} cal" if pro > 0 else f"Only {cal} cal with {fiber}g fiber"

        insert_swap(cur, swap_pair_id, title, context, craving, rationale, orig_id, item_id, display_start + count, vectors)
        count += 1

    return count


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get current max display_order
    cur.execute("SELECT COALESCE(MAX(display_order), 0) FROM snack_swaps")
    display_start = cur.fetchone()[0] + 1

    total = 0

    # 1. Built Puff flavors
    print("=== Built Puff ===")
    with open(os.path.join(RESEARCH_DIR, 'built_new_flavors.json')) as f:
        built_data = json.load(f)
    n = process_built_puffs(cur, built_data, display_start + total)
    print(f"  Inserted {n} Built Puff flavors")
    total += n

    # 2. Quest flavors
    print("=== Quest ===")
    with open(os.path.join(RESEARCH_DIR, 'quest_new_flavors.json')) as f:
        quest_data = json.load(f)
    n = process_quest(cur, quest_data, display_start + total)
    print(f"  Inserted {n} Quest flavors")
    total += n

    # 3. Halo Top flavors
    print("=== Halo Top ===")
    with open(os.path.join(RESEARCH_DIR, 'halotop_new_flavors.json')) as f:
        halotop_data = json.load(f)
    n = process_halotop(cur, halotop_data, display_start + total)
    print(f"  Inserted {n} Halo Top flavors")
    total += n

    # 4. Protein bars (Barebells, ONE, Power Crunch, FitCrunch, No Cow, Prime Bites, Legendary)
    print("=== Protein Bars ===")
    with open(os.path.join(RESEARCH_DIR, 'protein_bars_new_flavors.json')) as f:
        bars_data = json.load(f)
    n = process_protein_bars(cur, bars_data, display_start + total)
    print(f"  Inserted {n} protein bar flavors")
    total += n

    # 5. Final Boss Sour
    print("=== Final Boss Sour ===")
    with open(os.path.join(RESEARCH_DIR, 'finalboss_sour_flavors.json')) as f:
        fbs_data = json.load(f)
    n = process_finalboss(cur, fbs_data, display_start + total)
    print(f"  Inserted {n} Final Boss Sour flavors")
    total += n

    # 6. Cereal + Misc (Magic Spoon, Catalina, SmartSweets, Chomps, Olipop, etc.)
    print("=== Cereal & Misc ===")
    with open(os.path.join(RESEARCH_DIR, 'cereal_misc_new_flavors.json')) as f:
        misc_data = json.load(f)
    n = process_cereal_misc(cur, misc_data, display_start + total)
    print(f"  Inserted {n} cereal/misc flavors")
    total += n

    conn.commit()

    # Summary
    cur.execute("SELECT COUNT(*) FROM snack_items WHERE is_active = 1")
    total_items = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM snack_swaps WHERE is_active = 1")
    total_swaps = cur.fetchone()[0]

    print(f"\n{'='*50}")
    print(f"BULK INSERT COMPLETE")
    print(f"  New flavors inserted this run: {total}")
    print(f"  Total snack_items in DB: {total_items}")
    print(f"  Total snack_swaps in DB: {total_swaps}")
    print(f"{'='*50}")

    # Show vector distribution
    cur.execute("""
        SELECT swap_vectors, COUNT(*)
        FROM snack_swaps
        WHERE is_active = 1 AND swap_vectors != ''
        GROUP BY swap_vectors
        ORDER BY COUNT(*) DESC
        LIMIT 20
    """)
    print("\nTop swap_vector combos:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    conn.close()

if __name__ == '__main__':
    main()
