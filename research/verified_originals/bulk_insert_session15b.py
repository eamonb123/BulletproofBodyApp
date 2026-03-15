#!/usr/bin/env python3
"""
Session 15b: Bulk insert ~208 products from 5 spider research files.
Eggs, rice/grains, ground meat, Costco/TJ's, smoothie ingredients.
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
        # Skip metadata items (any dict without 'brand' key)
        return [item for item in data if isinstance(item, dict) and "brand" in item]
    if isinstance(data, dict):
        return data.get("products", data.get("items", []))
    return data


# ============================================================
# 1. EGGS & EGG PRODUCTS (grocery → eggs)
# ============================================================
print("=== EGGS & EGG PRODUCTS ===")
eggs = load_json("spider_eggs.json")

whole_egg_id = None
for item in eggs:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    # Determine subcategory
    name_lower = name.lower()
    if "wrap" in name_lower or "crepini" in name_lower:
        subcat = "bread_wrap"
    elif "waffle" in name_lower or "burrito" in name_lower or "egg'wich" in name_lower or "eggwich" in name_lower:
        subcat = "frozen_meal"
    elif "liquid" in name_lower or "egg white" in name_lower or "egg beaters" in name_lower:
        subcat = "dairy"  # liquid egg whites go with dairy
    else:
        subcat = "protein"

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", subcat, item.get("source_url", ""))

    if "whole egg" in name_lower and "usda" in brand.lower():
        whole_egg_id = iid

# Create swaps: whole egg → egg whites / liquid egg whites
if whole_egg_id:
    whole_egg_cal = 72
    for item in eggs:
        name = item["product_name"]
        notes = item.get("notes", "").lower()
        if "whole egg" in name.lower() or "hard-boiled" in name.lower():
            continue
        if "wrap" in name.lower() or "waffle" in name.lower() or "burrito" in name.lower() or "eggwich" in name.lower() or "egg'wich" in name.lower():
            continue
        if "just egg" in name.lower():
            continue  # not a protein upgrade
        swap_id = make_id(item["brand"], name)
        swap_cal = safe_float(item["calories"])
        swap_prot = safe_float(item["protein_g"])
        if swap_cal < whole_egg_cal and swap_prot >= 3:
            sid = f"{swap_id}-egg-swap"
            insert_swap(sid, "Egg Upgrade",
                       "When you make eggs for breakfast",
                       "Protein",
                       f"{item['brand']} {name} at {int(swap_cal)} cal / {int(swap_prot)}g protein per serving.",
                       whole_egg_id, swap_id, "lower_cal")


# ============================================================
# 2. RICE & GRAINS (grocery → pasta_grain)
# ============================================================
print("=== RICE & GRAINS ===")
rice = load_json("spider_rice_grains.json")

white_rice_id = None
for item in rice:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    cat = item.get("category", "").lower()
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "pasta_grain", item.get("source_url", ""))

    if "white" in name.lower() and "long grain" in name.lower() and not white_rice_id:
        white_rice_id = iid

# Create swaps: white rice → alternatives
if white_rice_id:
    rice_orig_cal = 205  # 1 cup white rice
    for item in rice:
        cat = item.get("category", "").lower()
        notes = item.get("notes", "").lower()
        name = item["product_name"]
        if "white rice" in name.lower() and "long grain" in name.lower():
            continue
        if "regular" in cat:
            continue  # skip other baseline rices
        swap_id = make_id(item["brand"], name)
        swap_cal = safe_float(item["calories"])
        swap_prot = safe_float(item["protein_g"])
        swap_fiber = safe_float(item["fiber_g"])

        if swap_cal < rice_orig_cal - 30 or swap_prot >= 8 or swap_fiber >= 5:
            vectors = []
            if rice_orig_cal - swap_cal >= 30:
                vectors.append("lower_cal")
            if swap_prot >= 8:
                vectors.append("higher_protein")
            if swap_fiber >= 5:
                vectors.append("higher_fiber")
            sid = f"{swap_id}-rice-swap"
            insert_swap(sid, "Rice / Grain Upgrade",
                       "When you need a base for bowls, stir-fry, or sides",
                       "Pasta & Grain",
                       f"{item['brand']} {name} at {int(swap_cal)} cal vs 205 cal white rice.",
                       white_rice_id, swap_id, ",".join(vectors) or "lower_cal")


# ============================================================
# 3. GROUND MEAT (grocery → protein)
# ============================================================
print("=== GROUND MEAT ===")
meat = load_json("spider_ground_meat.json")

beef_8020_id = None
for item in meat:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "protein", item.get("source_url", ""))

    if "80/20" in name and not beef_8020_id:
        beef_8020_id = iid

# Create swaps: 80/20 → leaner options
if beef_8020_id:
    beef_orig_cal = 287  # 80/20 per 4oz
    beef_orig_prot = 19
    for item in meat:
        name = item["product_name"]
        if "80/20" in name:
            continue
        if "70/30" in name:
            continue  # worse than baseline
        swap_id = make_id(item["brand"], name)
        swap_cal = safe_float(item["calories"])
        swap_prot = safe_float(item["protein_g"])

        if swap_cal < beef_orig_cal - 30 or swap_prot > beef_orig_prot + 5:
            vectors = []
            if beef_orig_cal - swap_cal >= 30:
                vectors.append("lower_cal")
            if swap_prot > beef_orig_prot + 5:
                vectors.append("higher_protein")
            sid = f"{swap_id}-meat-swap"
            insert_swap(sid, "Protein Upgrade",
                       "When you need ground meat for tacos, burgers, or bowls",
                       "Protein",
                       f"{item['brand']} {name} at {int(swap_cal)} cal / {int(swap_prot)}g protein vs 287 cal 80/20 beef.",
                       beef_8020_id, swap_id, ",".join(vectors) or "lower_cal")


# ============================================================
# 4. COSTCO & TRADER JOE'S (grocery → various subcategories)
# ============================================================
print("=== COSTCO & TRADER JOE'S ===")
stores = load_json("spider_costco_traderjoes.json")

for item in stores:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    # Infer subcategory from product
    name_lower = name.lower()
    if any(kw in name_lower for kw in ["chicken", "turkey", "salmon", "tuna", "beef", "bison", "patty", "burger", "meatball", "wonton", "dumpling"]):
        subcat = "precooked_protein"
    elif any(kw in name_lower for kw in ["shake", "protein drink", "core power", "premier", "muscle milk", "owyn", "fairlife"]):
        subcat = "beverage"
    elif any(kw in name_lower for kw in ["yogurt", "cottage cheese"]):
        subcat = "dairy"
    elif any(kw in name_lower for kw in ["bar", "protein bar"]):
        subcat = "snack"  # these go to snack category
    elif any(kw in name_lower for kw in ["cauliflower", "gnocchi", "stir fry"]):
        subcat = "pasta_grain"
    elif any(kw in name_lower for kw in ["peanut butter", "almond butter"]):
        subcat = "spread"
    elif any(kw in name_lower for kw in ["quinoa"]):
        subcat = "pasta_grain"
    elif any(kw in name_lower for kw in ["corn dog", "tikka", "orange chicken", "mac"]):
        subcat = "frozen_meal"
    elif any(kw in name_lower for kw in ["gone banana", "inner pea", "seaweed", "cheddar cheese"]):
        subcat = "snack"
    elif any(kw in name_lower for kw in ["egg"]):
        subcat = "protein"
    else:
        subcat = "precooked_protein"

    # Determine if snack or grocery
    item_cat = "snack" if subcat == "snack" else "grocery"
    if item_cat == "snack":
        subcat = ""  # snacks don't use subcategory

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                item_cat, subcat, item.get("source_url", ""))

# Costco/TJ's items are standalone recommendations, not swap pairs
# They're "if you shop here, grab these" — no originals to swap against


# ============================================================
# 5. SMOOTHIE INGREDIENTS (grocery → various)
# ============================================================
print("=== SMOOTHIE INGREDIENTS ===")
smoothie = load_json("spider_smoothie_ingredients.json")

for item in smoothie:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    cat = item.get("category", "").lower()
    notes = item.get("notes", "").lower()

    # Infer subcategory
    if "frozen fruit" in cat or "smoothie kit" in cat:
        subcat = "frozen_fruit"
    elif "greens" in cat:
        subcat = "supplement"
    elif "nut butter" in cat:
        subcat = "spread"
    elif "liquid base" in cat:
        subcat = "beverage"
    elif "mix-in" in cat or "booster" in cat:
        subcat = "supplement"
    elif "rtd" in cat or "protein shake" in cat or "ready-to-drink" in cat:
        subcat = "beverage"
    elif "yogurt" in cat:
        subcat = "dairy"
    else:
        subcat = "beverage"

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", subcat, item.get("source_url", ""))

# Create swap: OJ → better smoothie bases
oj_id = None
for item in smoothie:
    if "orange juice" in item["product_name"].lower():
        oj_id = make_id(item["brand"], item["product_name"])
        break

if oj_id and oj_id in existing_items:
    oj_cal = 112
    for item in smoothie:
        cat = item.get("category", "").lower()
        if "liquid base" not in cat:
            continue
        name = item["product_name"]
        if "orange juice" in name.lower():
            continue
        swap_id = make_id(item["brand"], name)
        swap_cal = safe_float(item["calories"])
        if swap_cal < oj_cal - 20:
            sid = f"{swap_id}-base-swap"
            insert_swap(sid, "Smoothie Base Upgrade",
                       "When blending a smoothie or protein shake",
                       "Beverage",
                       f"{item['brand']} {name} at {int(swap_cal)} cal vs 112 cal OJ per cup.",
                       oj_id, swap_id, "lower_cal,less_sugar")

# Create swap: Sambazon acai → regular frozen fruit
acai_id = None
for item in smoothie:
    if "sambazon" in item["brand"].lower() or "acai" in item["product_name"].lower():
        acai_id = make_id(item["brand"], item["product_name"])
        break

if acai_id and acai_id in existing_items:
    acai_cal = safe_float([i for i in smoothie if "sambazon" in i["brand"].lower()][0]["calories"])
    for item in smoothie:
        cat = item.get("category", "").lower()
        if "frozen fruit" not in cat:
            continue
        name = item["product_name"]
        if "acai" in name.lower() or "sambazon" in item["brand"].lower() or "pitaya" in name.lower():
            continue
        swap_id = make_id(item["brand"], name)
        swap_cal = safe_float(item["calories"])
        if swap_cal < acai_cal - 20:
            sid = f"{swap_id}-fruit-swap"
            insert_swap(sid, "Smoothie Fruit Upgrade",
                       "When adding fruit to smoothies or bowls",
                       "Frozen Fruit",
                       f"{item['brand']} {name} at {int(swap_cal)} cal vs {int(acai_cal)} cal acai per pack.",
                       acai_id, swap_id, "lower_cal,less_sugar")


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"BULK INSERT 15b COMPLETE")
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
grocery_swaps = conn2.execute("SELECT COUNT(*) FROM snack_swaps WHERE swap_category='grocery'").fetchone()[0]
snack_swaps = conn2.execute("SELECT COUNT(*) FROM snack_swaps WHERE swap_category='snack'").fetchone()[0]
print(f"TOTAL ITEMS:  {total_items} ({grocery_items} grocery + {snack_items} snack)")
print(f"TOTAL SWAPS:  {total_swaps} ({grocery_swaps} grocery + {snack_swaps} snack)")
print()

print("GROCERY SUBCATEGORIES:")
for row in conn2.execute("SELECT item_subcategory, COUNT(*) FROM snack_items WHERE item_category='grocery' GROUP BY item_subcategory ORDER BY COUNT(*) DESC"):
    print(f"  {row[0] or '(empty)':25s} {row[1]}")
conn2.close()
