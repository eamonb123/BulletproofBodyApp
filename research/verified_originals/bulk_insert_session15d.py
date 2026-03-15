#!/usr/bin/env python3
"""
Session 15d: Bulk insert alcohol (69), cereal/oatmeal (53), bottled coffee (23).
Restaurant items (Chinese, sushi, Indian, coffee chains) need separate restaurant-schema inserts.
"""

import sqlite3
import json
import re
import os

DB = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
BASE = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")

existing_items = {r[0] for r in conn.execute("SELECT id FROM snack_items")}
existing_swaps = {r[0] for r in conn.execute("SELECT id FROM snack_swaps")}

stats = {"items_added": 0, "items_skipped": 0, "swaps_added": 0, "swaps_skipped": 0}


def make_id(brand, name):
    clean = f"{brand}-{name}".lower()
    for ch in ["'", '"', "(", ")", ",", ".", "!", "&", "+", "/", ":", "%", "#", "@", "*"]:
        clean = clean.replace(ch, "")
    clean = re.sub(r'\s+', ' ', clean).strip().replace(" ", "-")
    clean = re.sub(r'-+', '-', clean)
    if len(clean) > 60:
        clean = clean[:60].rstrip("-")
    return clean


def insert_item(item_id, name, brand, serving, cal, prot, carbs, fat, fiber, sugar,
                item_category="grocery", item_subcategory="", source_url=""):
    if item_id in existing_items:
        stats["items_skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO snack_items
        (id, name, brand, serving, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
         item_category, item_subcategory, source_url,
         verified_calories, verified_protein_g, verified_carbs_g, verified_fat_g,
         verified_fiber_g, verified_sugar_g, verified_serving, verification_status)
        VALUES (?,?,?,?,?,?,?,?,?,?, ?,?,?, ?,?,?,?,?,?,?, 'confirmed')""",
        (item_id, name, brand, serving, cal, prot, carbs, fat, fiber, sugar,
         item_category, item_subcategory, source_url,
         cal, prot, carbs, fat, fiber, sugar, serving))
    existing_items.add(item_id)
    stats["items_added"] += 1
    return True


def insert_swap(swap_id, title, context, craving, rationale, orig_id, swap_item_id, vectors,
                swap_category="grocery"):
    if swap_id in existing_swaps:
        stats["swaps_skipped"] += 1
        return False
    if orig_id not in existing_items or swap_item_id not in existing_items:
        stats["swaps_skipped"] += 1
        return False
    conn.execute("""INSERT OR IGNORE INTO snack_swaps
        (id, title, context, craving, rationale, original_snack_id, swap_snack_id,
         swap_vectors, swap_category, is_active, rank)
        VALUES (?,?,?,?,?,?,?,?,?,1,1)""",
        (swap_id, title, context, craving, rationale, orig_id, swap_item_id, vectors, swap_category))
    existing_swaps.add(swap_id)
    stats["swaps_added"] += 1
    return True


def safe_float(val, default=0):
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


def load_json(filename):
    with open(os.path.join(BASE, filename)) as f:
        data = json.load(f)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict) and "brand" in item]
    if isinstance(data, dict):
        return data.get("products", data.get("items", []))
    return data


# ============================================================
# 1. ALCOHOL (grocery → beverage)
# ============================================================
print("=== ALCOHOL ===")
alcohol = load_json("spider_alcohol.json")

ipa_orig_id = None
regular_beer_id = None
margarita_id = None

for item in alcohol:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "beverage", item.get("source_url", ""))

    # Track baselines
    name_lower = name.lower()
    if "ipa" in name_lower and "lagunitas" in brand.lower() and not ipa_orig_id:
        ipa_orig_id = iid
    elif "budweiser" in name_lower and "zero" not in name_lower and not regular_beer_id:
        regular_beer_id = iid
    elif "margarita" in name_lower and "mix" not in name_lower and not margarita_id:
        margarita_id = iid

# Create beer swaps: IPA/regular → light beer
if ipa_orig_id:
    ipa_cal = 200
    for item in alcohol:
        name = item["product_name"].lower()
        notes = item.get("notes", "").lower()
        if "light" in name or "ultra" in name or "premier" in name or "silver" in name:
            swap_id = make_id(item["brand"], item["product_name"])
            swap_cal = safe_float(item["calories"])
            if swap_cal < ipa_cal - 30:
                sid = f"{swap_id}-beer-swap"
                insert_swap(sid, "Beer Upgrade",
                           "When you want a beer at dinner, happy hour, or watching the game",
                           "Beverage",
                           f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal vs ~200 cal IPA. Saves {int(ipa_cal - swap_cal)} cal per beer.",
                           ipa_orig_id, swap_id, "lower_cal,less_sugar")

# Create hard seltzer swaps vs regular beer
if regular_beer_id:
    beer_cal = 145
    for item in alcohol:
        name = item["product_name"].lower()
        if "seltzer" in name or "white claw" in name.lower() or "truly" in name or "high noon" in name:
            swap_id = make_id(item["brand"], item["product_name"])
            swap_cal = safe_float(item["calories"])
            if swap_cal < beer_cal - 20:
                sid = f"{swap_id}-seltzer-swap"
                insert_swap(sid, "Drink Upgrade",
                           "When you want an alcoholic drink",
                           "Beverage",
                           f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal vs {int(beer_cal)} cal beer.",
                           regular_beer_id, swap_id, "lower_cal,less_sugar")


# ============================================================
# 2. CEREAL & OATMEAL (grocery → cereal)
# ============================================================
print("=== CEREAL & OATMEAL ===")
cereal = load_json("spider_cereal_oatmeal.json")

frosted_flakes_id = None
quaker_instant_id = None

for item in cereal:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()
    cat = item.get("category", "").lower()

    # Determine subcategory
    if "oat" in name.lower() or "oatmeal" in name.lower() or "muesli" in name.lower() or "overnight" in name.lower():
        subcat = "cereal"  # oatmeal goes with cereal
    elif "cream of" in name.lower():
        subcat = "cereal"
    else:
        subcat = "cereal"

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", subcat, item.get("source_url", ""))

    if "frosted flakes" in name.lower() and not frosted_flakes_id:
        frosted_flakes_id = iid
    if "quaker" in brand.lower() and "original" in name.lower() and "instant" in name.lower() and not quaker_instant_id:
        quaker_instant_id = iid

# Create cereal swaps: sugary cereal → protein cereal
if frosted_flakes_id:
    ff_cal = 140
    for item in cereal:
        notes = item.get("notes", "").lower()
        name = item["product_name"].lower()
        prot = safe_float(item["protein_g"])
        if prot >= 10 and ("protein" in name or "magic spoon" in name or "catalina" in name or
                           "three wishes" in name or "kashi" in name or "highkey" in name or
                           "wonderworks" in name or "premier" in name):
            swap_id = make_id(item["brand"], item["product_name"])
            swap_cal = safe_float(item["calories"])
            sid = f"{swap_id}-cereal-swap"
            insert_swap(sid, "Cereal Upgrade",
                       "When you want cereal for breakfast",
                       "Cereal",
                       f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal / {int(prot)}g protein vs {int(ff_cal)} cal / 1g protein Frosted Flakes.",
                       frosted_flakes_id, swap_id, "higher_protein")


# ============================================================
# 3. BOTTLED COFFEE (grocery → beverage)
# ============================================================
print("=== BOTTLED COFFEE ===")
coffee = load_json("spider_bottled_coffee.json")

frappuccino_orig_id = None
for item in coffee:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "beverage", item.get("source_url", ""))

    if "frappuccino" in name.lower() and "mocha" in name.lower() and "light" not in name.lower() and not frappuccino_orig_id:
        frappuccino_orig_id = iid

# Create swaps: bottled frappuccino → low-cal options
if frappuccino_orig_id:
    frap_cal = 260
    for item in coffee:
        name = item["product_name"].lower()
        swap_id = make_id(item["brand"], item["product_name"])
        swap_cal = safe_float(item["calories"])
        if swap_cal < frap_cal - 50 and swap_cal > 0:
            sid = f"{swap_id}-coffee-swap"
            insert_swap(sid, "Bottled Coffee Upgrade",
                       "When you grab a coffee drink from the fridge at the store",
                       "Beverage",
                       f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal vs {int(frap_cal)} cal Frappuccino.",
                       frappuccino_orig_id, swap_id, "lower_cal,less_sugar")


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"BULK INSERT 15d COMPLETE")
print(f"{'='*50}")
print(f"Items added:   {stats['items_added']}")
print(f"Items skipped: {stats['items_skipped']} (already in DB)")
print(f"Swaps added:   {stats['swaps_added']}")
print(f"Swaps skipped: {stats['swaps_skipped']}")
print()

conn2 = sqlite3.connect(DB)
total_items = conn2.execute("SELECT COUNT(*) FROM snack_items").fetchone()[0]
grocery_items = conn2.execute("SELECT COUNT(*) FROM snack_items WHERE item_category='grocery'").fetchone()[0]
snack_items = conn2.execute("SELECT COUNT(*) FROM snack_items WHERE item_category='snack'").fetchone()[0]
total_swaps = conn2.execute("SELECT COUNT(*) FROM snack_swaps").fetchone()[0]
print(f"TOTAL ITEMS:  {total_items} ({grocery_items} grocery + {snack_items} snack)")
print(f"TOTAL SWAPS:  {total_swaps}")

print("\nGROCERY SUBCATEGORIES:")
for row in conn2.execute("SELECT item_subcategory, COUNT(*) FROM snack_items WHERE item_category='grocery' GROUP BY item_subcategory ORDER BY COUNT(*) DESC"):
    print(f"  {row[0] or '(empty)':25s} {row[1]}")
conn2.close()
