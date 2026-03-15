#!/usr/bin/env python3
"""Bulk insert grocery swap alternatives from spider research files."""

import sqlite3
import json

DB = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
BASE = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

conn = sqlite3.connect(DB)

# Check existing swap IDs
existing = {r[0] for r in conn.execute("SELECT id FROM snack_items")}

def make_id(brand, name, suffix="swap"):
    """Generate kebab-case ID."""
    clean = f"{brand}-{name}".lower()
    for ch in ["'", '"', "(", ")", ",", ".", "!", "&", "+", "/"]:
        clean = clean.replace(ch, "")
    clean = clean.replace("  ", " ").strip().replace(" ", "-")
    # Truncate if too long
    if len(clean) > 50:
        clean = clean[:50]
    return f"{clean}-{suffix}"

def insert_item(item_id, name, brand, serving, cal, prot, carbs, fat, fiber, sugar, grams=0):
    if item_id in existing:
        return False
    conn.execute("""INSERT OR IGNORE INTO snack_items
        (id, name, brand, serving, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
         item_category, verified_calories, verified_protein_g, verified_carbs_g, verified_fat_g,
         verified_fiber_g, verified_sugar_g, verified_serving, verified_serving_grams, verification_status)
        VALUES (?,?,?,?,?,?,?,?,?,?, 'grocery', ?,?,?,?,?,?,?,?, 'confirmed')""",
        (item_id, name, brand, serving, cal, prot, carbs, fat, fiber, sugar,
         cal, prot, carbs, fat, fiber, sugar, serving, grams))
    existing.add(item_id)
    return True

def insert_swap(swap_id, title, context, craving, rationale, orig_id, swap_id_item, vectors):
    conn.execute("""INSERT OR IGNORE INTO snack_swaps
        (id, title, context, craving, rationale, original_snack_id, swap_snack_id,
         swap_vectors, swap_category, is_active, rank)
        VALUES (?,?,?,?,?,?,?,?, 'grocery', 1, 1)""",
        (swap_id, title, context, craving, rationale, orig_id, swap_id_item, vectors))

added_items = 0
added_swaps = 0

# ============================================================
# ALT MILKS → swap for milk-2percent-orig (122 cal)
# ============================================================
milks = [
    ("silk-cashew-unsweetened-swap", "Unsweetened Cashewmilk", "Silk", "1 cup (240ml)", 25, 1, 1, 2, 0, 0, 240),
    ("almond-breeze-unsweetened-swap", "Almond Breeze Unsweetened Original", "Blue Diamond", "1 cup (240ml)", 30, 1, 1, 2.5, 0, 0, 240),
    ("kirkland-almond-unsweetened-swap", "Organic Unsweetened Almond Milk", "Kirkland", "1 cup (240ml)", 30, 1, 1, 2.5, 0, 0, 240),
    ("califia-almond-unsweetened-swap", "Unsweetened Almondmilk", "Califia Farms", "1 cup (240ml)", 35, 1, 1, 3, 0, 0, 240),
    ("planet-oat-unsweetened-swap", "Unsweetened Original Oatmilk", "Planet Oat", "1 cup (240ml)", 40, 1, 9, 0.5, 0, 0, 240),
    ("ripple-unsweetened-swap", "Unsweetened Original Pea Milk", "Ripple", "1 cup (240ml)", 70, 8, 0, 4.5, 0, 0, 240),
]
for m in milks:
    if insert_item(*m): added_items += 1
    sid = m[0].replace("-swap", "") + "-milk-swap"
    insert_swap(sid, "Milk Upgrade", "When you need milk for cereal, smoothies, or coffee", "Dairy",
        f"{m[2]} {m[1]} at {m[4]} cal/cup vs 122 cal for 2% milk. Saves {122-m[4]} cal per cup.",
        "milk-2percent-orig", m[0], "lower_cal,less_sugar")
    added_swaps += 1

# ============================================================
# ALT RANCH → swap for ranch-dressing-orig (130 cal)
# ============================================================
ranches = [
    ("skinnygirl-ranch-swap", "Buttermilk Ranch Dressing", "Skinnygirl", "2 tbsp (30ml)", 10, 0, 2, 0, 0, 0, 30),
    ("bolthouse-ranch-swap", "Classic Ranch Yogurt Dressing", "Bolthouse Farms", "2 tbsp (30g)", 45, 1, 2, 3.5, 0, 1, 30),
    ("hiddenvalley-light-ranch-swap", "Thick & Creamy Light Ranch", "Hidden Valley", "2 tbsp (30ml)", 60, 0, 2, 6, 0, 1, 30),
    ("opa-litehouse-ranch-swap", "Ranch Greek Yogurt Dressing", "Opa by Litehouse", "2 tbsp (30ml)", 60, 2, 2, 5, 0, 1, 30),
    ("kraft-light-ranch-swap", "Light Done Right Ranch", "Kraft", "2 tbsp (32g)", 70, 0, 3, 6, 0, 1, 32),
]
for r in ranches:
    if insert_item(*r): added_items += 1
    sid = r[0].replace("-swap", "") + "-ranch-swap"
    insert_swap(sid, "Ranch Upgrade", "When you need ranch for salads or dipping", "Condiment",
        f"{r[2]} at {r[4]} cal vs 130 cal regular. Saves {130-r[4]} cal per serving.",
        "ranch-dressing-orig", r[0], "lower_cal")
    added_swaps += 1

# ============================================================
# ALT CREAMERS → swap for coffeemate-french-vanilla-orig (35 cal)
# ============================================================
creamers = [
    ("califia-betterhalf-swap", "Unsweetened Better Half", "Califia Farms", "1 tbsp (15ml)", 8, 0, 0, 1, 0, 0, 15),
    ("nutpods-original-swap", "Original Unsweetened Creamer", "Nutpods", "1 tbsp (15ml)", 10, 0, 0, 1, 0, 0, 15),
    ("nutpods-frenchvanilla-swap", "French Vanilla Unsweetened", "Nutpods", "1 tbsp (15ml)", 10, 0, 0, 1, 0, 0, 15),
    ("silk-zerosug-oat-creamer-swap", "Zero Sugar Vanilla Cinnamon Oat", "Silk", "1 tbsp (15ml)", 10, 0, 1, 0.5, 0, 0, 15),
    ("intldelight-zs-frenchvanilla-swap", "Zero Sugar French Vanilla", "International Delight", "1 tbsp (15ml)", 15, 0, 1, 1, 0, 0, 15),
    ("intldelight-zs-caramel-swap", "Zero Sugar Caramel Macchiato", "International Delight", "1 tbsp (15ml)", 15, 0, 1, 1, 0, 0, 15),
    ("splenda-sf-frenchvanilla-swap", "Sugar Free French Vanilla", "Splenda", "1 tbsp (15ml)", 15, 0, 1, 1, 0, 0, 15),
    ("chobani-zs-sweetcream-swap", "Zero Sugar Sweet Cream", "Chobani", "1 tbsp (15ml)", 20, 0, 2, 1, 0, 0, 15),
]
for c in creamers:
    if insert_item(*c): added_items += 1
    sid = c[0].replace("-swap", "") + "-creamer-swap"
    insert_swap(sid, "Creamer Upgrade", "When you need flavored creamer for morning coffee", "Creamer",
        f"{c[2]} {c[1]} at {c[4]} cal/tbsp vs 35 cal regular. At 3 tbsp/day saves {(35-c[4])*3} cal daily.",
        "coffeemate-french-vanilla-orig", c[0], "lower_cal,less_sugar")
    added_swaps += 1

# ============================================================
# ALT BAGELS → swap for sara-plain-bagel-orig (240 cal)
# ============================================================
bagels = [
    ("thinslim-plain-bagel-swap", "Love-The-Taste Plain Bagel", "ThinSlim Foods", "1 bagel (57g)", 90, 14, 13, 2, 7, 0, 57),
    ("carbonaut-plain-bagel-swap", "Gluten Free Plain Bagel", "Carbonaut", "1 bagel (67g)", 90, 2, 17, 5, 12, 0, 67),
    ("greatlowcarb-plain-bagel-swap", "Plain Low Carb Bagel", "Great Low Carb Bread Co", "1 bagel", 65, 12, 13, 1.5, 7, 0, 0),
    ("schmidt-647-bagel-swap", "647 Plain Bagel", "Schmidt Old Tyme", "1 bagel (94g)", 160, 8, 29, 3, 6, 3, 94),
]
for b in bagels:
    if insert_item(*b): added_items += 1
    sid = b[0].replace("-swap", "") + "-bagel-swap"
    insert_swap(sid, "Bagel Upgrade", "When you want a bagel for breakfast", "Bread & Wrap",
        f"{b[2]} at {b[4]} cal vs 240 cal Sara Lee. Saves {240-b[4]} cal per bagel.",
        "sara-plain-bagel-orig", b[0], "lower_cal,higher_protein" if b[5] >= 8 else "lower_cal")
    added_swaps += 1

# Low-cal bread options (need a bread original first)
insert_item("bread-regular-orig", "Regular White Bread", "Generic", "2 slices", 140, 4, 26, 2, 1, 3, 56)

breads = [
    ("royo-30cal-bread-swap", "30 Calorie Artisan Bread", "ROYO", "1 slice", 30, 3, 7, 0.5, 3, 0, 0),
    ("schmidt-647-bread-swap", "647 Wheat Bread", "Schmidt Old Tyme", "1 slice", 40, 2, 9, 1, 2, 1, 0),
    ("saralee-delightful-bread-swap", "Delightful Honey Whole Wheat", "Sara Lee", "1 slice", 45, 3, 10, 0.5, 3, 2, 0),
    ("naturesown-40cal-bread-swap", "Life 40 Calorie Honey Wheat", "Nature's Own", "1 slice", 40, 2.5, 10, 0.5, 3, 2, 0),
    ("outteraisle-cauliflower-swap", "Cauliflower Sandwich Thins", "Outer Aisle", "1 piece", 50, 4, 3, 3, 1, 1, 0),
]
for b in breads:
    if insert_item(*b): added_items += 1
    sid = b[0].replace("-swap", "") + "-bread-swap"
    insert_swap(sid, "Bread Upgrade", "When you need bread for sandwiches or toast", "Bread & Wrap",
        f"{b[2]} at {b[4]} cal/slice vs 70 cal regular. Use 2 slices = {b[4]*2} cal vs 140.",
        "bread-regular-orig", b[0], "lower_cal")
    added_swaps += 1

# ============================================================
# ALT PASTA → swap for linguine-orig (200 cal/56g)
# ============================================================
pastas = [
    ("miracle-noodle-swap", "Angel Hair Shirataki Noodles", "Miracle Noodle", "85g prepared", 5, 0, 1, 0, 2, 0, 85),
    ("itsskinny-spaghetti-swap", "Konjac Spaghetti", "It's Skinny", "125g prepared", 5, 0, 2, 0, 2, 0, 125),
    ("nasoya-shirataki-swap", "Pasta Zero Shirataki Spaghetti", "Nasoya", "113g prepared", 20, 0, 4, 0, 2, 0, 113),
    ("palmini-linguine-swap", "Hearts of Palm Linguine", "Palmini", "75g prepared", 20, 2, 4, 0, 2, 0, 75),
    ("banza-spaghetti-swap", "Chickpea Spaghetti", "Banza", "56g dry", 190, 11, 32, 3.5, 5, 1, 56),
    ("barilla-proteinplus-swap", "Protein+ Spaghetti", "Barilla", "56g dry", 190, 10, 38, 2, 4, 2, 56),
    ("explore-edamame-swap", "Organic Edamame Spaghetti", "Explore Cuisine", "56g dry", 190, 24, 20, 3, 12, 3, 56),
    ("tolerant-lentil-swap", "Organic Red Lentil Penne", "Tolerant", "56g dry", 200, 14, 33, 1.5, 4, 1, 56),
    ("chickapea-pasta-swap", "Organic Chickpea Lentil Pasta", "Chickapea", "56g dry", 210, 13, 36, 3, 6, 1, 56),
]
for p in pastas:
    if insert_item(*p): added_items += 1
    sid = p[0].replace("-swap", "") + "-pasta-swap"
    vectors = "lower_cal" if p[4] < 100 else ("higher_protein" if p[5] >= 10 else "lower_cal")
    insert_swap(sid, "Pasta Upgrade", "When you want pasta for dinner", "Pasta & Grain",
        f"{p[2]} {p[1]} at {p[4]} cal. {'Near-zero cal replacement.' if p[4] < 30 else f'{p[5]}g protein per serving.'}",
        "linguine-orig", p[0], vectors)
    added_swaps += 1

# ============================================================
# ALT TORTILLAS → swap for mission-large-tortilla-orig (210 cal)
# ============================================================
tortillas = [
    ("egglife-eggwhite-wrap-swap", "Original Egg White Wraps", "Egglife", "1 wrap (28g)", 25, 5, 0, 0, 0, 0, 28),
    ("labanderita-zeronet-swap", "Carb Counter Zero Net Carbs", "La Banderita", "1 tortilla (42g)", 60, 4, 17, 2, 15, 0, 42),
    ("tumaros-carbwise-swap", "Carb Wise Premium White Wraps", "Tumaro's", "1 wrap (40g)", 60, 5, 12, 2, 8, 0, 40),
    ("traderjoes-carbsavvy-swap", "Carb Savvy Tortillas", "Trader Joe's", "1 tortilla (28g)", 45, 3, 7, 1.5, 4, 0, 28),
    ("mission-carbbalance-taco-swap", "Carb Balance Soft Taco", "Mission", "1 tortilla (42g)", 70, 6, 19, 2.5, 15, 0, 42),
    ("mission-carbbalance-burrito-swap", "Carb Balance Burrito Size", "Mission", "1 tortilla (63g)", 110, 10, 27, 4, 21, 0, 63),
]
for t in tortillas:
    if insert_item(*t): added_items += 1
    sid = t[0].replace("-swap", "") + "-tortilla-swap"
    insert_swap(sid, "Tortilla Upgrade", "When you need a wrap for tacos, burritos, or quesadillas", "Bread & Wrap",
        f"{t[2]} at {t[4]} cal vs 210 cal Mission. Saves {210-t[4]} cal per tortilla.",
        "mission-large-tortilla-orig", t[0], "lower_cal,higher_fiber" if t[8] >= 5 else "lower_cal")
    added_swaps += 1

conn.commit()
conn.close()

print(f"\nDone! Added {added_items} new items and {added_swaps} new swap pairs.")
print(f"Total grocery items now in DB:")

import sqlite3
conn2 = sqlite3.connect(DB)
total_items = conn2.execute("SELECT COUNT(*) FROM snack_items WHERE item_category='grocery'").fetchone()[0]
total_swaps = conn2.execute("SELECT COUNT(*) FROM snack_swaps WHERE swap_category='grocery'").fetchone()[0]
print(f"  Grocery items: {total_items}")
print(f"  Grocery swaps: {total_swaps}")
conn2.close()
