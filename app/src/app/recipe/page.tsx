import type { Metadata } from "next";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";
import RecipeClient from "./RecipeClient";

// Default metadata (no ?id= param)
const defaultMeta: Metadata = {
  title: "Same Meal. Half the Calories. More Protein.",
  description:
    "Pick a recipe. We'll show you how to make it with half the calories and double the protein.",
  openGraph: {
    title: "Same Meal. Half the Calories. More Protein.",
    description:
      "Pick a recipe. We'll show you how to make it with half the calories and double the protein.",
    siteName: "Bulletproof Body",
    type: "website",
    url: "https://bulletproofbody.ai/recipe",
  },
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const id = params?.id;
  if (!id) return defaultMeta;

  try {
    const db = new Database(DB_PATH, { readonly: true });
    const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!recipe) { db.close(); return defaultMeta; }

    const origRow = db.prepare(
      "SELECT SUM(calories) as cal FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 0"
    ).get(id) as { cal: number };
    const swapRow = db.prepare(
      "SELECT SUM(calories) as cal, SUM(protein_g) as prot FROM recipe_ingredients WHERE recipe_id = ? AND is_swap = 1"
    ).get(id) as { cal: number; prot: number };
    db.close();

    const name = recipe.name as string;
    const origCal = Math.round(origRow.cal ?? 0);
    const swapCal = Math.round(swapRow.cal ?? 0);
    const swapProtein = Math.round(swapRow.prot ?? 0);
    const pctSaved = Math.round(((origCal - swapCal) / origCal) * 100);

    const title = `Your High Protein, Low Calorie ${name} Recipe`;
    const description = `Your ${name.toLowerCase()} has ${origCal} hidden calories. Here's the same recipe at ${swapCal} cal with ${swapProtein}g protein. Tap to see the swap.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: "Bulletproof Body",
        type: "website",
        url: `https://bulletproofbody.ai/recipe?id=${id}`,
        images: [
          {
            url: `/api/og/recipe?id=${id}`,
            width: 1200,
            height: 630,
            alt: `${name} Recipe Swap`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/og/recipe?id=${id}`],
      },
    };
  } catch {
    return defaultMeta;
  }
}

export default function RecipePage() {
  return <RecipeClient />;
}
