import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { DB_PATH } from "@/lib/db";

interface ProfileRow {
  id: string;
  slug: string;
  client_name: string;
  current_weight_lbs: number | null;
  goal_weight_lbs: number | null;
  height_inches: number | null;
  age: number | null;
  gender: string | null;
  rmr: number | null;
  daily_calorie_target: number | null;
  home_zip: string | null;
  work_zip: string | null;
  created_at: string;
  updated_at: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const profiles = db
      .prepare("SELECT * FROM ecosystem_profiles ORDER BY created_at DESC")
      .all() as ProfileRow[];
    db.close();

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Failed to list ecosystem profiles:", error);
    return NextResponse.json(
      { error: "Failed to list ecosystem profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientName = (body.clientName ?? "").trim();

    if (!clientName) {
      return NextResponse.json(
        { error: "Field 'clientName' is required" },
        { status: 400 }
      );
    }

    const db = new Database(DB_PATH);

    // Generate slug, appending -2, -3, etc. if it already exists
    let baseSlug = toSlug(clientName);
    let slug = baseSlug;
    let suffix = 1;

    while (
      db
        .prepare("SELECT 1 FROM ecosystem_profiles WHERE slug = ?")
        .get(slug)
    ) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO ecosystem_profiles (id, slug, client_name)
       VALUES (?, ?, ?)`
    ).run(id, slug, clientName);

    const profile = db
      .prepare("SELECT * FROM ecosystem_profiles WHERE id = ?")
      .get(id) as ProfileRow;

    db.close();

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ecosystem profile:", error);
    return NextResponse.json(
      { error: "Failed to create ecosystem profile" },
      { status: 500 }
    );
  }
}
