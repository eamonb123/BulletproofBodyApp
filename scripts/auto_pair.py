#!/usr/bin/env python3
"""
Auto-pair: When a new snack_item is inserted, automatically create swap pairs
to ALL items on the opposite side (hero<->enemy) within the same craving category.

Usage:
    from scripts.auto_pair import auto_pair_item
    auto_pair_item("my-new-item-id")

CLI:
    python3 scripts/auto_pair.py <item_id>
"""
import sqlite3
import os
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = str(ROOT / "bulletproof_body.db")

# Reuse constants from create_orphan_swap_pairs
CRAVING_TO_TITLE = {
    "Dairy": "Dairy Upgrade",
    "Beverage": "Drink Upgrade",
    "Cereal": "Cereal Upgrade",
    "Frozen Meal": "Frozen Meal Upgrade",
    "Pasta & Grain": "Grain Upgrade",
    "Spread": "Spread Upgrade",
    "Condiment": "Condiment Upgrade",
    "Sweetener": "Sweetener Upgrade",
    "Protein": "Protein Upgrade",
    "Bread & Wrap": "Bread Upgrade",
    "Frozen Fruit": "Smoothie Upgrade",
    "Creamer": "Creamer Upgrade",
    "Savory Cooking": "Cooking Upgrade",
    "Salty & Crunchy": "Snack Upgrade",
    "Frozen Treat": "Frozen Treat Upgrade",
    "Chewy/Gummy": "Sweet Snack Upgrade",
    "Chocolate Fix": "Chocolate Upgrade",
    "Sweet Crunch": "Bar Upgrade",
    "Creamy Dessert": "Dessert Upgrade",
    "Refreshing Drink": "Drink Upgrade",
    "Spicy Crunch": "Spicy Snack Upgrade",
    "Salty Crunch": "Snack Upgrade",
    "salty crunchy": "Snack Upgrade",
}

CRAVING_TO_CONTEXT = {
    "Dairy": "When you want something creamy and satisfying",
    "Beverage": "When you need a drink",
    "Cereal": "When you want a bowl of cereal",
    "Frozen Meal": "When you need a quick frozen meal",
    "Pasta & Grain": "When you want a carb base for your meal",
    "Spread": "When you want to spread something on toast or a snack",
    "Condiment": "When you want to add flavor to your food",
    "Sweetener": "When you need something sweet in your recipe",
    "Protein": "When you need a protein-packed option",
    "Bread & Wrap": "When you want bread or a wrap",
    "Frozen Fruit": "When you want a smoothie or frozen fruit",
    "Creamer": "When you want creamer in your coffee",
    "Savory Cooking": "When you need cooking oil or fat",
    "Salty & Crunchy": "When you want something salty and crunchy",
    "Frozen Treat": "When you want a frozen treat after dinner",
    "Chewy/Gummy": "When you want something chewy and sweet",
    "Chocolate Fix": "When you need a chocolate fix",
    "Sweet Crunch": "When you want a sweet crunchy snack or bar",
    "Creamy Dessert": "When you want a creamy dessert",
    "Refreshing Drink": "When you want a refreshing drink",
    "Spicy Crunch": "When you want something spicy and crunchy",
    "Salty Crunch": "When you want something salty and crunchy",
    "salty crunchy": "When you want something salty and crunchy",
}


def _make_swap_pair_id(hero_id, enemy_id, craving):
    """Generate a deterministic swap pair ID."""
    craving_slug = craving.lower().replace(" & ", "-").replace(" ", "-").replace("/", "-")
    # Use both item IDs for uniqueness
    hero_short = hero_id[:30]
    enemy_short = enemy_id[:30]
    return f"{hero_short}--{enemy_short}--{craving_slug}"


def _make_rationale(hero_name, hero_brand, hero_cal, hero_protein,
                    enemy_name, enemy_brand, enemy_cal, enemy_protein):
    """Generate a human-readable rationale."""
    cal_diff = enemy_cal - hero_cal
    hero_label = f"{hero_brand} {hero_name}" if hero_brand and hero_brand != "Generic" else hero_name
    enemy_label = f"{enemy_brand} {enemy_name}" if enemy_brand and enemy_brand != "Generic" else enemy_name

    parts = []
    if cal_diff > 0:
        parts.append(f"{hero_label} at {hero_cal} cal vs {enemy_label} at {enemy_cal} cal. Saves {cal_diff} cal")
    else:
        parts.append(f"{hero_label} at {hero_cal} cal vs {enemy_label} at {enemy_cal} cal")

    if hero_protein > enemy_protein:
        parts.append(f"with {hero_protein:.0f}g protein vs {enemy_protein:.0f}g")

    return ". ".join(parts) + "."


def auto_pair_item(item_id: str, conn=None) -> dict:
    """
    Auto-pair a snack_item with all opposite-side items in the same craving category.

    Args:
        item_id: The snack_items.id to pair
        conn: Optional existing connection (won't close if provided)

    Returns:
        dict with keys: paired (int), skipped (int), errors (list), item_craving (str), is_hero (bool)
    """
    own_conn = conn is None
    if own_conn:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row

    result = {"paired": 0, "skipped": 0, "errors": [], "item_craving": "", "is_hero": None}

    try:
        # Get the item
        item = conn.execute(
            "SELECT id, name, brand, calories, protein_g, item_category, swap_craving_category, is_hero "
            "FROM snack_items WHERE id = ?", (item_id,)
        ).fetchone()

        if not item:
            result["errors"].append(f"Item '{item_id}' not found in snack_items")
            return result

        craving = item["swap_craving_category"]
        is_hero = item["is_hero"]

        if not craving:
            result["errors"].append(f"Item '{item_id}' has no swap_craving_category. Set it first.")
            return result

        if is_hero is None:
            result["errors"].append(f"Item '{item_id}' has no is_hero classification. Set it first.")
            return result

        result["item_craving"] = craving
        result["is_hero"] = bool(is_hero)

        # Find all opposite-side items in the same craving category
        if is_hero:
            # This item is a hero → pair with all enemies
            opposites = conn.execute(
                "SELECT id, name, brand, calories, protein_g, item_category "
                "FROM snack_items "
                "WHERE swap_craving_category = ? AND is_hero = 0 AND is_active = 1 AND id != ?",
                (craving, item_id)
            ).fetchall()
        else:
            # This item is an enemy → pair with all heroes
            opposites = conn.execute(
                "SELECT id, name, brand, calories, protein_g, item_category "
                "FROM snack_items "
                "WHERE swap_craving_category = ? AND is_hero = 1 AND is_active = 1 AND id != ?",
                (craving, item_id)
            ).fetchall()

        # Get existing swap pairs involving this item
        existing_pairs = set()
        rows = conn.execute(
            "SELECT original_snack_id, swap_snack_id FROM snack_swaps "
            "WHERE original_snack_id = ? OR swap_snack_id = ?",
            (item_id, item_id)
        ).fetchall()
        for row in rows:
            existing_pairs.add((row["original_snack_id"], row["swap_snack_id"]))

        title = CRAVING_TO_TITLE.get(craving, f"{craving} Upgrade")
        context = CRAVING_TO_CONTEXT.get(craving, f"When you want a {craving.lower()}")

        for opp in opposites:
            if is_hero:
                # This is hero, opp is enemy
                hero_id = item_id
                enemy_id = opp["id"]
                original_snack_id = enemy_id   # enemy is the original
                swap_snack_id = hero_id        # hero is the swap
                hero_name, hero_brand, hero_cal, hero_protein = (
                    item["name"], item["brand"], item["calories"], item["protein_g"])
                enemy_name, enemy_brand, enemy_cal, enemy_protein = (
                    opp["name"], opp["brand"], opp["calories"], opp["protein_g"])
            else:
                # This is enemy, opp is hero
                hero_id = opp["id"]
                enemy_id = item_id
                original_snack_id = enemy_id
                swap_snack_id = hero_id
                hero_name, hero_brand, hero_cal, hero_protein = (
                    opp["name"], opp["brand"], opp["calories"], opp["protein_g"])
                enemy_name, enemy_brand, enemy_cal, enemy_protein = (
                    item["name"], item["brand"], item["calories"], item["protein_g"])

            # Skip if pair already exists (in either direction)
            if (original_snack_id, swap_snack_id) in existing_pairs:
                result["skipped"] += 1
                continue
            if (swap_snack_id, original_snack_id) in existing_pairs:
                result["skipped"] += 1
                continue

            swap_pair_id = _make_swap_pair_id(hero_id, enemy_id, craving)
            rationale = _make_rationale(
                hero_name, hero_brand, hero_cal, hero_protein,
                enemy_name, enemy_brand, enemy_cal, enemy_protein
            )
            # swap_category must be 'snack' or 'grocery' — use the item's category
            swap_category = item["item_category"]

            try:
                conn.execute("""
                    INSERT OR IGNORE INTO snack_swaps
                    (id, title, context, craving, rationale, original_snack_id, swap_snack_id,
                     display_order, is_active, rank, homepage_rank, swap_vectors, swap_category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 0, '', ?)
                """, (swap_pair_id, title, context, craving, rationale,
                      original_snack_id, swap_snack_id, swap_category))
                result["paired"] += 1
                existing_pairs.add((original_snack_id, swap_snack_id))
            except sqlite3.IntegrityError as e:
                result["skipped"] += 1

        conn.commit()

    except Exception as e:
        result["errors"].append(str(e))
    finally:
        if own_conn:
            conn.close()

    return result


def embed_item(item_id: str):
    """Re-embed a single item into ChromaDB after pairing."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    item = conn.execute(
        "SELECT id, name, brand, serving, calories, protein_g, carbs_g, fat_g, "
        "item_category, swap_craving_category, is_hero "
        "FROM snack_items WHERE id = ?", (item_id,)
    ).fetchone()
    conn.close()

    if not item:
        return None

    try:
        from scripts.embed_foods import embed_single_item
        doc_id = embed_single_item(
            item_type="snack_item",
            item_id=item["id"],
            name=item["name"],
            brand=item["brand"],
            calories=item["calories"],
            protein_g=item["protein_g"],
            carbs_g=item["carbs_g"],
            fat_g=item["fat_g"],
            serving=item["serving"],
            category=item["swap_craving_category"] or "",
            is_swap=1 if item["is_hero"] else 0,
        )
        return doc_id
    except Exception as e:
        print(f"Warning: Could not embed item {item_id}: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/auto_pair.py <item_id>")
        print("       python3 scripts/auto_pair.py <item_id> --embed")
        sys.exit(1)

    item_id = sys.argv[1]
    do_embed = "--embed" in sys.argv

    print(f"Auto-pairing item: {item_id}")
    result = auto_pair_item(item_id)

    print(f"  Craving: {result['item_craving']}")
    print(f"  Is Hero: {result['is_hero']}")
    print(f"  New pairs created: {result['paired']}")
    print(f"  Skipped (already exist): {result['skipped']}")
    if result["errors"]:
        print(f"  Errors: {result['errors']}")

    if do_embed:
        print(f"\n  Embedding into ChromaDB...")
        doc_id = embed_item(item_id)
        if doc_id:
            print(f"  Embedded as: {doc_id}")
        else:
            print(f"  Embedding failed")


if __name__ == "__main__":
    main()
