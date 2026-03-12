/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "french_toast";

  let recipeName = "Recipe";
  let origCal = 0;
  let swapCal = 0;
  let swapProtein = 0;
  let ogImage = "";

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const recipe = db.prepare("SELECT name, og_image FROM recipes WHERE id = ?").get(id) as {
      name: string;
      og_image: string | null;
    } | undefined;
    if (recipe) {
      recipeName = recipe.name;
      ogImage = recipe.og_image || "";
    }

    const origRow = db.prepare(
      "SELECT SUM(calories) as cal FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 0"
    ).get(id) as { cal: number } | undefined;
    const swapRow = db.prepare(
      "SELECT SUM(calories) as cal, SUM(protein_g) as prot FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 1"
    ).get(id) as { cal: number; prot: number } | undefined;
    origCal = Math.round(origRow?.cal ?? 0);
    swapCal = Math.round(swapRow?.cal ?? 0);
    swapProtein = Math.round(swapRow?.prot ?? 0);
    db.close();
  } catch {
    // fallback
  }

  // If a static OG thumbnail exists, serve it directly
  if (ogImage) {
    const imgPath = join(process.cwd(), "public", ogImage);
    if (existsSync(imgPath)) {
      const imgBuffer = readFileSync(imgPath);
      const ext = ogImage.endsWith(".png") ? "image/png" : "image/jpeg";
      return new NextResponse(imgBuffer, {
        headers: { "Content-Type": ext, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }
  }

  // Fallback: generate OG image dynamically
  const pctSaved = origCal > 0 ? Math.round(((origCal - swapCal) / origCal) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        {/* Swap pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "2px solid rgba(239,68,68,0.3)",
              borderRadius: "16px",
              padding: "16px 28px",
              color: "#fca5a5",
              fontSize: "22px",
              display: "flex",
            }}
          >
            {origCal} cal
          </div>
          <div style={{ fontSize: "36px", color: "rgba(255,255,255,0.4)", display: "flex" }}>
            →
          </div>
          <div
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "2px solid rgba(34,197,94,0.3)",
              borderRadius: "16px",
              padding: "16px 28px",
              color: "#86efac",
              fontSize: "22px",
              display: "flex",
            }}
          >
            {swapCal} cal · {swapProtein}g protein
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "24px",
            maxWidth: "900px",
            display: "flex",
          }}
        >
          Your High Protein, Low Calorie {recipeName} Recipe
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          {pctSaved}% fewer calories. Same great taste. Tap to see the swap.
        </div>

        {/* Brand */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#22c55e",
              display: "flex",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "20px", display: "flex" }}>
            bulletproofbody.ai
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
