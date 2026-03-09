import { NextResponse } from "next/server";
import {
  findJumperProfileByName,
  getDb,
  loadJumperPlanRows,
  loadJumperSession,
  normalizeName,
  toProfileView,
} from "./_lib";

interface ProfileRow {
  id: string;
  client_name: string;
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
    const profile = findJumperProfileByName(
      db,
      normalized
    ) as ProfileRow | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json({ profile: null });
    }

    const session = loadJumperSession(db, profile.id);
    const planRows = loadJumperPlanRows(db, profile.id);
    db.close();

    return NextResponse.json({
      profile: toProfileView(profile),
      session,
      planRows,
    });
  } catch (error) {
    console.error("Failed to load jumper profile by name:", error);
    return NextResponse.json(
      { error: "Failed to load jumper profile" },
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

    let profile = findJumperProfileByName(
      db,
      normalized
    ) as ProfileRow | undefined;
    let created = false;

    if (!profile) {
      const id = crypto.randomUUID();
      db.prepare(
        `
        INSERT INTO client_jumper_profiles (id, client_name, normalized_name)
        VALUES (?, ?, ?)
        `
      ).run(id, rawName, normalized);

      profile = db
        .prepare("SELECT id, client_name FROM client_jumper_profiles WHERE id = ?")
        .get(id) as ProfileRow;
      created = true;
    }

    const session = loadJumperSession(db, profile.id);
    const planRows = loadJumperPlanRows(db, profile.id);
    db.close();

    return NextResponse.json({
      created,
      profile: toProfileView(profile),
      session,
      planRows,
    });
  } catch (error) {
    console.error("Failed to create/load jumper profile:", error);
    return NextResponse.json(
      { error: "Failed to create/load jumper profile" },
      { status: 500 }
    );
  }
}
