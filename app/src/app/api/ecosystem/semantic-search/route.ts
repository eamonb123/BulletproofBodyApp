import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");

function sanitizeQuery(q: string): string {
  // Remove any characters that could break Python string literals
  return q
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\$/g, "")
    .replace(/`/g, "")
    .slice(0, 500); // Limit query length
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const swapsOnly = searchParams.get("swaps_only") !== "false";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "6", 10), 1),
    20
  );
  const originalCal = Math.max(
    parseInt(searchParams.get("original_cal") || "0", 10),
    0
  );

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const escapedQuery = sanitizeQuery(query.trim());
  const filterSwaps = swapsOnly ? "True" : "False";

  try {
    const pythonScript = `
import sys
sys.path.insert(0, '${PROJECT_ROOT}')
from scripts.food_search import semantic_food_search
import json
results = semantic_food_search('${escapedQuery}', n_results=${limit}, filter_swaps_only=${filterSwaps}, original_calories=${originalCal})
print(json.dumps(results))
`.trim();

    const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      timeout: 15000,
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });

    const results = JSON.parse(result.trim());

    return NextResponse.json({
      query: query.trim(),
      results,
      count: results.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("Semantic search error:", message);
    return NextResponse.json(
      { error: "Semantic search failed", detail: message },
      { status: 500 }
    );
  }
}
