import { NextResponse } from "next/server";
import { getDb, loadClientSnackRows, normalizeName } from "./_lib";

interface ProfileRow {
  id: string;
  client_name: string;
  normalized_name: string;
  created_at: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";

  if (!name) {
    return NextResponse.json(
      { error: "Query parameter 'name' is required" },
      { status: 400 }
    );
  }

  const normalized = normalizeName(name);

  try {
    const db = getDb({ readonly: true });
    const profile = db
      .prepare(
        "SELECT * FROM client_snack_profiles WHERE normalized_name = ?"
      )
      .get(normalized) as ProfileRow | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json({ profile: null });
    }

    const rows = loadClientSnackRows(db, profile.id);
    db.close();

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.client_name,
      },
      rows,
    });
  } catch (error) {
    console.error("Failed to load snack profile by name:", error);
    return NextResponse.json(
      { error: "Failed to load snack profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const rawName = body.name?.trim() ?? "";

    if (!rawName) {
      return NextResponse.json(
        { error: "Field 'name' is required" },
        { status: 400 }
      );
    }

    const normalized = normalizeName(rawName);
    const db = getDb();

    let profile = db
      .prepare(
        "SELECT * FROM client_snack_profiles WHERE normalized_name = ?"
      )
      .get(normalized) as ProfileRow | undefined;

    let created = false;

    if (!profile) {
      const id = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO client_snack_profiles (id, client_name, normalized_name)
        VALUES (?, ?, ?)
        `
      ).run(id, rawName, normalized);

      profile = db
        .prepare("SELECT * FROM client_snack_profiles WHERE id = ?")
        .get(id) as ProfileRow;
      created = true;
    }

    const rows = loadClientSnackRows(db, profile.id);
    db.close();

    return NextResponse.json({
      created,
      profile: {
        id: profile.id,
        name: profile.client_name,
      },
      rows,
    });
  } catch (error) {
    console.error("Failed to create/load snack profile:", error);
    return NextResponse.json(
      { error: "Failed to create/load snack profile" },
      { status: 500 }
    );
  }
}
