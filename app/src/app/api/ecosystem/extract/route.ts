import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Database from "better-sqlite3";
import { execSync } from "child_process";
import path from "path";
import { DB_PATH } from "@/lib/db";

interface ExtractRequest {
  images: string[];
  coach_prompt?: string;
}

interface ExtractedFoodData {
  food_name: string;
  client_comment: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  meal_time: string | null;
  comment_date: string | null;
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
  serving_size: string | null;
  ingredient_breakdown: string;
  category_suggestion: "ordering_out" | "snack" | "at_home" | "dining_out";
  why_they_eat_it: string | null;
  coach_analysis: string | null;
  food_photo_index: number;
  screenshot_index: number | null;
  suggested_restaurant?: string;
  suggested_search_terms?: string[];
  food_photo_crop?: { top: number; left: number; width: number; height: number } | null;
}

interface SuggestedSwap {
  name: string;
  brand: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving: string | null;
  calorie_savings: number;
  source: string;
}

function parseDataUrl(dataUrl: string): {
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/
  );
  if (!match) {
    throw new Error("Invalid data URL format. Expected data:image/...;base64,...");
  }
  return {
    media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    data: match[2],
  };
}

const EXTRACTION_PROMPT = `You are a nutrition coach's AI assistant analyzing food photos from Trainerize (a fitness coaching app).

Your job: extract EVERYTHING needed to build a personalized food swap card for a client's dashboard.

## Image Analysis

Look at ALL images provided. They may include:
- **Trainerize screenshots**: Show the app UI with a date at the top left (e.g., "7 Feb 2026"), meal sections (Breakfast/Lunch/Dinner/Snack), each with a time, food thumbnail, calorie count, and client comment. A screenshot may contain MULTIPLE meal entries.
- **Standalone food photos**: Higher-resolution photos of the actual food, taken by the client before eating.

## CRITICAL: Multiple Meals in One Screenshot

A Trainerize screenshot often shows MULTIPLE meals on the same day. You must identify ALL separate meal entries visible in the screenshot. Each meal entry typically has:
- A meal type header (Breakfast, Lunch, Dinner, Snack)
- A time (e.g., "1:35 PM")
- A food thumbnail photo
- A description/comment
- Sometimes a calorie count

If the coach's instructions mention a SPECIFIC item (e.g., "focus on the Cheesecake Factory item"), extract ONLY that item and ignore the others. Each meal entry has its OWN comment — do NOT combine comments from different meals.

If no specific item is mentioned and there are multiple meals, extract the LAST/BOTTOM item in the screenshot (most likely the one the coach just scrolled to).

## CRITICAL: Packaged Goods vs Prepared Food

Before extracting, determine if this is a PACKAGED GOOD (chips, bars, candy, bottled drinks, frozen meals) or PREPARED FOOD (restaurant meal, home cooking, takeout).

**If you see a nutrition label, barcode, brand packaging, or product bag:**
- This is a PACKAGED GOOD. Read the calories and macros DIRECTLY from the nutrition label in the photo.
- Use the BRAND NAME + PRODUCT NAME as the food name (e.g., "Cheetos Flamin' Hot Grab Bag" not "Pepperoni Pizza")
- Category should be "snack" (or "at_home" for frozen meals, sauces, etc.)
- Do NOT break it down into fake ingredients. A bag of chips is ONE item: "Cheetos Flamin' Hot (1 bag): 160 cal"
- The ingredient breakdown for a packaged good is just the single item with its label calories
- If the nutrition label shows serving size, calories, protein, fat, carbs — USE THOSE EXACT NUMBERS. Don't estimate.

**If the client NAMES a brand in their comment** (e.g., "Lazy Dog frozen dinner", "Trader Joe's orange chicken", "Amy's burrito"):
- This is STILL a packaged good even if no label is visible in the photo
- Use the brand + product name as the food name
- Set category to "at_home" (frozen meal / grocery item)
- Note in coach_analysis that the exact nutrition should be verified from the product packaging
- Do NOT break it down into fake ingredients — treat it as a single packaged item
- Estimate calories based on your knowledge of the product, but flag it as needing verification

**If there's NO packaging/label visible AND no brand named:**
- This is PREPARED FOOD. Estimate calories and break down into ingredients as described below.

## What to Extract

1. **Food identification**: What is this food? Be specific. For packaged goods, use the brand + product name from the packaging (e.g., "Cheetos Flamin' Hot Grab Bag" not "spicy cheese puffs").
2. **Client's exact comment**: Copy ONLY the comment that belongs to THIS specific meal entry. Do NOT include comments from other meal entries in the same screenshot.
3. **Date**: Extract from the top left of the Trainerize screenshot (e.g., "7 Feb 2026"). This is the date for ALL meals on that page.
4. **Meal time**: The specific time shown next to this meal entry (e.g., "1:39 PM"). This is important for understanding eating patterns.
5. **Meal type**: breakfast, lunch, dinner, or snack — as shown in the Trainerize UI.
6. **Calorie estimation**: HIGH-BOUND ONLY. Always round UP. Never give ranges. Never lowball. Clients enter these into Trainerize as Custom Meals — one exact number. If Trainerize shows a calorie count, use it as a FLOOR, not a ceiling. Restaurant meals are almost always MORE than listed.
7. **Full macro breakdown**: Exact single numbers for protein, carbs, fat. No ranges. If Trainerize shows macro grams, use those. Otherwise estimate high-bound using: protein ~7g per raw oz of meat, carbs from starch/grain components only, fat from cooking method + sauces + oils.
8. **Ingredient-level breakdown**: Break down EVERY component with individual calories. This is the most important output — it shows the client exactly where their calories are hiding.
   - For each component: name (with portion estimate) and calorie count
   - Protein portions: estimate raw ounces, multiply by species-appropriate cal/oz
   - Rice/grains: specify portion (e.g., "1 cup brown rice: 220 cal")
   - Sauces/dressings: ALWAYS call out separately — these are the hidden calorie bombs
   - Cooking oils: see oil rule below
   - Vegetables: include even if low-cal — shows the client what's "free"

   MANDATORY OIL BUFFER — TWO RULES:
   A) **Unpublished calories** (local Chinese takeout, independent restaurants, work cafeteria, catering, any meal without FDA-published nutrition): ALWAYS add "Cooking oil/butter: 240 cal" as a line item. Restaurants use far more oil than you think. Even "light oil" still means ~240 cal. Non-negotiable. Only exceptions: steamed, boiled, poached, or raw.
   B) **Published calories** (chain restaurants with nutrition facts — Cheesecake Factory, Panda Express, Chipotle, Chick-fil-A, etc.): Do NOT add the oil buffer. The published number already accounts for cooking method. Use the published calorie count as-is.

   How to tell: If the client names a specific chain restaurant item (e.g., "SkinnyLicious Tuscan Chicken 560 cal"), the oil is baked in. If it's generic takeout ("cashew chicken from some Chinese place"), add the buffer.

   HUMAN-READABLE PORTIONS: Never use ounces, grams, or milliliters in ingredient breakdowns. Clients don't think in measurements. Use portions they can visualize:
   - "~6 pieces" not "0.5 oz"
   - "1 cup" not "8 fl oz"
   - "2 tablespoons" not "30ml"
   - "small handful" or "~10 chips"
   - "1 fist-sized portion" for rice/grains
   - "palm-sized" for protein portions
   - "1 slice", "2 strips", "3 pieces"

   The ingredient breakdown should sum to the total estimated_calories. If it doesn't, adjust the oil/sauce line to make it balance.
9. **Category**:
   - "ordering_out" = fast food chains, DoorDash, takeout
   - "snack" = packaged grab-and-go items
   - "at_home" = home cooking, kitchen staples, grocery items
   - "dining_out" = sit-down restaurants (Cheesecake Factory, Olive Garden, etc.)
10. **Why they eat it**: Infer from context: convenience, love, habit, social, craving
11. **Serving size**: Human terms (e.g., "1 serving", "1 plate")
12. **Coach analysis**: 1-2 conversational sentences about this food.
13. **Restaurant suggestion**: Most relevant chain restaurant name, or null.
14. **Search terms**: 2-4 keywords for finding alternatives in a food database.
15. **Food photo crop**: If the screenshot contains a small food thumbnail, describe its approximate position as percentage coordinates so it could be cropped: {"top": 0-100, "left": 0-100, "width": 0-100, "height": 0-100}. Set to null if no food thumbnail is visible or if a standalone food photo was provided.

## Response Format

Return ONLY valid JSON (no markdown, no code blocks):
{
  "food_name": "Coffee with Heavy Cream",
  "client_comment": "Coffee with tablespoon of heavy cream at 60 cal.",
  "meal_type": "breakfast",
  "meal_time": "8:29 AM",
  "comment_date": "Feb 8" or null,
  "estimated_calories": 57,
  "estimated_protein_g": 0,
  "estimated_carbs_g": 1,
  "estimated_fat_g": 6,
  "serving_size": "1 cup + 1 tbsp cream",
  "ingredient_breakdown": "Black coffee (8 oz): 5 cal\\nHeavy cream (1 tbsp): 52 cal",
  "category_suggestion": "at_home",
  "why_they_eat_it": "habit",
  "coach_analysis": "This is a daily habit — 57 cal is honestly fine, but I want to know if you love the cream or if it's just what's around.",
  "food_photo_index": 0,
  "screenshot_index": 1,
  "suggested_restaurant": null,
  "suggested_search_terms": ["coffee", "cream"],
  "food_photo_crop": null
}

IMPORTANT:
- food_photo_index = which image (0-indexed) is the best standalone food photo to use as the hero image on the dashboard
- screenshot_index = which image is the Trainerize app screenshot (or null if none provided)
- If only one image is provided AND it's a Trainerize screenshot, set screenshot_index = 0 and food_photo_index = 0. Provide food_photo_crop with the approximate percentage coordinates of the food thumbnail in the screenshot so it can be cropped.
- food_photo_crop = {"top": number, "left": number, "width": number, "height": number} where values are percentages (0-100) of the image dimensions. Set to null if a standalone food photo is provided or no thumbnail is visible.
- meal_time = the specific time shown next to the meal entry (e.g., "1:39 PM"). Extract from the Trainerize UI, NOT from the comment.
- comment_date = the date from the TOP LEFT of the Trainerize screenshot (e.g., "7 Feb 2026")
- client_comment = ONLY the comment for the specific meal being extracted, NOT comments from other meals on the same page
- ingredient_breakdown uses \\n for newlines
- Be precise with calories — coaches use these numbers with clients
- suggested_restaurant should be a well-known chain name or null
- suggested_search_terms should be food keywords useful for database search`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Set it in your environment variables.",
      },
      { status: 500 }
    );
  }

  let body: ExtractRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty 'images' array of base64 data URLs" },
      { status: 400 }
    );
  }

  // Build image content blocks
  const imageBlocks: Anthropic.Messages.ImageBlockParam[] = [];
  try {
    for (const dataUrl of body.images) {
      const { media_type, data } = parseDataUrl(dataUrl);
      imageBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type,
          data,
        },
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse image data: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    );
  }

  // Build the prompt, optionally appending coach instructions
  let prompt = EXTRACTION_PROMPT;
  if (body.coach_prompt && body.coach_prompt.trim()) {
    prompt += `\n\nCOACH'S INSTRUCTIONS:\n${body.coach_prompt.trim()}\n\nUse these instructions to guide your analysis. If the coach mentions a specific restaurant or food type, note it in your response.`;
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    const rawText = textBlock.text.trim();

    // Try to extract JSON from the response (Claude may wrap it in markdown code blocks)
    let jsonStr = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let data: ExtractedFoodData;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse Claude's response as JSON",
          raw_response: rawText,
        },
        { status: 500 }
      );
    }

    // Search for suggested swaps using semantic search
    const suggestedSwaps: SuggestedSwap[] = [];
    const estimatedCalories = data.estimated_calories ?? 0;
    const projectRoot = path.resolve(process.cwd(), "..");

    try {
      // Build a rich semantic query from the extracted food data
      const queryParts: string[] = [];
      if (data.food_name) queryParts.push(data.food_name);
      if (data.ingredient_breakdown) queryParts.push(`Ingredients: ${data.ingredient_breakdown.replace(/\n/g, ", ")}`);
      if (data.suggested_restaurant) queryParts.push(data.suggested_restaurant);
      if (data.suggested_search_terms?.length) queryParts.push(data.suggested_search_terms.join(", "));
      if (data.category_suggestion) queryParts.push(`${data.category_suggestion} meal`);

      const semanticQuery = queryParts.join(". ").slice(0, 500);

      // Sanitize for Python string literal
      const safeQuery = semanticQuery
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\$/g, "")
        .replace(/`/g, "");

      const pythonScript = `
import sys
sys.path.insert(0, '${projectRoot}')
from scripts.food_search import semantic_food_search
import json
results = semantic_food_search('${safeQuery}', n_results=8, filter_swaps_only=True, original_calories=${estimatedCalories})
print(json.dumps(results))
`.trim();

      const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
        encoding: "utf-8",
        timeout: 15000,
        cwd: projectRoot,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      });

      const semanticResults = JSON.parse(result.trim()) as Array<{
        name: string;
        brand: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        type: string;
        source_id: string;
        similarity_score: number;
        category: string;
      }>;

      const seenKeys = new Set<string>();
      for (const item of semanticResults) {
        const key = `${item.name}|${item.brand}`;
        if (seenKeys.has(key)) continue;
        if (item.calories <= 0) continue; // Skip items without nutrition data
        seenKeys.add(key);

        suggestedSwaps.push({
          name: item.name,
          brand: item.brand,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          serving: null,
          calorie_savings: Math.max(0, estimatedCalories - item.calories),
          source: item.type === "template_meal" ? "takeout_bible" : "snack_bible",
        });
      }

      // Sort by calorie savings (most savings first), limit to top 6
      suggestedSwaps.sort((a, b) => b.calorie_savings - a.calorie_savings);
      suggestedSwaps.splice(6);
    } catch {
      // Semantic search is best-effort — fall back gracefully
    }

    // Return extraction data with suggested swaps
    return NextResponse.json({
      ...data,
      suggested_swaps: suggestedSwaps.length > 0 ? suggestedSwaps : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
