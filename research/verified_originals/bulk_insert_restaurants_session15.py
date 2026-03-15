#!/usr/bin/env python3
"""
Session 15: Build 4 new cuisine-type restaurants from spider research.
Chinese Takeout, Sushi/Poke, Indian, Starbucks/Dunkin.
Each gets: restaurant entry + ingredients + template_meals (originals + lean swaps).
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
        stats["skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO restaurants
        (id, name, cuisine, logo_emoji, nutrition_source)
        VALUES (?,?,?,?,?)""",
        (rid, name, cuisine, emoji, source))
    existing_restaurants.add(rid)
    stats["restaurants"] += 1
    return True


def create_ingredient(iid, restaurant_id, name, portion, cal, fat, carbs, fiber, sugar, protein, category_id=None, source='llm'):
    if iid in existing_ingredients:
        stats["skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO ingredients
        (id, restaurant_id, name, portion_size, calories, total_fat_g, carbohydrate_g,
         dietary_fiber_g, sugar_g, protein_g, category_id, source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (iid, restaurant_id, name, portion, int(cal), fat, carbs, fiber, sugar, protein, category_id, source))
    existing_ingredients.add(iid)
    stats["ingredients"] += 1
    return True


def create_meal(mid, restaurant_id, name, description, meal_type, is_swap=False, swap_for=None,
                swap_rationale=None, source='llm', notes=None):
    if mid in existing_meals:
        stats["skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO template_meals
        (id, restaurant_id, name, description, meal_type, is_swap, swap_for,
         swap_rationale, source, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (mid, restaurant_id, name, description, meal_type, is_swap, swap_for,
         swap_rationale, source, notes))
    existing_meals.add(mid)
    stats["meals"] += 1
    return True


def link_meal_ingredient(meal_id, ingredient_id, quantity=1.0):
    try:
        conn.execute("""INSERT OR IGNORE INTO template_meal_ingredients
            (template_meal_id, ingredient_id, quantity)
            VALUES (?,?,?)""",
            (meal_id, ingredient_id, quantity))
    except:
        pass


# ============================================================
# 1. CHINESE TAKEOUT
# ============================================================
print("=== CHINESE TAKEOUT ===")
create_restaurant("chinese_takeout", "Chinese Takeout (Generic)", "chinese", "🥡",
                   "USDA FoodData Central, CalorieKing, FatSecret (estimated - local restaurants vary)")

chinese = json.load(open(os.path.join(BASE, "spider_chinese_takeout.json")))
chinese_items = chinese["items"]

for item in chinese_items:
    name = item["dish_name"]
    iid = make_id("chinese", name)
    create_ingredient(iid, "chinese_takeout", name, item["serving_size"],
                      safe_float(item["calories"]), safe_float(item["fat_g"]),
                      safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
                      safe_float(item["sugar_g"]), safe_float(item["protein_g"]),
                      source='llm')

# Create template meals — common orders (original) + lean swaps
# Original: General Tso's + Fried Rice
gen_tso_id = make_id("chinese", "General Tso's Chicken")
fried_rice_id = make_id("chinese", "Chicken Fried Rice")
egg_roll_id = make_id("chinese", "Egg Roll")

orig_meal_id = "chinese_general_tsos_combo"
create_meal(orig_meal_id, "chinese_takeout",
            "General Tso's Combo", "General Tso's Chicken + Fried Rice + Egg Roll",
            "combo", source='llm',
            notes="Typical Chinese takeout order. ~1,400 cal total.")
link_meal_ingredient(orig_meal_id, gen_tso_id)
link_meal_ingredient(orig_meal_id, fried_rice_id)
link_meal_ingredient(orig_meal_id, egg_roll_id)

# Lean swap: Chicken & Broccoli + Steamed Rice + Egg Drop Soup
chicken_broc_id = make_id("chinese", "Chicken and Broccoli")
steamed_rice_id = make_id("chinese", "White Steamed Rice")
egg_drop_id = make_id("chinese", "Egg Drop Soup")

lean_meal_id = "chinese_lean_chicken_broc"
create_meal(lean_meal_id, "chinese_takeout",
            "Lean Chicken & Broccoli Combo", "Chicken & Broccoli + Steamed Rice + Egg Drop Soup",
            "combo", is_swap=True, swap_for=orig_meal_id,
            swap_rationale="Saves ~700 cal. Same restaurant, same protein. Stir-fried instead of battered+fried. Steamed rice instead of fried. Soup instead of egg roll.",
            source='llm', notes="~700 cal total vs ~1,400 cal.")
link_meal_ingredient(lean_meal_id, chicken_broc_id)
link_meal_ingredient(lean_meal_id, steamed_rice_id)
link_meal_ingredient(lean_meal_id, egg_drop_id)

# Original: Orange Chicken + Lo Mein
orange_chk_id = make_id("chinese", "Orange Chicken")
lo_mein_id = make_id("chinese", "Chicken Lo Mein")

orig2_id = "chinese_orange_chicken_lo_mein"
create_meal(orig2_id, "chinese_takeout",
            "Orange Chicken + Lo Mein", "Orange Chicken with Chicken Lo Mein",
            "combo", source='llm',
            notes="~1,300 cal total. Double carb + deep fried.")
link_meal_ingredient(orig2_id, orange_chk_id)
link_meal_ingredient(orig2_id, lo_mein_id)

# Lean: Kung Pao Chicken + Steamed Rice
kung_pao_id = make_id("chinese", "Kung Pao Chicken")
lean2_id = "chinese_lean_kung_pao"
create_meal(lean2_id, "chinese_takeout",
            "Lean Kung Pao Combo", "Kung Pao Chicken + Steamed Rice",
            "combo", is_swap=True, swap_for=orig2_id,
            swap_rationale="Saves ~600 cal. Kung Pao is stir-fried not battered. Steamed rice instead of noodles.",
            source='llm', notes="~700 cal total.")
link_meal_ingredient(lean2_id, kung_pao_id)
link_meal_ingredient(lean2_id, steamed_rice_id)


# ============================================================
# 2. SUSHI / POKE
# ============================================================
print("=== SUSHI / POKE ===")
create_restaurant("sushi", "Sushi Restaurant (Generic)", "japanese", "🍣",
                   "CalorieKing, FatSecret, USDA (estimated - restaurants vary)")

sushi = json.load(open(os.path.join(BASE, "spider_sushi_poke.json")))
sushi_items = sushi["items"]

for item in sushi_items:
    name = item["dish_name"]
    iid = make_id("sushi", name)
    create_ingredient(iid, "sushi", name, item["serving_size"],
                      safe_float(item["calories"]), safe_float(item["fat_g"]),
                      safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
                      safe_float(item["sugar_g"]), safe_float(item["protein_g"]),
                      source='llm')

# Original: 2 specialty rolls + miso soup
dragon_id = make_id("sushi", "Dragon Roll")
shrimp_temp_id = make_id("sushi", "Shrimp Tempura Roll")
miso_id = make_id("sushi", "Miso Soup")

orig_sushi = "sushi_specialty_roll_dinner"
create_meal(orig_sushi, "sushi",
            "Specialty Roll Dinner", "Dragon Roll + Shrimp Tempura Roll + Miso Soup",
            "dinner", source='llm',
            notes="~1,100 cal. Tempura + mayo + eel sauce.")
link_meal_ingredient(orig_sushi, dragon_id)
link_meal_ingredient(orig_sushi, shrimp_temp_id)
link_meal_ingredient(orig_sushi, miso_id)

# Lean: Sashimi platter + edamame + miso
sashimi_id = make_id("sushi", "Assorted Sashimi Platter")
edamame_id = make_id("sushi", "Edamame")

lean_sushi = "sushi_lean_sashimi_dinner"
create_meal(lean_sushi, "sushi",
            "Lean Sashimi Dinner", "Assorted Sashimi Platter + Edamame + Miso Soup",
            "dinner", is_swap=True, swap_for=orig_sushi,
            swap_rationale="Saves ~650 cal. Sashimi = pure protein, no rice, no tempura, no mayo. Edamame adds fiber + protein.",
            source='llm', notes="~450 cal, 45g+ protein.")
link_meal_ingredient(lean_sushi, sashimi_id)
link_meal_ingredient(lean_sushi, edamame_id)
link_meal_ingredient(lean_sushi, miso_id)

# Original: Loaded Poke Bowl
loaded_poke_id = make_id("sushi", "Loaded Poke Bowl")
orig_poke = "sushi_loaded_poke_bowl"
create_meal(orig_poke, "sushi",
            "Loaded Poke Bowl", "Rice base, tuna, salmon, avocado, edamame, spicy mayo, eel sauce, crunchy toppings",
            "bowl", source='llm', notes="~1,050 cal.")
link_meal_ingredient(orig_poke, loaded_poke_id)

# Lean: Greens base poke
lean_poke_id = make_id("sushi", "Lean Poke Bowl Greens Base")
lean_poke = "sushi_lean_poke_bowl"
create_meal(lean_poke, "sushi",
            "Lean Poke Bowl", "Greens base, tuna, cucumber, edamame, ponzu sauce",
            "bowl", is_swap=True, swap_for=orig_poke,
            swap_rationale="Saves ~630 cal. Greens instead of rice, ponzu instead of spicy mayo, skip crunchy toppings.",
            source='llm', notes="~420 cal, 40g+ protein.")
link_meal_ingredient(lean_poke, lean_poke_id)


# ============================================================
# 3. INDIAN RESTAURANT
# ============================================================
print("=== INDIAN RESTAURANT ===")
create_restaurant("indian", "Indian Restaurant (Generic)", "indian", "🍛",
                   "USDA FoodData Central, FatSecret (estimated - restaurants vary, heavier on oil/cream)")

indian = json.load(open(os.path.join(BASE, "spider_indian_food.json")))
indian_items = indian["items"]

for item in indian_items:
    name = item.get("product_name", item.get("dish_name", "Unknown"))
    iid = make_id("indian", name)
    create_ingredient(iid, "indian", name, item["serving_size"],
                      safe_float(item["calories"]), safe_float(item["fat_g"]),
                      safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
                      safe_float(item["sugar_g"]), safe_float(item["protein_g"]),
                      source='llm')

# Original: Butter Chicken + Garlic Naan + Biryani Rice
butter_chk_id = make_id("indian", "Butter Chicken Murgh Makhani")
if butter_chk_id not in existing_ingredients:
    butter_chk_id = make_id("indian", "Butter Chicken")
garlic_naan_id = make_id("indian", "Garlic Naan")
biryani_rice_id = make_id("indian", "Biryani Rice")
mango_lassi_id = make_id("indian", "Mango Lassi")

orig_indian = "indian_butter_chicken_dinner"
create_meal(orig_indian, "indian",
            "Butter Chicken Dinner", "Butter Chicken + Garlic Naan + Biryani Rice + Mango Lassi",
            "dinner", source='llm',
            notes="~1,840 cal. Cream sauce + buttered bread + ghee rice + sugar drink.")
link_meal_ingredient(orig_indian, butter_chk_id)
link_meal_ingredient(orig_indian, garlic_naan_id)
link_meal_ingredient(orig_indian, biryani_rice_id)
link_meal_ingredient(orig_indian, mango_lassi_id)

# Lean: Tandoori Chicken + Dal + Roti + Raita
tandoori_id = make_id("indian", "Tandoori Chicken")
dal_id = make_id("indian", "Dal Tadka")
if dal_id not in existing_ingredients:
    dal_id = make_id("indian", "Dal Tadka Yellow Lentil Dal")
roti_id = make_id("indian", "Roti Chapati")
if roti_id not in existing_ingredients:
    roti_id = make_id("indian", "Roti  Chapati")
raita_id = make_id("indian", "Raita Yogurt Condiment")
if raita_id not in existing_ingredients:
    raita_id = make_id("indian", "Raita")

lean_indian = "indian_lean_tandoori_dinner"
create_meal(lean_indian, "indian",
            "Lean Tandoori Dinner", "Tandoori Chicken + Dal Tadka + 1 Roti + Raita",
            "dinner", is_swap=True, swap_for=orig_indian,
            swap_rationale="Saves ~930 cal. Tandoori = yogurt marinade not cream sauce. Roti = 120 cal vs 320 cal naan. Dal = high protein lentils. Skip the lassi.",
            source='llm', notes="~910 cal, 86g protein.")
link_meal_ingredient(lean_indian, tandoori_id)
link_meal_ingredient(lean_indian, dal_id)
link_meal_ingredient(lean_indian, roti_id)
link_meal_ingredient(lean_indian, raita_id)


# ============================================================
# 4. STARBUCKS
# ============================================================
print("=== STARBUCKS ===")
# Starbucks already exists in some DB configs, but let's check
if "starbucks" not in existing_restaurants:
    create_restaurant("starbucks", "Starbucks", "coffee", "☕",
                       "Official Starbucks Nutrition (starbucks.com)")

coffee = json.load(open(os.path.join(BASE, "spider_coffee_chains.json")))
coffee_items = coffee["restaurant_items"]

for item in coffee_items:
    brand = item.get("brand", "Starbucks")
    name = item.get("drink_name", item.get("product_name", "Unknown"))
    rid = "starbucks" if "starbucks" in brand.lower() else "dunkin"

    # Create Dunkin' restaurant if needed
    if rid == "dunkin" and "dunkin" not in existing_restaurants:
        # Dunkin already exists in DB, skip creation
        pass

    iid = make_id(rid, name)
    # Use actual restaurant ID (starbucks or dunkin)
    actual_rid = rid if rid in existing_restaurants else "starbucks"

    create_ingredient(iid, actual_rid, f"{brand} {name}", item.get("size", "Grande"),
                      safe_float(item["calories"]), safe_float(item["fat_g"]),
                      safe_float(item["carbs_g"]), safe_float(item["fiber_g"]),
                      safe_float(item["sugar_g"]), safe_float(item["protein_g"]),
                      source='eamon')  # Official published nutrition

# Starbucks meals: Frappuccino order → lean swap
caramel_frap_id = make_id("starbucks", "Caramel Frappuccino")
orig_sbux = "starbucks_caramel_frap_order"
create_meal(orig_sbux, "starbucks",
            "Caramel Frappuccino (Grande)", "The default sugary coffee order",
            "drink", source='eamon',
            notes="380 cal, 54g sugar. Basically a milkshake.")
link_meal_ingredient(orig_sbux, caramel_frap_id)

# Lean: Iced Shaken Espresso
iced_espresso_id = make_id("starbucks", "Iced Brown Sugar Oatmilk Shaken Espresso")
if iced_espresso_id not in existing_ingredients:
    iced_espresso_id = make_id("starbucks", "Iced Shaken Espresso Brown Sugar Oatmilk")

lean_sbux = "starbucks_lean_iced_espresso"
create_meal(lean_sbux, "starbucks",
            "Iced Shaken Espresso (Grande)", "Brown Sugar Oatmilk Shaken Espresso — the lean swap",
            "drink", is_swap=True, swap_for=orig_sbux,
            swap_rationale="Saves ~260 cal. Still sweet, still coffee, still cold. 120 cal vs 380 cal.",
            source='eamon', notes="120 cal, 13g sugar.")
link_meal_ingredient(lean_sbux, iced_espresso_id)


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"RESTAURANT BUILD COMPLETE")
print(f"{'='*50}")
print(f"Restaurants created: {stats['restaurants']}")
print(f"Ingredients added:   {stats['ingredients']}")
print(f"Meals created:       {stats['meals']}")
print(f"Skipped (existing):  {stats['skipped']}")
print()

conn2 = sqlite3.connect(DB)
total_restaurants = conn2.execute("SELECT COUNT(*) FROM restaurants").fetchone()[0]
total_ingredients = conn2.execute("SELECT COUNT(*) FROM ingredients").fetchone()[0]
total_meals = conn2.execute("SELECT COUNT(*) FROM template_meals").fetchone()[0]
print(f"TOTAL RESTAURANTS:  {total_restaurants}")
print(f"TOTAL INGREDIENTS:  {total_ingredients}")
print(f"TOTAL MEALS:        {total_meals}")
print()

print("NEW RESTAURANTS:")
for rid in ["chinese_takeout", "sushi", "indian", "starbucks"]:
    row = conn2.execute("SELECT r.name, COUNT(i.id) FROM restaurants r LEFT JOIN ingredients i ON i.restaurant_id = r.id WHERE r.id=?", (rid,)).fetchone()
    meals = conn2.execute("SELECT COUNT(*) FROM template_meals WHERE restaurant_id=?", (rid,)).fetchone()[0]
    if row:
        print(f"  {row[0]:35s} {row[1]} ingredients, {meals} meals")
conn2.close()
