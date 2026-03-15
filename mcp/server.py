#!/usr/bin/env python3
"""
Bulletproof Body MCP Server — Food swap database management.

Manage the takeout food swap database, track leads, and view funnel analytics.
"""

import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# Add project root to path for script imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = str(ROOT / "bulletproof_body.db")
CHROMA_PATH = str(ROOT / "chroma_db")
ENV_PATH = ROOT.parent / ".env"

mcp = FastMCP("bulletproof-body")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Semantic Search (God Search) ────────────────────────


@mcp.tool()
def food_db_search(
    query: str,
    n_results: int = 10,
    food_type: str = "",
    max_calories: int = 0,
    swaps_only: bool = False,
) -> str:
    """Semantic search across ALL food databases — snacks, meals, takeout, grocery.

    Use natural language: "frozen high protein meal", "low carb chips",
    "chicken bowl under 500 calories", "healthy pizza alternative"

    Args:
        query: Natural language food description
        n_results: Max results (default 10)
        food_type: Filter by type: "snack_item", "template_meal", "food_item", or "" for all
        max_calories: Max calories filter (0 = no limit)
        swaps_only: If True, only return swap/healthier alternatives
    """
    from dotenv import load_dotenv
    import chromadb
    from openai import OpenAI

    load_dotenv(str(ENV_PATH))
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "ERROR: OPENAI_API_KEY not found in .env"

    openai_client = OpenAI(api_key=api_key)
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

    try:
        collection = chroma_client.get_collection("food_items")
    except Exception:
        return "ERROR: ChromaDB collection 'food_items' not found. Run: python3 scripts/embed_foods.py"

    # Embed the query
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
    )
    query_embedding = response.data[0].embedding

    # Build where filter
    where_conditions = []
    if food_type:
        where_conditions.append({"type": food_type})
    if swaps_only:
        where_conditions.append({"is_swap": 1})
    if max_calories > 0:
        where_conditions.append({"calories": {"$lte": max_calories}})

    where_filter = None
    if len(where_conditions) == 1:
        where_filter = where_conditions[0]
    elif len(where_conditions) > 1:
        where_filter = {"$and": where_conditions}

    # Query
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=where_filter,
        include=["metadatas", "distances", "documents"],
    )

    if not results or not results["ids"] or not results["ids"][0]:
        return "No food items found matching your query."

    # Format output
    type_labels = {
        "snack_item": "Snack",
        "template_meal": "Restaurant Meal",
        "food_item": "Takeout",
        "ecosystem_item": "Ecosystem",
    }

    lines = [f"Found {len(results['ids'][0])} results for \"{query}\":\n"]
    for i, doc_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        similarity = round(1.0 - (distance / 2.0), 3)

        name = meta.get("name", "?")
        brand = meta.get("brand", "")
        cal = meta.get("calories", 0)
        protein = meta.get("protein_g", 0.0)
        carbs = meta.get("carbs_g", 0.0)
        fat = meta.get("fat_g", 0.0)
        item_type = type_labels.get(meta.get("type", ""), meta.get("type", ""))
        is_swap = " [SWAP]" if meta.get("is_swap") else ""

        brand_str = f" ({brand})" if brand else ""
        macro_str = f"{cal} cal, {protein}g P, {carbs}g C, {fat}g F" if cal > 0 else "no nutrition data"

        lines.append(f"  [{item_type}] {name}{brand_str} — {macro_str}{is_swap}  (match: {similarity})")

    return "\n".join(lines)


# ── Food Management ─────────────────────────────────────


@mcp.tool()
def takeout_add_food(
    food_id: str,
    name: str,
    restaurant: str,
    cuisine: str,
    calories: int,
    protein: float,
    carbs: float,
    fat: float,
    serving: str,
    emoji: str = "",
    category: str = "takeout",
    fiber: float = 0,
    source: str = "",
    ingredients_json: str = "",
) -> str:
    """Add a food item to the database.

    Args:
        food_id: Unique ID (e.g., "chipotle_burrito", "sweetgreen_harvest")
        name: Display name (e.g., "Harvest Bowl")
        restaurant: Restaurant name (e.g., "Sweetgreen")
        cuisine: Cuisine type (e.g., "American", "Asian", "Mexican")
        calories: Total calories per serving
        protein: Grams of protein
        carbs: Grams of carbs
        fat: Grams of fat
        serving: Human-readable serving (e.g., "1 bowl", "2 slices")
        emoji: Display emoji
        category: takeout, restaurant, snack, sweet, travel
        fiber: Grams of fiber
        source: Where nutrition data came from
        ingredients_json: JSON of ingredient-level breakdown
    """
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO food_items
            (id, name, restaurant, cuisine, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving, emoji, source, ingredients_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (food_id, name, restaurant, cuisine, category, calories, protein, carbs, fat, fiber, serving, emoji, source, ingredients_json),
        )
        conn.commit()
        return f"Added: {name} ({restaurant}) — {calories} cal, {protein}g protein"
    except sqlite3.IntegrityError:
        return f"Food '{food_id}' already exists. Use a different ID."
    finally:
        conn.close()


@mcp.tool()
def takeout_add_swap(
    original_id: str,
    swap_id: str,
    rationale: str,
    difficulty: str = "easy",
) -> str:
    """Create a swap pair between two food items.

    Args:
        original_id: ID of the original (higher calorie) food
        swap_id: ID of the swap (lower calorie) food
        rationale: One sentence explaining why this swap works
        difficulty: easy, medium
    """
    conn = get_db()
    try:
        original = conn.execute("SELECT calories, protein_g FROM food_items WHERE id = ?", (original_id,)).fetchone()
        swap = conn.execute("SELECT calories, protein_g FROM food_items WHERE id = ?", (swap_id,)).fetchone()

        if not original:
            return f"Original food '{original_id}' not found."
        if not swap:
            return f"Swap food '{swap_id}' not found."

        savings = original["calories"] - swap["calories"]
        protein_gain = swap["protein_g"] - original["protein_g"]
        same_restaurant = 1  # Default to same restaurant

        conn.execute(
            """INSERT INTO food_swaps (original_id, swap_id, calorie_savings, protein_gain, same_restaurant, rationale, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (original_id, swap_id, savings, protein_gain, same_restaurant, rationale, difficulty),
        )
        conn.commit()
        return f"Swap created: {original_id} → {swap_id} (saves {savings} cal, {protein_gain:+.0f}g protein)"
    finally:
        conn.close()


@mcp.tool()
def takeout_search(
    query: str = "",
    cuisine: str = "",
    category: str = "",
    max_calories: int = 0,
) -> str:
    """Search food items by name, restaurant, cuisine, or calorie limit.

    Args:
        query: Search term (matches name or restaurant)
        cuisine: Filter by cuisine type
        category: Filter by category (takeout, restaurant, snack, sweet, travel)
        max_calories: Max calories filter (0 = no limit)
    """
    conn = get_db()
    conditions = []
    params = []

    if query:
        conditions.append("(name LIKE ? OR restaurant LIKE ?)")
        params.extend([f"%{query}%", f"%{query}%"])
    if cuisine:
        conditions.append("cuisine = ?")
        params.append(cuisine)
    if category:
        conditions.append("category = ?")
        params.append(category)
    if max_calories > 0:
        conditions.append("calories <= ?")
        params.append(max_calories)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = conn.execute(
        f"SELECT * FROM food_items {where} ORDER BY calories", params
    ).fetchall()
    conn.close()

    if not rows:
        return "No food items found matching your criteria."

    lines = [f"Found {len(rows)} food items:\n"]
    for r in rows:
        lines.append(f"  {r['emoji']} {r['name']} ({r['restaurant']}) — {r['calories']} cal, {r['protein_g']}g protein | {r['serving']}")
    return "\n".join(lines)


@mcp.tool()
def takeout_list_swaps() -> str:
    """List all food swap pairs with calorie savings."""
    conn = get_db()
    rows = conn.execute("""
        SELECT fo.name as original_name, fo.restaurant as orig_restaurant, fo.calories as orig_cal,
               sw.name as swap_name, sw.restaurant as swap_restaurant, sw.calories as swap_cal,
               fs.calorie_savings, fs.protein_gain, fs.rationale
        FROM food_swaps fs
        JOIN food_items fo ON fs.original_id = fo.id
        JOIN food_items sw ON fs.swap_id = sw.id
        ORDER BY fs.calorie_savings DESC
    """).fetchall()
    conn.close()

    if not rows:
        return "No swaps in database yet."

    lines = [f"{len(rows)} food swaps:\n"]
    for r in rows:
        lines.append(
            f"  {r['original_name']} ({r['orig_restaurant']}, {r['orig_cal']} cal) → "
            f"{r['swap_name']} ({r['swap_restaurant']}, {r['swap_cal']} cal) "
            f"| Saves {r['calorie_savings']} cal | {r['rationale']}"
        )
    return "\n".join(lines)


# ── Lead / Session Tracking ─────────────────────────────


@mcp.tool()
def takeout_leads(days: int = 7) -> str:
    """Show recent leads who completed the tool and gave their email.

    Args:
        days: Number of days to look back (default: 7)
    """
    conn = get_db()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        """SELECT id, email, phone, age, weight_lbs, goal_weight_lbs, gender,
                  daily_deficit, weekly_fat_loss_lbs, utm_source, created_at
           FROM user_sessions
           WHERE email IS NOT NULL AND created_at >= ?
           ORDER BY created_at DESC""",
        (cutoff,),
    ).fetchall()
    conn.close()

    if not rows:
        return f"No leads in the last {days} days."

    lines = [f"{len(rows)} leads in the last {days} days:\n"]
    for r in rows:
        deficit = f", deficit: {r['daily_deficit']} cal/day" if r['daily_deficit'] else ""
        weekly = f", projects {r['weekly_fat_loss_lbs']} lbs/week" if r['weekly_fat_loss_lbs'] else ""
        source = f" (via {r['utm_source']})" if r['utm_source'] else ""
        lines.append(
            f"  {r['email']}{source} — {r['weight_lbs']}→{r['goal_weight_lbs']} lbs{deficit}{weekly} | {r['created_at']}"
        )
    return "\n".join(lines)


@mcp.tool()
def takeout_analytics(days: int = 7) -> str:
    """Show funnel analytics — sessions, screen drop-off, email capture rate.

    Args:
        days: Number of days to analyze (default: 7)
    """
    conn = get_db()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()

    total = conn.execute(
        "SELECT COUNT(DISTINCT session_id) as c FROM funnel_events WHERE created_at >= ? AND session_id IS NOT NULL",
        (cutoff,),
    ).fetchone()["c"]

    by_screen = conn.execute(
        """SELECT screen_number, COUNT(DISTINCT session_id) as users
           FROM funnel_events WHERE created_at >= ? AND screen_number IS NOT NULL
           GROUP BY screen_number ORDER BY screen_number""",
        (cutoff,),
    ).fetchall()

    emails = conn.execute(
        "SELECT COUNT(*) as c FROM user_sessions WHERE email IS NOT NULL AND created_at >= ?",
        (cutoff,),
    ).fetchone()["c"]

    by_type = conn.execute(
        """SELECT event_type, COUNT(*) as c
           FROM funnel_events WHERE created_at >= ?
           GROUP BY event_type ORDER BY c DESC""",
        (cutoff,),
    ).fetchall()

    conn.close()

    lines = [f"Funnel Analytics (last {days} days):\n"]
    lines.append(f"  Total sessions: {total}")
    lines.append(f"  Emails captured: {emails}")
    if total > 0:
        lines.append(f"  Capture rate: {emails / total * 100:.1f}%")

    if by_screen:
        lines.append("\n  Screen drop-off:")
        for s in by_screen:
            pct = f" ({s['users'] / total * 100:.0f}%)" if total > 0 else ""
            lines.append(f"    Screen {s['screen_number']}: {s['users']} users{pct}")

    if by_type:
        lines.append("\n  Events:")
        for e in by_type:
            lines.append(f"    {e['event_type']}: {e['c']}")

    return "\n".join(lines)


@mcp.tool()
def takeout_stats() -> str:
    """Database overview — food items, swaps, sessions, leads."""
    conn = get_db()

    foods = conn.execute("SELECT COUNT(*) as c FROM food_items").fetchone()["c"]
    swaps = conn.execute("SELECT COUNT(*) as c FROM food_swaps").fetchone()["c"]
    sessions = conn.execute("SELECT COUNT(*) as c FROM user_sessions").fetchone()["c"]
    emails = conn.execute("SELECT COUNT(*) as c FROM user_sessions WHERE email IS NOT NULL").fetchone()["c"]
    events = conn.execute("SELECT COUNT(*) as c FROM funnel_events").fetchone()["c"]

    by_category = conn.execute(
        "SELECT category, COUNT(*) as c FROM food_items GROUP BY category ORDER BY c DESC"
    ).fetchall()

    by_cuisine = conn.execute(
        "SELECT cuisine, COUNT(*) as c FROM food_items GROUP BY cuisine ORDER BY c DESC"
    ).fetchall()

    conn.close()

    lines = [
        "Bulletproof Body Database:\n",
        f"  Food items: {foods}",
        f"  Swap pairs: {swaps}",
        f"  User sessions: {sessions}",
        f"  Emails captured: {emails}",
        f"  Funnel events: {events}",
        "\n  By category:",
    ]
    for c in by_category:
        lines.append(f"    {c['category']}: {c['c']}")
    lines.append("\n  By cuisine:")
    for c in by_cuisine:
        lines.append(f"    {c['cuisine']}: {c['c']}")

    return "\n".join(lines)


@mcp.tool()
def takeout_seed_menu(
    restaurant: str,
    items_json: str,
) -> str:
    """Bulk-seed food items from a restaurant menu.

    Args:
        restaurant: Restaurant name (e.g., "Sweetgreen", "Cava")
        items_json: JSON array of food items. Each item needs:
            {name, calories, protein, carbs, fat, serving, cuisine, emoji, category}
            Optional: fiber, source, ingredients_json

    Example:
        items_json = '[{"name": "Harvest Bowl", "calories": 705, "protein": 28, ...}]'
    """
    try:
        items = json.loads(items_json)
    except json.JSONDecodeError:
        return "Invalid JSON. Please provide a valid JSON array of food items."

    conn = get_db()
    added = 0
    skipped = 0

    for item in items:
        food_id = f"{restaurant.lower().replace(' ', '_')}_{item['name'].lower().replace(' ', '_')}"
        try:
            conn.execute(
                """INSERT INTO food_items
                (id, name, restaurant, cuisine, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving, emoji, source, ingredients_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    food_id,
                    item["name"],
                    restaurant,
                    item.get("cuisine", "American"),
                    item.get("category", "takeout"),
                    item["calories"],
                    item["protein"],
                    item["carbs"],
                    item["fat"],
                    item.get("fiber", 0),
                    item["serving"],
                    item.get("emoji", ""),
                    item.get("source", ""),
                    item.get("ingredients_json", ""),
                ),
            )
            added += 1
        except sqlite3.IntegrityError:
            skipped += 1

    conn.commit()
    conn.close()
    return f"Seeded {restaurant}: {added} added, {skipped} skipped (already exist)."


# ── Snack Item Management ──────────────────────────────


@mcp.tool()
def takeout_add_snack(
    item_id: str,
    name: str,
    brand: str,
    serving: str,
    calories: int,
    protein: float,
    carbs: float,
    fat: float,
    item_category: str = "snack",
    item_subcategory: str = "",
    swap_craving_category: str = "",
    is_hero: bool = True,
    auto_pair: bool = True,
) -> str:
    """Add a snack/grocery item and auto-pair with opposite-side items in same craving category.

    Args:
        item_id: Unique ID (kebab-case, e.g., "brand-product-variant")
        name: Display name
        brand: Brand name
        serving: Serving size (e.g., "1 bar (40g)")
        calories: Calories per serving
        protein: Grams of protein
        carbs: Grams of carbs
        fat: Grams of fat
        item_category: "snack" or "grocery"
        item_subcategory: Required for grocery (e.g., "dairy", "beverage", "cereal")
        swap_craving_category: Craving category (e.g., "Salty & Crunchy", "Protein")
        is_hero: True if this is the lower-cal swap alternative, False if enemy
        auto_pair: If True, auto-create swap pairs to all opposite-side items
    """
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO snack_items
            (id, name, brand, serving, calories, protein_g, carbs_g, fat_g,
             item_category, item_subcategory, swap_craving_category, is_hero)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (item_id, name, brand, serving, calories, protein, carbs, fat,
             item_category, item_subcategory, swap_craving_category, 1 if is_hero else 0),
        )
        conn.commit()

        result_msg = f"Added snack: {brand} {name} — {calories} cal, {protein}g protein"

        if auto_pair and swap_craving_category:
            from scripts.auto_pair import auto_pair_item, embed_item
            pair_result = auto_pair_item(item_id, conn=conn)
            result_msg += f"\nAuto-paired: {pair_result['paired']} new swap pairs created"
            if pair_result["skipped"]:
                result_msg += f" ({pair_result['skipped']} already existed)"
            if pair_result["errors"]:
                result_msg += f"\nErrors: {pair_result['errors']}"

            # Embed into ChromaDB
            doc_id = embed_item(item_id)
            if doc_id:
                result_msg += f"\nEmbedded as: {doc_id}"

        return result_msg
    except sqlite3.IntegrityError:
        return f"Snack '{item_id}' already exists. Use a different ID."
    finally:
        conn.close()


@mcp.tool()
def auto_pair_new_item(item_id: str, embed: bool = True) -> str:
    """Auto-pair an existing snack_item with all opposite-side items in same craving category.

    Call this after inserting a snack_item that has swap_craving_category and is_hero set.
    Creates snack_swaps entries for every hero↔enemy pair in the same category.

    Args:
        item_id: The snack_items.id to auto-pair
        embed: If True, also re-embed the item into ChromaDB
    """
    from scripts.auto_pair import auto_pair_item, embed_item

    result = auto_pair_item(item_id)

    if result["errors"]:
        return f"Errors: {', '.join(result['errors'])}"

    msg = (f"Auto-pair for '{item_id}' ({result['item_craving']}, "
           f"{'hero' if result['is_hero'] else 'enemy'}):\n"
           f"  New pairs created: {result['paired']}\n"
           f"  Skipped (already exist): {result['skipped']}")

    if embed:
        doc_id = embed_item(item_id)
        if doc_id:
            msg += f"\n  Embedded as: {doc_id}"
        else:
            msg += "\n  Embedding failed"

    return msg


if __name__ == "__main__":
    mcp.run()
