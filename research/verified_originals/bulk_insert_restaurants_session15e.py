#!/usr/bin/env python3
"""
Session 15e: Build 4 more cuisine-type restaurants + lean swap meals.
Thai, Vietnamese, Italian, Mexican, Steakhouse.
"""

import sqlite3
import json
import re
import os

DB = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
BASE = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")

stats = {"restaurants": 0, "ingredients": 0, "meals": 0, "skipped": 0}
existing_restaurants = {r[0] for r in conn.execute("SELECT id FROM restaurants")}
existing_ingredients = {r[0] for r in conn.execute("SELECT id FROM ingredients")}
existing_meals = {r[0] for r in conn.execute("SELECT id FROM template_meals")}


def make_id(prefix, name):
    clean = f"{prefix}_{name}".lower()
    for ch in ["'", '"', "(", ")", ",", ".", "!", "&", "+", "/", ":", "%", "#", "@", "*", "—", "–"]:
        clean = clean.replace(ch, "")
    clean = re.sub(r'\s+', ' ', clean).strip().replace(" ", "_")
    clean = re.sub(r'_+', '_', clean)
    if len(clean) > 60:
        clean = clean[:60].rstrip("_")
    return clean


def safe_float(val, default=0):
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


def create_restaurant(rid, name, cuisine, emoji, source):
    if rid in existing_restaurants:
        return False
    conn.execute("INSERT OR IGNORE INTO restaurants (id, name, cuisine, logo_emoji, nutrition_source) VALUES (?,?,?,?,?)",
        (rid, name, cuisine, emoji, source))
    existing_restaurants.add(rid)
    stats["restaurants"] += 1
    return True


def create_ingredient(iid, restaurant_id, name, portion, cal, fat, carbs, fiber, sugar, protein, source='llm'):
    if iid in existing_ingredients:
        stats["skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO ingredients
        (id, restaurant_id, name, portion_size, calories, total_fat_g, carbohydrate_g,
         dietary_fiber_g, sugar_g, protein_g, source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (iid, restaurant_id, name, portion, int(cal), fat, carbs, fiber, sugar, protein, source))
    existing_ingredients.add(iid)
    stats["ingredients"] += 1
    return True


def create_meal(mid, restaurant_id, name, description, meal_type, is_swap=False, swap_for=None,
                swap_rationale=None, source='llm', notes=None):
    if mid in existing_meals:
        return False
    conn.execute("""INSERT OR IGNORE INTO template_meals
        (id, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, source, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (mid, restaurant_id, name, description, meal_type, is_swap, swap_for, swap_rationale, source, notes))
    existing_meals.add(mid)
    stats["meals"] += 1
    return True


def link_meal_ingredient(meal_id, ingredient_id, quantity=1.0):
    try:
        conn.execute("INSERT OR IGNORE INTO template_meal_ingredients (template_meal_id, ingredient_id, quantity) VALUES (?,?,?)",
            (meal_id, ingredient_id, quantity))
    except:
        pass


def load_items(filename, items_key="items"):
    d = json.load(open(os.path.join(BASE, filename)))
    if isinstance(d, dict):
        return d.get(items_key, d.get("products", []))
    return [i for i in d if isinstance(i, dict) and ("dish_name" in i or "product_name" in i or "brand" in i)]


def get_name(item):
    return item.get("dish_name", item.get("product_name", item.get("drink_name", "Unknown")))


# ============================================================
# 1. THAI RESTAURANT
# ============================================================
print("=== THAI ===")
create_restaurant("thai", "Thai Restaurant (Generic)", "thai", "🍜",
                   "CalorieKing, FatSecret, USDA (estimated)")

for item in load_items("spider_thai_food.json"):
    name = get_name(item)
    iid = make_id("thai", name)
    create_ingredient(iid, "thai", name, item["serving_size"],
        safe_float(item["calories"]), safe_float(item["fat_g"]),
        safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
        safe_float(item["sugar_g"]), safe_float(item["protein_g"]))

# Original: Pad Thai + Green Curry + Thai Iced Tea
pad_thai = make_id("thai", "Pad Thai Chicken")
green_curry = make_id("thai", "Green Curry Chicken")
thai_tea = make_id("thai", "Thai Iced Tea")

orig = "thai_pad_thai_curry_combo"
create_meal(orig, "thai", "Pad Thai + Green Curry Combo",
    "Pad Thai + Green Curry + Thai Iced Tea", "combo",
    notes="~1,500 cal. Noodles + coconut curry + sweetened condensed milk tea.")
link_meal_ingredient(orig, pad_thai)
link_meal_ingredient(orig, green_curry)
link_meal_ingredient(orig, thai_tea)

# Lean: Larb + Tom Yum + Steamed Rice
larb = make_id("thai", "Larb Gai Chicken")
if larb not in existing_ingredients:
    larb = make_id("thai", "Larb Gai  Chicken Larb")
tom_yum = make_id("thai", "Tom Yum Goong Shrimp")
if tom_yum not in existing_ingredients:
    tom_yum = make_id("thai", "Tom Yum Soup Shrimp")
jasmine = make_id("thai", "Steamed Jasmine Rice")

lean = "thai_lean_larb_combo"
create_meal(lean, "thai", "Lean Larb + Tom Yum Combo",
    "Larb Gai + Tom Yum Soup + Steamed Jasmine Rice", "combo",
    is_swap=True, swap_for=orig,
    swap_rationale="Saves ~800 cal. Larb = lean minced meat with herbs. Tom Yum = clear broth not coconut. Skip the Thai tea.",
    notes="~700 cal, 50g+ protein.")
link_meal_ingredient(lean, larb)
link_meal_ingredient(lean, tom_yum)
link_meal_ingredient(lean, jasmine)


# ============================================================
# 2. VIETNAMESE
# ============================================================
print("=== VIETNAMESE ===")
create_restaurant("vietnamese", "Vietnamese Restaurant (Generic)", "vietnamese", "🍲",
                   "CalorieKing, FatSecret, USDA (estimated)")

for item in load_items("spider_vietnamese_food.json"):
    name = get_name(item)
    iid = make_id("viet", name)
    create_ingredient(iid, "vietnamese", name, item["serving_size"],
        safe_float(item["calories"]), safe_float(item["fat_g"]),
        safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
        safe_float(item["sugar_g"]), safe_float(item["protein_g"]))

# Original: Large Pho Dac Biet + Fried Egg Rolls + Viet Iced Coffee
pho_large = make_id("viet", "Pho Dac Biet Combination Large")
if pho_large not in existing_ingredients:
    pho_large = make_id("viet", "Pho Dac Biet  Combination  Large")
fried_rolls = make_id("viet", "Cha Gio Fried Egg Rolls 2 Pieces")
if fried_rolls not in existing_ingredients:
    fried_rolls = make_id("viet", "Cha Gio  Fried Egg Rolls  2 Pieces")
viet_coffee = make_id("viet", "Ca Phe Sua Da Vietnamese Iced Coffee")
if viet_coffee not in existing_ingredients:
    viet_coffee = make_id("viet", "Vietnamese Iced Coffee")

orig_v = "viet_pho_combo"
create_meal(orig_v, "vietnamese", "Pho Combo with Egg Rolls",
    "Large Pho Dac Biet + 2 Fried Egg Rolls + Vietnamese Iced Coffee", "combo",
    notes="~1,100 cal. Large pho + fried appetizer + sweetened coffee.")
link_meal_ingredient(orig_v, pho_large)
link_meal_ingredient(orig_v, fried_rolls)
link_meal_ingredient(orig_v, viet_coffee)

# Lean: Small Pho Ga + Fresh Spring Rolls + Black Coffee
pho_ga = make_id("viet", "Pho Ga Chicken Small")
if pho_ga not in existing_ingredients:
    pho_ga = make_id("viet", "Pho Ga  Chicken  Small")
fresh_rolls = make_id("viet", "Goi Cuon Fresh Spring Rolls Shrimp 2 Pieces")
if fresh_rolls not in existing_ingredients:
    fresh_rolls = make_id("viet", "Goi Cuon  Fresh Spring Rolls  Shrimp  2 Pieces")
black_coffee = make_id("viet", "Ca Phe Den Da Vietnamese Black Iced Coffee")
if black_coffee not in existing_ingredients:
    black_coffee = make_id("viet", "Vietnamese Black Iced Coffee")

lean_v = "viet_lean_pho_ga"
create_meal(lean_v, "vietnamese", "Lean Pho Ga Combo",
    "Small Chicken Pho + Fresh Spring Rolls + Black Iced Coffee", "combo",
    is_swap=True, swap_for=orig_v,
    swap_rationale="Saves ~600 cal. Small pho = less noodles. Chicken broth lighter than beef. Fresh rolls not fried. Black coffee = 5 cal vs 210 cal.",
    notes="~500 cal, 35g+ protein.")
link_meal_ingredient(lean_v, pho_ga)
link_meal_ingredient(lean_v, fresh_rolls)
link_meal_ingredient(lean_v, black_coffee)


# ============================================================
# 3. ITALIAN
# ============================================================
print("=== ITALIAN ===")
create_restaurant("italian", "Italian Restaurant (Generic)", "italian", "🍝",
                   "CalorieKing, FatSecret, USDA (estimated)")

for item in load_items("spider_italian_food.json"):
    name = get_name(item)
    iid = make_id("ital", name)
    create_ingredient(iid, "italian", name, item["serving_size"],
        safe_float(item["calories"]), safe_float(item["fat_g"]),
        safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
        safe_float(item["sugar_g"]), safe_float(item["protein_g"]))

# Original: Fettuccine Alfredo + Garlic Bread + Caesar Salad
fett_alf = make_id("ital", "Fettuccine Alfredo")
garlic_bread = make_id("ital", "Garlic Bread")
caesar = make_id("ital", "Caesar Salad")

orig_i = "italian_alfredo_dinner"
create_meal(orig_i, "italian", "Fettuccine Alfredo Dinner",
    "Fettuccine Alfredo + Garlic Bread (2 slices) + Caesar Salad", "dinner",
    notes="~2,000 cal. Cream sauce + butter bread + creamy dressing.")
link_meal_ingredient(orig_i, fett_alf)
link_meal_ingredient(orig_i, garlic_bread, 2.0)
link_meal_ingredient(orig_i, caesar)

# Lean: Chicken Piccata + Minestrone + House Salad
piccata = make_id("ital", "Chicken Piccata")
minestrone = make_id("ital", "Minestrone Soup")
house_salad = make_id("ital", "Italian House Salad")

lean_i = "italian_lean_piccata_dinner"
create_meal(lean_i, "italian", "Lean Chicken Piccata Dinner",
    "Chicken Piccata + Minestrone Soup + Italian House Salad (dressing on side)", "dinner",
    is_swap=True, swap_for=orig_i,
    swap_rationale="Saves ~1,200 cal. Piccata = lemon/caper sauce not cream. Minestrone = veggie broth. Dressing on side = fork-dip hack.",
    notes="~800 cal, 45g+ protein.")
link_meal_ingredient(lean_i, piccata)
link_meal_ingredient(lean_i, minestrone)
link_meal_ingredient(lean_i, house_salad)


# ============================================================
# 4. MEXICAN (sit-down)
# ============================================================
print("=== MEXICAN ===")
create_restaurant("mexican", "Mexican Restaurant (Generic)", "mexican", "🌮",
                   "CalorieKing, FatSecret, USDA (estimated)")

for item in load_items("spider_mexican_food.json"):
    name = get_name(item)
    iid = make_id("mex", name)
    create_ingredient(iid, "mexican", name, item["serving_size"],
        safe_float(item["calories"]), safe_float(item["fat_g"]),
        safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
        safe_float(item["sugar_g"]), safe_float(item["protein_g"]))

# Original: Loaded Nachos + Chicken Enchiladas + Mexican Rice + Refried Beans
nachos = make_id("mex", "Loaded Nachos")
enchiladas = make_id("mex", "Chicken Enchiladas 3 Piece")
if enchiladas not in existing_ingredients:
    enchiladas = make_id("mex", "Chicken Enchiladas")
mex_rice = make_id("mex", "Mexican Rice")
refried = make_id("mex", "Refried Beans")

orig_m = "mexican_enchilada_dinner"
create_meal(orig_m, "mexican", "Enchilada Dinner with Nachos",
    "Loaded Nachos + 3 Chicken Enchiladas + Mexican Rice + Refried Beans", "dinner",
    notes="~2,200 cal. Chips + cheese + cream sauce + fried beans.")
link_meal_ingredient(orig_m, nachos)
link_meal_ingredient(orig_m, enchiladas)
link_meal_ingredient(orig_m, mex_rice)
link_meal_ingredient(orig_m, refried)

# Lean: Chicken Fajitas (no tortillas) + Black Beans + Pico
fajitas = make_id("mex", "Chicken Fajitas Protein and Veggies Only")
if fajitas not in existing_ingredients:
    fajitas = make_id("mex", "Chicken Fajitas")
black_beans = make_id("mex", "Black Beans")
corn_tort = make_id("mex", "Corn Tortilla")
pico = make_id("mex", "Pico de Gallo")

lean_m = "mexican_lean_fajita_dinner"
create_meal(lean_m, "mexican", "Lean Fajita Dinner",
    "Chicken Fajitas (protein+veggies) + 2 Corn Tortillas + Black Beans + Pico", "dinner",
    is_swap=True, swap_for=orig_m,
    swap_rationale="Saves ~1,400 cal. Fajitas = grilled not fried. Corn tortilla = 60 cal vs flour 140. Black beans = more fiber, less fat than refried. Skip the nachos.",
    notes="~800 cal, 55g+ protein.")
link_meal_ingredient(lean_m, fajitas)
link_meal_ingredient(lean_m, corn_tort, 2.0)
link_meal_ingredient(lean_m, black_beans)
link_meal_ingredient(lean_m, pico)


# ============================================================
# 5. STEAKHOUSE
# ============================================================
print("=== STEAKHOUSE ===")
create_restaurant("steakhouse", "Steakhouse (Generic)", "steakhouse", "🥩",
                   "USDA FoodData Central, CalorieKing (estimated)")

for item in load_items("spider_steakhouse_food.json"):
    name = get_name(item)
    iid = make_id("steak", name)
    create_ingredient(iid, "steakhouse", name, item["serving_size"],
        safe_float(item["calories"]), safe_float(item["fat_g"]),
        safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
        safe_float(item["sugar_g"]), safe_float(item["protein_g"]))

# Original: Ribeye + Loaded Baked Potato + Caesar + Bread Basket
ribeye = make_id("steak", "Ribeye")
loaded_potato = make_id("steak", "Loaded Baked Potato")
caesar_stk = make_id("steak", "Caesar Salad")
bread_basket = make_id("steak", "Bread Basket with Butter")

orig_s = "steakhouse_ribeye_dinner"
create_meal(orig_s, "steakhouse", "Ribeye Steakhouse Dinner",
    "Ribeye (8oz) + Loaded Baked Potato + Caesar Salad + Bread Basket", "dinner",
    notes="~2,100 cal. Fattiest cut + loaded sides + bread.")
link_meal_ingredient(orig_s, ribeye)
link_meal_ingredient(orig_s, loaded_potato)
link_meal_ingredient(orig_s, caesar_stk)
link_meal_ingredient(orig_s, bread_basket)

# Lean: Filet + Asparagus + Side Salad (no bread)
filet = make_id("steak", "Filet Mignon")
asparagus = make_id("steak", "Grilled Asparagus")
side_salad = make_id("steak", "Side Salad")

lean_s = "steakhouse_lean_filet_dinner"
create_meal(lean_s, "steakhouse", "Lean Filet Mignon Dinner",
    "Filet Mignon (8oz) + Grilled Asparagus + Side Salad (dressing on side)", "dinner",
    is_swap=True, swap_for=orig_s,
    swap_rationale="Saves ~1,300 cal. Filet = leanest cut (440 vs 780 cal). Asparagus = ~40 cal. Skip bread basket. Dressing on side.",
    notes="~800 cal, 60g+ protein. 'Loin or round = lean.'")
link_meal_ingredient(lean_s, filet)
link_meal_ingredient(lean_s, asparagus)
link_meal_ingredient(lean_s, side_salad)


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"RESTAURANT BUILD 15e COMPLETE")
print(f"{'='*50}")
print(f"Restaurants created: {stats['restaurants']}")
print(f"Ingredients added:   {stats['ingredients']}")
print(f"Meals created:       {stats['meals']}")
print(f"Skipped (existing):  {stats['skipped']}")

conn2 = sqlite3.connect(DB)
total_r = conn2.execute("SELECT COUNT(*) FROM restaurants").fetchone()[0]
total_i = conn2.execute("SELECT COUNT(*) FROM ingredients").fetchone()[0]
total_m = conn2.execute("SELECT COUNT(*) FROM template_meals").fetchone()[0]
print(f"\nTOTAL: {total_r} restaurants, {total_i} ingredients, {total_m} meals")
print("\nALL CUISINE-TYPE RESTAURANTS:")
for rid in ["chinese_takeout", "sushi", "indian", "starbucks", "thai", "vietnamese", "italian", "mexican", "steakhouse"]:
    row = conn2.execute("SELECT r.name, COUNT(i.id) FROM restaurants r LEFT JOIN ingredients i ON i.restaurant_id=r.id WHERE r.id=?", (rid,)).fetchone()
    meals = conn2.execute("SELECT COUNT(*) FROM template_meals WHERE restaurant_id=?", (rid,)).fetchone()[0]
    if row and row[0]:
        print(f"  {row[0]:40s} {row[1]:3d} ingredients  {meals:2d} meals")
conn2.close()
