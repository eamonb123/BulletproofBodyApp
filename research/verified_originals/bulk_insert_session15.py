#!/usr/bin/env python3
"""
Session 15: Bulk insert ~427 products from 11 spider research files.
Handles varying JSON structures, deduplicates against existing DB,
creates swap pairs with computed vectors.
"""

import sqlite3
import json
import re
import os

DB = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/bulletproof_body.db"
BASE = "/Users/eamon.barkhordarian/ClaudeCodeProjects/EamonianLifeOS/BulletproofBodyApp/research/verified_originals"

conn = sqlite3.connect(DB)
conn.execute("PRAGMA journal_mode=WAL")

# Load existing IDs
existing_items = {r[0] for r in conn.execute("SELECT id FROM snack_items")}
existing_swaps = {r[0] for r in conn.execute("SELECT id FROM snack_swaps")}

stats = {"items_added": 0, "items_skipped": 0, "swaps_added": 0, "swaps_skipped": 0}


def make_id(brand, name):
    """Generate kebab-case ID from brand + product name."""
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
    """Insert a snack_item if it doesn't exist."""
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
    """Insert a swap pair if it doesn't exist."""
    if swap_id in existing_swaps:
        stats["swaps_skipped"] += 1
        return False
    # Verify both items exist
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


def compute_vectors(orig_cal, orig_prot, orig_fiber, orig_sugar, orig_fat,
                    swap_cal, swap_prot, swap_fiber, swap_sugar, swap_fat):
    """Compute swap vectors based on macro differences."""
    vectors = []
    if orig_cal - swap_cal >= 30:
        vectors.append("lower_cal")
    if swap_prot >= orig_prot * 1.5 and swap_prot - orig_prot >= 5:
        vectors.append("higher_protein")
    if swap_fiber - orig_fiber >= 3:
        vectors.append("higher_fiber")
    if orig_sugar - swap_sugar >= 10:
        vectors.append("less_sugar")
    return ",".join(vectors) if vectors else "lower_cal"


def load_json(filename):
    """Load JSON file, handling list or dict-with-items/products formats."""
    path = os.path.join(BASE, filename)
    with open(path) as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if "products" in data:
            return data["products"]
        if "items" in data:
            return data["items"]
    return data


def safe_float(val, default=0):
    """Safely convert to float."""
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


# ============================================================
# 1. NUT BUTTERS (grocery → spread)
# ============================================================
print("\n=== NUT BUTTERS ===")
nut_butters = load_json("spider_nut_butters.json")

# Create originals (baselines)
pb_originals = {}
pb_swaps = []
for item in nut_butters:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "")
    is_baseline = any(kw in notes.lower() for kw in ["baseline", "regular", "standard", "original peanut"])
    is_trap = "trap" in notes.lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "spread", item.get("source_url", ""))

    if is_baseline and not is_trap:
        pb_originals[iid] = item
    elif not is_baseline and not is_trap:
        pb_swaps.append((iid, item))

# Create swap pairs — use Jif as main original
jif_id = make_id("Jif", "Creamy Peanut Butter")
if jif_id not in existing_items:
    # Fallback: find any baseline
    jif_id = list(pb_originals.keys())[0] if pb_originals else None

if jif_id:
    jif_cal = 190  # standard PB cal
    for swap_id, item in pb_swaps:
        swap_cal = safe_float(item["calories"])
        if swap_cal < jif_cal - 20:  # meaningful savings
            vectors = compute_vectors(jif_cal, 7, 2, 3, 16,
                                      swap_cal, safe_float(item["protein_g"]),
                                      safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                                      safe_float(item["fat_g"]))
            sid = f"{swap_id}-pb-swap"
            insert_swap(sid, "Peanut Butter Upgrade",
                       "When you want peanut butter on toast, smoothies, or with apples",
                       "Spread",
                       f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal vs 190 cal regular PB. Saves {int(jif_cal - swap_cal)} cal per serving.",
                       jif_id, swap_id, vectors)

# Nutella swaps
nutella_id = make_id("Nutella", "Hazelnut Spread 2 tbsp")
# Check if Nutella exists with different ID
for eid in existing_items:
    if "nutella" in eid.lower():
        nutella_id = eid
        break

nutella_swaps = [i for i in nut_butters if "hazelnut" in i["product_name"].lower() and i["brand"] != "Nutella"]
for item in nutella_swaps:
    swap_id = make_id(item["brand"], item["product_name"])
    if swap_id in existing_items:
        sid = f"{swap_id}-nutella-swap"
        insert_swap(sid, "Nutella Upgrade",
                   "When you want chocolate hazelnut spread",
                   "Spread",
                   f"{item['brand']} at {int(item['calories'])} cal vs 200 cal Nutella.",
                   nutella_id, swap_id, "lower_cal,less_sugar")


# ============================================================
# 2. CHEESE (grocery → dairy)
# ============================================================
print("=== CHEESE ===")
cheese = load_json("spider_cheese.json")

# Group by cheese type for swap pairing
cheese_groups = {
    "string": {"baselines": [], "swaps": []},
    "shredded": {"baselines": [], "swaps": []},
    "sliced": {"baselines": [], "swaps": []},
    "cottage": {"baselines": [], "swaps": []},
    "cream": {"baselines": [], "swaps": []},
}

for item in cheese:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "dairy", item.get("source_url", ""))

    # Categorize
    name_lower = name.lower()
    if "string" in name_lower or "babybel" in name_lower or "cheese head" in name_lower:
        group = "string"
    elif "shredded" in name_lower:
        group = "shredded"
    elif "slice" in name_lower or "single" in name_lower or "ultra thin" in name_lower or "laughing cow" in name_lower or "velveeta" in name_lower:
        group = "sliced"
    elif "cottage" in name_lower:
        group = "cottage"
    elif "cream cheese" in name_lower or "whipped" in notes:
        group = "cream"
    else:
        continue

    is_baseline = any(kw in notes for kw in ["baseline", "whole milk", "regular", "full fat", "4%"])
    if is_baseline:
        cheese_groups[group]["baselines"].append((iid, item))
    else:
        cheese_groups[group]["swaps"].append((iid, item))

# Create swap pairs for each cheese group
for group_name, group in cheese_groups.items():
    if not group["baselines"]:
        continue
    orig_id, orig = group["baselines"][0]
    orig_cal = safe_float(orig["calories"])
    for swap_id, swap_item in group["swaps"]:
        swap_cal = safe_float(swap_item["calories"])
        if swap_cal < orig_cal - 10:
            vectors = compute_vectors(orig_cal, safe_float(orig["protein_g"]),
                                      safe_float(orig["fiber_g"]), safe_float(orig["sugar_g"]),
                                      safe_float(orig["fat_g"]),
                                      swap_cal, safe_float(swap_item["protein_g"]),
                                      safe_float(swap_item["fiber_g"]), safe_float(swap_item["sugar_g"]),
                                      safe_float(swap_item["fat_g"]))
            sid = f"{swap_id}-cheese-swap"
            craving_name = {"string": "Dairy", "shredded": "Dairy", "sliced": "Dairy",
                           "cottage": "Dairy", "cream": "Dairy"}[group_name]
            insert_swap(sid, f"{group_name.title()} Cheese Upgrade",
                       f"When you use {group_name} cheese",
                       craving_name,
                       f"{swap_item['brand']} {swap_item['product_name']} at {int(swap_cal)} cal vs {int(orig_cal)} cal. Saves {int(orig_cal - swap_cal)} cal.",
                       orig_id, swap_id, vectors)


# ============================================================
# 3. SAUCES & CONDIMENTS (grocery → condiment)
# ============================================================
print("=== SAUCES & CONDIMENTS ===")
sauces = load_json("spider_sauces_condiments.json")

# Group by sauce category
sauce_groups = {}
for item in sauces:
    cat = item.get("category", "Other")
    if cat not in sauce_groups:
        sauce_groups[cat] = {"baselines": [], "swaps": []}

    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    subcat = item.get("subcategory", "")

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "condiment", item.get("source_url", ""))

    if subcat == "regular" or "baseline" in item.get("notes", "").lower():
        sauce_groups[cat]["baselines"].append((iid, item))
    elif subcat == "swap" or any(kw in item.get("notes", "").lower() for kw in ["sugar free", "zero cal", "light", "lower", "reduced"]):
        sauce_groups[cat]["swaps"].append((iid, item))

for cat_name, group in sauce_groups.items():
    if not group["baselines"] or not group["swaps"]:
        continue
    orig_id, orig = group["baselines"][0]
    orig_cal = safe_float(orig["calories"])
    for swap_id, swap_item in group["swaps"]:
        swap_cal = safe_float(swap_item["calories"])
        if swap_cal < orig_cal - 5:
            vectors = compute_vectors(orig_cal, safe_float(orig["protein_g"]),
                                      safe_float(orig["fiber_g"]), safe_float(orig["sugar_g"]),
                                      safe_float(orig["fat_g"]),
                                      swap_cal, safe_float(swap_item["protein_g"]),
                                      safe_float(swap_item["fiber_g"]), safe_float(swap_item["sugar_g"]),
                                      safe_float(swap_item["fat_g"]))
            sid = f"{swap_id}-sauce-swap"
            insert_swap(sid, f"{cat_name} Upgrade",
                       f"When you use {cat_name.lower()}",
                       "Condiment",
                       f"{swap_item['brand']} {swap_item['product_name']} at {int(swap_cal)} cal vs {int(orig_cal)} cal {orig['brand']}. Saves {int(orig_cal - swap_cal)} cal per serving.",
                       orig_id, swap_id, vectors)


# ============================================================
# 4. SWEETENERS (grocery → sweetener)
# ============================================================
print("=== SWEETENERS ===")
sweeteners = load_json("spider_sweeteners.json")

sugar_orig_id = None
for item in sweeteners:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "sweetener", item.get("source_url", ""))

    cat = item.get("category", "")
    if "regular" in cat.lower() or "baseline" in item.get("notes", "").lower():
        if "granulated" in name.lower() or "cane sugar" in name.lower():
            sugar_orig_id = iid

# Create swaps for zero-cal sweeteners vs regular sugar
if sugar_orig_id:
    for item in sweeteners:
        cat = item.get("category", "")
        if "regular" in cat.lower():
            continue
        brand = item["brand"]
        name = item["product_name"]
        swap_id = make_id(brand, name)
        swap_cal = safe_float(item["calories"])
        if swap_cal <= 15:  # zero or near-zero cal
            sid = f"{swap_id}-sugar-swap"
            insert_swap(sid, "Sweetener Upgrade",
                       "When you need to sweeten coffee, baking, or food",
                       "Sweetener",
                       f"{brand} {name} at {int(swap_cal)} cal vs ~16 cal/tsp sugar. Zero-cal sweetener.",
                       sugar_orig_id, swap_id, "lower_cal,less_sugar")


# ============================================================
# 5. FROZEN MEALS (grocery → frozen_meal)
# ============================================================
print("=== FROZEN MEALS ===")
frozen = load_json("spider_frozen_meals.json")

frozen_orig_id = None
for item in frozen:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "frozen_meal", item.get("source_url", ""))

    if "baseline" in notes or brand in ["Stouffer's", "Marie Callender's", "Banquet"]:
        if not frozen_orig_id:
            frozen_orig_id = iid

if frozen_orig_id:
    frozen_orig_cal = conn.execute("SELECT calories FROM snack_items WHERE id=?", (frozen_orig_id,)).fetchone()
    if frozen_orig_cal:
        orig_cal = frozen_orig_cal[0]
        for item in frozen:
            brand = item["brand"]
            notes = item.get("notes", "").lower()
            if brand in ["Stouffer's", "Marie Callender's", "Banquet", "Hot Pockets"]:
                continue
            if "baseline" in notes:
                continue
            name = item["product_name"]
            swap_id = make_id(brand, name)
            swap_cal = safe_float(item["calories"])
            swap_prot = safe_float(item["protein_g"])
            if swap_cal < orig_cal - 30 or swap_prot >= 15:
                vectors = []
                if orig_cal - swap_cal >= 30:
                    vectors.append("lower_cal")
                if swap_prot >= 15:
                    vectors.append("higher_protein")
                sid = f"{swap_id}-frozen-swap"
                insert_swap(sid, "Frozen Meal Upgrade",
                           "When you need a quick frozen meal",
                           "Frozen Meal",
                           f"{brand} {name} at {int(swap_cal)} cal / {int(swap_prot)}g protein vs {int(orig_cal)} cal baseline.",
                           frozen_orig_id, swap_id, ",".join(vectors) or "lower_cal")


# ============================================================
# 6. HOT DOGS & SAUSAGE (grocery → protein)
# ============================================================
print("=== HOT DOGS & SAUSAGE ===")
hotdogs = load_json("spider_hotdogs_sausage.json")

hotdog_orig_id = None
for item in hotdogs:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "protein", item.get("source_url", ""))

    if "baseline" in notes or brand in ["Oscar Mayer", "Hebrew National", "Nathan's"]:
        if not hotdog_orig_id:
            hotdog_orig_id = iid

if hotdog_orig_id:
    hotdog_orig = conn.execute("SELECT calories, protein_g FROM snack_items WHERE id=?", (hotdog_orig_id,)).fetchone()
    if hotdog_orig:
        orig_cal, orig_prot = hotdog_orig
        for item in hotdogs:
            brand = item["brand"]
            notes = item.get("notes", "").lower()
            if "baseline" in notes or brand in ["Oscar Mayer", "Hebrew National", "Nathan's"]:
                continue
            name = item["product_name"]
            swap_id = make_id(brand, name)
            swap_cal = safe_float(item["calories"])
            swap_prot = safe_float(item["protein_g"])
            if swap_cal < orig_cal - 15 or swap_prot > orig_prot + 3:
                vectors = compute_vectors(orig_cal, orig_prot, 0, 0, 0,
                                          swap_cal, swap_prot, 0, 0, 0)
                sid = f"{swap_id}-hotdog-swap"
                insert_swap(sid, "Hot Dog / Sausage Upgrade",
                           "When you want hot dogs, brats, or sausage",
                           "Protein",
                           f"{brand} {name} at {int(swap_cal)} cal / {int(swap_prot)}g protein vs {int(orig_cal)} cal frank.",
                           hotdog_orig_id, swap_id, vectors)


# ============================================================
# 7. BUTTER & SPREADS (grocery → spread)
# ============================================================
print("=== BUTTER & SPREADS ===")
butters = load_json("spider_butter_spreads.json")

butter_orig_id = None
for item in butters:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    cat = item.get("category", "").lower()
    notes = item.get("notes", "").lower()

    subcat = "spread"
    if "cooking spray" in cat or "spray" in name.lower():
        subcat = "cooking_oil"
    elif "whipped" in cat.lower() or "topping" in name.lower() or "cool whip" in name.lower():
        subcat = "dairy"

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", subcat, item.get("source_url", ""))

    if "baseline" in notes or ("regular" in cat and "butter" in name.lower()):
        if not butter_orig_id and safe_float(item["calories"]) >= 90:
            butter_orig_id = iid

if butter_orig_id:
    butter_orig_cal = conn.execute("SELECT calories FROM snack_items WHERE id=?", (butter_orig_id,)).fetchone()
    if butter_orig_cal:
        orig_cal = butter_orig_cal[0]
        for item in butters:
            brand = item["brand"]
            cat = item.get("category", "").lower()
            notes = item.get("notes", "").lower()
            if "baseline" in notes and "regular" in cat:
                continue
            name = item["product_name"]
            swap_id = make_id(brand, name)
            swap_cal = safe_float(item["calories"])
            if swap_cal < orig_cal - 20:
                sid = f"{swap_id}-butter-swap"
                insert_swap(sid, "Butter / Oil Upgrade",
                           "When you need butter or oil for cooking/spreading",
                           "Spread",
                           f"{brand} {name} at {int(swap_cal)} cal vs {int(orig_cal)} cal butter.",
                           butter_orig_id, swap_id, "lower_cal")


# ============================================================
# 8. SAVORY SNACKS (snack category)
# ============================================================
print("=== SAVORY SNACKS ===")
savory = load_json("spider_savory_snacks_grocery.json")

# Find chip baselines
chip_orig_id = None
for item in savory:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()
    cat = item.get("category", "").lower()

    # These are SNACK items
    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "snack", "", item.get("source_url", ""))

    if brand == "Lay's" and "classic" in name.lower():
        chip_orig_id = iid

if chip_orig_id:
    chip_orig_cal = 160  # Lay's Classic per oz
    for item in savory:
        brand = item["brand"]
        notes = item.get("notes", "").lower()
        if brand in ["Lay's", "Doritos"]:
            continue
        name = item["product_name"]
        swap_id = make_id(brand, name)
        swap_cal = safe_float(item["calories"])
        swap_prot = safe_float(item["protein_g"])
        swap_fiber = safe_float(item["fiber_g"])
        if swap_cal < chip_orig_cal - 20 or swap_prot >= 4 or swap_fiber >= 4:
            vectors = compute_vectors(chip_orig_cal, 2, 1, 0, 10,
                                      swap_cal, swap_prot, swap_fiber,
                                      safe_float(item["sugar_g"]), safe_float(item["fat_g"]))
            sid = f"{swap_id}-snack-swap"
            insert_swap(sid, "Savory Snack Upgrade",
                       "When you want chips, crackers, or something crunchy",
                       "Salty & Crunchy",
                       f"{brand} {name} at {int(swap_cal)} cal vs 160 cal Lay's.",
                       chip_orig_id, swap_id, vectors, swap_category="snack")


# ============================================================
# 9. FROZEN PIZZA / YASSO / GRANOLA (mixed)
# ============================================================
print("=== FROZEN PIZZA / YASSO / GRANOLA ===")
frozen_pizza = load_json("spider_frozen_pizza_protein_meals.json")

pizza_orig_id = None
ice_cream_orig_id = None
granola_orig_id = None
fruit_bar_orig_id = None
breakfast_orig_id = None

for item in frozen_pizza:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    cat = item.get("_category", "").lower()
    notes = item.get("notes", "").lower()

    # Determine item_category and subcategory
    if "pizza" in cat:
        item_cat = "grocery"
        subcat = "frozen_meal"
    elif "yasso" in cat or "yogurt bar" in cat or "frozen" in cat:
        item_cat = "snack"
        subcat = ""
    elif "granola" in cat or "cereal" in cat:
        item_cat = "grocery"
        subcat = "cereal"
    elif "fruit bar" in cat or "that's it" in brand.lower() or "larabar" in brand.lower():
        item_cat = "snack"
        subcat = ""
    elif "breakfast" in cat or "jimmy dean" in brand.lower():
        item_cat = "grocery"
        subcat = "frozen_meal"
    else:
        item_cat = "grocery"
        subcat = "frozen_meal"

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                item_cat, subcat, item.get("source_url", ""))

    # Track baselines
    if "baseline" in notes:
        if "pizza" in cat and not pizza_orig_id:
            pizza_orig_id = iid
        elif ("ice cream" in cat or "frozen treat" in cat) and not ice_cream_orig_id:
            ice_cream_orig_id = iid
        elif "granola" in cat and not granola_orig_id:
            granola_orig_id = iid
        elif "fruit" in cat and not fruit_bar_orig_id:
            fruit_bar_orig_id = iid
        elif "breakfast" in cat and not breakfast_orig_id:
            breakfast_orig_id = iid

# Create pizza swaps
if pizza_orig_id:
    pizza_orig_cal = conn.execute("SELECT calories FROM snack_items WHERE id=?", (pizza_orig_id,)).fetchone()
    if pizza_orig_cal:
        orig_cal = pizza_orig_cal[0]
        for item in frozen_pizza:
            cat = item.get("_category", "").lower()
            if "pizza" not in cat:
                continue
            notes = item.get("notes", "").lower()
            if "baseline" in notes:
                continue
            swap_id = make_id(item["brand"], item["product_name"])
            swap_cal = safe_float(item["calories"])
            swap_prot = safe_float(item["protein_g"])
            if swap_cal < orig_cal - 30 or swap_prot >= 20:
                vectors = []
                if orig_cal - swap_cal >= 30:
                    vectors.append("lower_cal")
                if swap_prot >= 20:
                    vectors.append("higher_protein")
                sid = f"{swap_id}-pizza-swap"
                insert_swap(sid, "Frozen Pizza Upgrade",
                           "When you want frozen pizza",
                           "Frozen Meal",
                           f"{item['brand']} {item['product_name']} at {int(swap_cal)} cal / {int(swap_prot)}g protein.",
                           pizza_orig_id, swap_id, ",".join(vectors) or "lower_cal")

# Create Yasso / frozen treat swaps
for item in frozen_pizza:
    cat = item.get("_category", "").lower()
    if "yasso" not in item["brand"].lower():
        continue
    swap_id = make_id(item["brand"], item["product_name"])
    # These go to snack swaps against ice cream — skip if no baseline
    # They're already inserted as items, swap pairs can be made later


# ============================================================
# 10. MEAT SNACKS (snack category)
# ============================================================
print("=== MEAT SNACKS ===")
meat = load_json("spider_meat_snacks.json")

meat_chip_orig_id = chip_orig_id  # reuse Lay's as baseline
for item in meat:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()

    # Skip if it IS a baseline chip
    if brand in ["Lay's", "Doritos", "Pringles"]:
        insert_item(iid, name, brand, item["serving_size"],
                    safe_float(item["calories"]), safe_float(item["protein_g"]),
                    safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                    safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                    "snack", "", item.get("source_url", ""))
        if not meat_chip_orig_id:
            meat_chip_orig_id = iid
        continue

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "snack", "", item.get("source_url", ""))

    # Create swap vs chips
    if meat_chip_orig_id:
        swap_prot = safe_float(item["protein_g"])
        swap_cal = safe_float(item["calories"])
        if swap_prot >= 8:
            vectors = "higher_protein"
            if swap_cal < 160:
                vectors = "lower_cal,higher_protein"
            sid = f"{iid}-meat-swap"
            insert_swap(sid, "Protein Snack Upgrade",
                       "When you want something crunchy and savory",
                       "Salty & Crunchy",
                       f"{brand} {name} at {int(swap_cal)} cal / {int(swap_prot)}g protein vs 2g protein in chips.",
                       meat_chip_orig_id, iid, vectors, swap_category="snack")


# ============================================================
# 11. PROTEIN POWDER (grocery → supplement)
# ============================================================
print("=== PROTEIN POWDER ===")
powders = load_json("spider_protein_powder.json")

for item in powders:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                "grocery", "supplement", item.get("source_url", ""))
    # Protein powders are standalone (no swap pairs — they're ingredients, not replacements)


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"BULK INSERT COMPLETE")
print(f"{'='*50}")
print(f"Items added:   {stats['items_added']}")
print(f"Items skipped: {stats['items_skipped']} (already in DB)")
print(f"Swaps added:   {stats['swaps_added']}")
print(f"Swaps skipped: {stats['swaps_skipped']} (already in DB or missing items)")
print()

# Final counts
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

# Subcategory breakdown
print("GROCERY SUBCATEGORIES:")
for row in conn2.execute("SELECT item_subcategory, COUNT(*) FROM snack_items WHERE item_category='grocery' GROUP BY item_subcategory ORDER BY COUNT(*) DESC"):
    print(f"  {row[0] or '(empty)':25s} {row[1]}")

print("\nNEW SUBCATEGORIES INTRODUCED:")
for sub in ['frozen_meal', 'supplement', 'cereal']:
    count = conn2.execute("SELECT COUNT(*) FROM snack_items WHERE item_subcategory=?", (sub,)).fetchone()[0]
    if count > 0:
        print(f"  {sub:25s} {count}")

conn2.close()
