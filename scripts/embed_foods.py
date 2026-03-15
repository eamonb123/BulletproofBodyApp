#!/usr/bin/env python3
"""
Embed all food items (snacks + template meals) into ChromaDB for semantic search.

Reads from bulletproof_body.db, embeds using OpenAI text-embedding-3-small,
stores in ChromaDB persistent collection 'food_items'.

Idempotent — safe to re-run (uses upsert).
"""

import sqlite3
import os
import sys
import json
from pathlib import Path

from dotenv import load_dotenv
import chromadb
from openai import OpenAI

# Paths
ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "bulletproof_body.db"
CHROMA_PATH = str(ROOT / "chroma_db")
ENV_PATH = ROOT.parent / ".env"

load_dotenv(ENV_PATH)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY not found in .env")
    sys.exit(1)

openai_client = OpenAI(api_key=OPENAI_API_KEY)
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_snack_items(conn):
    """Fetch all snack items with swap craving category if available."""
    rows = conn.execute("""
        SELECT
            si.id, si.name, si.brand, si.serving,
            si.calories, si.protein_g, si.carbs_g, si.fat_g,
            si.item_category, si.has_personal_size,
            -- Check if this item is a swap target
            CASE WHEN EXISTS(
                SELECT 1 FROM snack_swaps ss WHERE ss.swap_snack_id = si.id AND ss.is_active = 1
            ) THEN 1 ELSE 0 END AS is_swap,
            -- Get craving category from snack_swaps (as original or swap)
            (SELECT GROUP_CONCAT(DISTINCT ss.craving)
             FROM snack_swaps ss
             WHERE (ss.swap_snack_id = si.id OR ss.original_snack_id = si.id)
               AND ss.is_active = 1
            ) AS craving_categories
        FROM snack_items si
        WHERE si.is_active = 1
    """).fetchall()
    return rows


def fetch_template_meals(conn):
    """Fetch all template meals with computed nutrition (where available)."""
    # Meals WITH ingredient-level nutrition
    meals_with_nutrition = conn.execute("""
        SELECT
            tm.id, tm.name, tm.description, tm.is_swap, tm.meal_type,
            r.name AS restaurant_name,
            ROUND(SUM(i.calories * tmi.quantity)) AS total_calories,
            ROUND(SUM(i.protein_g * tmi.quantity), 1) AS total_protein_g,
            ROUND(SUM(i.carbohydrate_g * tmi.quantity), 1) AS total_carbs_g,
            ROUND(SUM(i.total_fat_g * tmi.quantity), 1) AS total_fat_g,
            1 AS has_nutrition
        FROM template_meals tm
        JOIN restaurants r ON r.id = tm.restaurant_id
        JOIN template_meal_ingredients tmi ON tmi.template_meal_id = tm.id
        JOIN ingredients i ON i.id = tmi.ingredient_id
        GROUP BY tm.id
    """).fetchall()

    # Meals WITHOUT ingredient-level nutrition
    meal_ids_with = {r["id"] for r in meals_with_nutrition}

    meals_without_nutrition = conn.execute("""
        SELECT
            tm.id, tm.name, tm.description, tm.is_swap, tm.meal_type,
            r.name AS restaurant_name
        FROM template_meals tm
        JOIN restaurants r ON r.id = tm.restaurant_id
    """).fetchall()

    meals_without = [r for r in meals_without_nutrition if r["id"] not in meal_ids_with]

    return meals_with_nutrition, meals_without


def fetch_food_items(conn):
    """Fetch all food items (takeout/restaurant entries)."""
    rows = conn.execute("""
        SELECT id, name, restaurant, cuisine, category, calories, protein_g,
               carbs_g, fat_g, fiber_g, serving, emoji
        FROM food_items
    """).fetchall()
    return rows


def build_food_item_text(row):
    """Build embedding text for a takeout/restaurant food item."""
    parts = []
    if row["restaurant"]:
        parts.append(row["restaurant"])
    parts.append(row["name"])
    if row["serving"]:
        parts.append(f"- {row['serving']}")
    parts.append(f"- {row['calories']} cal, {row['protein_g']}g protein, {row['carbs_g']}g carbs, {row['fat_g']}g fat")
    if row["cuisine"]:
        parts.append(f"- Cuisine: {row['cuisine']}")
    if row["category"] and row["category"] != "takeout":
        parts.append(f"- Category: {row['category']}")
    return " ".join(parts)


def build_snack_text(row):
    """Build embedding text for a snack item."""
    parts = []
    if row["brand"]:
        parts.append(row["brand"])
    parts.append(row["name"])
    if row["serving"]:
        parts.append(f"- {row['serving']}")
    parts.append(f"- {row['calories']} cal, {row['protein_g']}g protein, {row['carbs_g']}g carbs, {row['fat_g']}g fat")
    if row["craving_categories"]:
        parts.append(f"- Category: {row['craving_categories']}")
    if row["item_category"] and row["item_category"] != "snack":
        parts.append(f"- Type: {row['item_category']}")
    return " ".join(parts)


def build_meal_text_with_nutrition(row):
    """Build embedding text for a template meal with nutrition data."""
    parts = [row["restaurant_name"], row["name"]]
    if row["description"]:
        parts.append(f"- {row['description']}")
    parts.append(
        f"- {int(row['total_calories'])} cal, "
        f"{row['total_protein_g']}g protein, "
        f"{row['total_carbs_g']}g carbs, "
        f"{row['total_fat_g']}g fat"
    )
    if row["meal_type"]:
        parts.append(f"- Meal type: {row['meal_type']}")
    return " ".join(parts)


def build_meal_text_without_nutrition(row):
    """Build embedding text for a template meal without nutrition data."""
    parts = [row["restaurant_name"], row["name"]]
    if row["description"]:
        parts.append(f"- {row['description']}")
    if row["meal_type"]:
        parts.append(f"- Meal type: {row['meal_type']}")
    return " ".join(parts)


def embed_batch(texts):
    """Embed a batch of texts using OpenAI."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


def main():
    conn = get_db()

    # Setup ChromaDB
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(
        "food_items",
        metadata={"hnsw:space": "cosine"},
    )

    # ---- Snack Items ----
    snack_rows = fetch_snack_items(conn)
    print(f"Found {len(snack_rows)} active snack items")

    snack_ids = []
    snack_texts = []
    snack_metadatas = []

    for row in snack_rows:
        doc_id = f"snack_{row['id']}"
        text = build_snack_text(row)
        # has_personal_size: 1=yes, 0=no, -1=unknown (ChromaDB doesn't support None)
        hps = row["has_personal_size"]
        hps_val = int(hps) if hps is not None else -1

        metadata = {
            "type": "snack_item",
            "source_id": row["id"],
            "name": row["name"],
            "brand": row["brand"] or "",
            "calories": int(row["calories"]),
            "protein_g": float(row["protein_g"]),
            "carbs_g": float(row["carbs_g"]),
            "fat_g": float(row["fat_g"]),
            "is_swap": int(row["is_swap"]),
            "category": row["craving_categories"] or "",
            "has_personal_size": hps_val,
        }
        snack_ids.append(doc_id)
        snack_texts.append(text)
        snack_metadatas.append(metadata)

    # ---- Template Meals ----
    meals_with, meals_without = fetch_template_meals(conn)
    print(f"Found {len(meals_with)} template meals with nutrition, {len(meals_without)} without")

    meal_ids = []
    meal_texts = []
    meal_metadatas = []

    for row in meals_with:
        doc_id = f"meal_{row['id']}"
        text = build_meal_text_with_nutrition(row)
        metadata = {
            "type": "template_meal",
            "source_id": row["id"],
            "name": row["name"],
            "brand": row["restaurant_name"],
            "calories": int(row["total_calories"]),
            "protein_g": float(row["total_protein_g"]),
            "carbs_g": float(row["total_carbs_g"]),
            "fat_g": float(row["total_fat_g"]),
            "is_swap": int(row["is_swap"]),
            "category": row["restaurant_name"],
        }
        meal_ids.append(doc_id)
        meal_texts.append(text)
        meal_metadatas.append(metadata)

    for row in meals_without:
        doc_id = f"meal_{row['id']}"
        text = build_meal_text_without_nutrition(row)
        metadata = {
            "type": "template_meal",
            "source_id": row["id"],
            "name": row["name"],
            "brand": row["restaurant_name"],
            "calories": 0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
            "is_swap": int(row["is_swap"]),
            "category": row["restaurant_name"],
        }
        meal_ids.append(doc_id)
        meal_texts.append(text)
        meal_metadatas.append(metadata)

    # ---- Food Items (takeout/restaurant) ----
    food_rows = fetch_food_items(conn)
    print(f"Found {len(food_rows)} food items (takeout/restaurant)")

    food_item_ids = []
    food_item_texts = []
    food_item_metadatas = []

    for row in food_rows:
        doc_id = f"food_{row['id']}"
        text = build_food_item_text(row)
        metadata = {
            "type": "food_item",
            "source_id": row["id"],
            "name": row["name"],
            "brand": row["restaurant"] or "",
            "calories": int(row["calories"]),
            "protein_g": float(row["protein_g"]),
            "carbs_g": float(row["carbs_g"]),
            "fat_g": float(row["fat_g"]),
            "is_swap": 0,
            "category": row["cuisine"] or row["category"] or "",
        }
        food_item_ids.append(doc_id)
        food_item_texts.append(text)
        food_item_metadatas.append(metadata)

    conn.close()

    # Combine all
    all_ids = snack_ids + meal_ids + food_item_ids
    all_texts = snack_texts + meal_texts + food_item_texts
    all_metadatas = snack_metadatas + meal_metadatas + food_item_metadatas

    print(f"\nTotal items to embed: {len(all_ids)}")

    # Embed and upsert in batches
    total_batches = (len(all_ids) + BATCH_SIZE - 1) // BATCH_SIZE
    for batch_num in range(total_batches):
        start = batch_num * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(all_ids))

        batch_ids = all_ids[start:end]
        batch_texts = all_texts[start:end]
        batch_metadatas = all_metadatas[start:end]

        print(f"  Embedding batch {batch_num + 1}/{total_batches} ({len(batch_ids)} items)...")
        embeddings = embed_batch(batch_texts)

        collection.upsert(
            ids=batch_ids,
            embeddings=embeddings,
            documents=batch_texts,
            metadatas=batch_metadatas,
        )

    final_count = collection.count()
    print(f"\nDone! ChromaDB collection 'food_items' has {final_count} items.")
    print(f"Stored at: {CHROMA_PATH}")


def embed_single_item(item_type: str, item_id: str, name: str, brand: str,
                       calories: float, protein_g: float, carbs_g: float,
                       fat_g: float, serving: str = "", category: str = "",
                       is_swap: int = 0, description: str = ""):
    """
    Embed a single new food item into ChromaDB.
    Call this after inserting a new item into SQLite.

    Args:
        item_type: 'snack_item', 'template_meal', or 'ecosystem_item'
        item_id: The item's ID in SQLite
        name: Food name
        brand: Brand or restaurant name
        calories, protein_g, carbs_g, fat_g: Nutrition data
        serving: Serving size description
        category: Craving category or restaurant name
        is_swap: 1 if this is a swap option, 0 if original
        description: Additional description text
    """
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(
        "food_items",
        metadata={"hnsw:space": "cosine"},
    )

    # Build embedding text
    parts = []
    if brand:
        parts.append(brand)
    parts.append(name)
    if serving:
        parts.append(f"- {serving}")
    if calories > 0:
        parts.append(f"- {int(calories)} cal, {protein_g}g protein, {carbs_g}g carbs, {fat_g}g fat")
    if description:
        parts.append(f"- {description}")
    if category:
        parts.append(f"- Category: {category}")

    text = " ".join(parts)
    doc_id = f"{item_type}_{item_id}"

    # Embed
    embeddings = embed_batch([text])

    # Upsert
    collection.upsert(
        ids=[doc_id],
        embeddings=embeddings,
        documents=[text],
        metadatas=[{
            "type": item_type,
            "source_id": str(item_id),
            "name": name,
            "brand": brand or "",
            "calories": int(calories),
            "protein_g": float(protein_g),
            "carbs_g": float(carbs_g),
            "fat_g": float(fat_g),
            "is_swap": is_swap,
            "category": category or "",
        }],
    )

    return doc_id


if __name__ == "__main__":
    main()
