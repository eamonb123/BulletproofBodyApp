#!/usr/bin/env python3
"""
Semantic food search using ChromaDB + OpenAI embeddings.

Usage:
    from scripts.food_search import semantic_food_search
    results = semantic_food_search("Chinese cashew chicken with rice", n_results=10)

CLI:
    python3 scripts/food_search.py "Chinese cashew chicken" --limit 5 --all
"""

import os
import sys
import json
import argparse
from pathlib import Path

from dotenv import load_dotenv
import chromadb
from openai import OpenAI

# Paths
ROOT = Path(__file__).resolve().parent.parent
CHROMA_PATH = str(ROOT / "chroma_db")
ENV_PATH = ROOT.parent / ".env"

load_dotenv(ENV_PATH)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"


def _get_openai():
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not found in .env")
    return OpenAI(api_key=OPENAI_API_KEY)


def _get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_collection("food_items")


def semantic_food_search(
    query: str,
    n_results: int = 10,
    filter_swaps_only: bool = True,
    original_calories: int = 0,
) -> list[dict]:
    """
    Search for foods semantically across all categories.

    Args:
        query: Natural language description of a food
        n_results: Max results to return
        filter_swaps_only: If True, only return swap options (lower-cal alternatives)
        original_calories: If provided, re-sort results by calorie savings (descending).
                          Items with more savings rank higher.

    Returns:
        List of dicts with: name, brand, calories, protein_g, carbs_g, fat_g,
                           type, source_id, similarity_score, category, calorie_savings
    """
    openai_client = _get_openai()
    collection = _get_collection()

    # Embed the query
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query],
    )
    query_embedding = response.data[0].embedding

    # Build ChromaDB where filter
    where_filter = None
    if filter_swaps_only:
        where_filter = {"is_swap": 1}

    # Query ChromaDB — fetch more results if we'll re-sort, to get better coverage
    fetch_n = n_results * 3 if original_calories > 0 else n_results

    # Query ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=fetch_n,
        where=where_filter,
        include=["metadatas", "distances", "documents"],
    )

    # Format results
    output = []
    if results and results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            distance = results["distances"][0][i]
            # ChromaDB cosine distance: 0 = identical, 2 = opposite
            # Convert to similarity score: 1 - (distance / 2)
            similarity = 1.0 - (distance / 2.0)

            item_cal = meta.get("calories", 0)
            savings = max(0, original_calories - item_cal) if original_calories > 0 else 0

            # has_personal_size: 1=yes, 0=no, -1=unknown (stored as int in ChromaDB)
            hps_raw = meta.get("has_personal_size", -1)
            hps = None if hps_raw == -1 else bool(hps_raw)

            output.append({
                "name": meta.get("name", ""),
                "brand": meta.get("brand", ""),
                "calories": item_cal,
                "protein_g": meta.get("protein_g", 0.0),
                "carbs_g": meta.get("carbs_g", 0.0),
                "fat_g": meta.get("fat_g", 0.0),
                "type": meta.get("type", ""),
                "source_id": meta.get("source_id", ""),
                "similarity_score": round(similarity, 4),
                "category": meta.get("category", ""),
                "calorie_savings": savings,
                "has_personal_size": hps,
            })

    # Re-sort by calorie savings if original_calories provided
    if original_calories > 0 and output:
        # Filter to only items that actually save calories, then sort by savings desc
        saving_items = [r for r in output if r["calorie_savings"] > 0]
        non_saving = [r for r in output if r["calorie_savings"] <= 0]
        saving_items.sort(key=lambda r: r["calorie_savings"], reverse=True)
        output = (saving_items + non_saving)[:n_results]
    else:
        output = output[:n_results]

    return output


def main():
    parser = argparse.ArgumentParser(description="Semantic food search")
    parser.add_argument("query", help="Food description to search for")
    parser.add_argument("--limit", "-n", type=int, default=10, help="Max results")
    parser.add_argument("--all", "-a", action="store_true",
                        help="Include non-swap items (default: swaps only)")
    parser.add_argument("--original-cal", type=int, default=0,
                        help="Original item calories — re-sorts results by savings")
    args = parser.parse_args()

    results = semantic_food_search(
        args.query,
        n_results=args.limit,
        filter_swaps_only=not args.all,
        original_calories=args.original_cal,
    )
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
