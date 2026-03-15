#!/usr/bin/env python3
"""
Session 15c: Bulk insert dried fruit spider (55 products).
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
                item_category="snack", item_subcategory="", source_url=""):
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
                swap_category="snack"):
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


# ============================================================
# DRIED FRUIT (snack category)
# ============================================================
print("=== DRIED FRUIT ===")

with open(os.path.join(BASE, "spider_dried_fruit.json")) as f:
    dried = json.load(f)

# Insert all items
dried_originals = {}  # traditional dried fruit (high cal baselines)
dried_swaps_list = []  # freeze-dried / better alternatives

for item in dried:
    brand = item["brand"]
    name = item["product_name"]
    iid = make_id(brand, name)
    notes = item.get("notes", "").lower()
    name_lower = name.lower()

    # Classify: fresh baselines are grocery (produce), everything else is snack
    if "fresh" in name_lower and "baseline" in name_lower:
        item_cat = "grocery"
        subcat = "frozen_fruit"  # closest existing subcategory
    else:
        item_cat = "snack"
        subcat = ""

    insert_item(iid, name, brand, item["serving_size"],
                safe_float(item["calories"]), safe_float(item["protein_g"]),
                safe_float(item["carbs_g"]), safe_float(item["fat_g"]),
                safe_float(item["fiber_g"]), safe_float(item["sugar_g"]),
                item_cat, subcat, item.get("source_url", ""))

    # Categorize for swap pairing
    if any(kw in name_lower for kw in ["freeze-dried", "freeze dried", "crispy fruit", "fruit crisps", "air-dried"]):
        dried_swaps_list.append((iid, item))
    elif any(kw in name_lower for kw in ["bare", "baked"]):
        dried_swaps_list.append((iid, item))
    elif "fresh" in name_lower and "baseline" in name_lower:
        pass  # skip fresh baselines for swap pairing
    elif any(kw in name_lower for kw in ["leather", "fruit snack", "yoyo", "roll"]):
        pass  # fruit snacks are their own thing
    elif any(kw in notes for kw in ["trap", "added sugar", "fried"]):
        dried_originals[iid] = item  # calorie trap = good original for swap
    elif safe_float(item["calories"]) >= 100:
        dried_originals[iid] = item  # high-cal dried fruit = original

# Create swap pairs: traditional dried fruit → freeze-dried alternatives
# Use the highest-cal dried fruit as primary originals
# Group by fruit type for better matching

# Primary originals by fruit type
fruit_type_originals = {}
for iid, item in dried_originals.items():
    name_lower = item["product_name"].lower()
    if "mango" in name_lower:
        fruit_type_originals.setdefault("mango", (iid, item))
    elif "apricot" in name_lower:
        fruit_type_originals.setdefault("apricot", (iid, item))
    elif "cranberr" in name_lower or "craisin" in name_lower:
        fruit_type_originals.setdefault("cranberry", (iid, item))
    elif "raisin" in name_lower:
        fruit_type_originals.setdefault("raisin", (iid, item))
    elif "banana" in name_lower:
        fruit_type_originals.setdefault("banana", (iid, item))
    elif "date" in name_lower:
        fruit_type_originals.setdefault("date", (iid, item))
    elif "peach" in name_lower:
        fruit_type_originals.setdefault("peach", (iid, item))
    elif "pineapple" in name_lower:
        fruit_type_originals.setdefault("pineapple", (iid, item))
    elif "cherry" in name_lower or "cherries" in name_lower:
        fruit_type_originals.setdefault("cherry", (iid, item))

# For each freeze-dried swap, find a matching dried original
for swap_id, swap_item in dried_swaps_list:
    swap_name = swap_item["product_name"].lower()
    swap_cal = safe_float(swap_item["calories"])

    # Find matching fruit type
    matched_orig = None
    for fruit_type, (orig_id, orig_item) in fruit_type_originals.items():
        if fruit_type in swap_name:
            matched_orig = (orig_id, orig_item)
            break

    # If no specific match, use a generic high-cal dried fruit
    if not matched_orig:
        # Use raisins or mango as generic baseline
        matched_orig = fruit_type_originals.get("mango") or fruit_type_originals.get("raisin")

    if matched_orig:
        orig_id, orig_item = matched_orig
        orig_cal = safe_float(orig_item["calories"])
        orig_sugar = safe_float(orig_item.get("sugar_g", 0))
        swap_sugar = safe_float(swap_item.get("sugar_g", 0))

        if swap_cal < orig_cal - 20:
            vectors = ["lower_cal"]
            if orig_sugar - swap_sugar >= 10:
                vectors.append("less_sugar")
            # Freeze-dried = slower eating (airy texture, can't shovel)
            if "freeze" in swap_name or "crispy" in swap_name or "air-dried" in swap_name:
                vectors.append("slower_eating")

            sid = f"{swap_id}-dried-fruit-swap"
            insert_swap(sid, "Dried Fruit Upgrade",
                       "When you want dried fruit for snacking or trail mix",
                       "Sweet Crunch",
                       f"{swap_item['brand']} {swap_item['product_name']} at {int(swap_cal)} cal vs {int(orig_cal)} cal {orig_item['product_name']}. Saves {int(orig_cal - swap_cal)} cal.",
                       orig_id, swap_id, ",".join(vectors))


# ============================================================
# COMMIT & REPORT
# ============================================================
conn.commit()
conn.close()

print(f"\n{'='*50}")
print(f"BULK INSERT 15c COMPLETE")
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
conn2.close()
