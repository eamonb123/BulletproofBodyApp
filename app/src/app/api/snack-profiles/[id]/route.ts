import { NextResponse } from "next/server";
import { getDb, loadClientSnackRows } from "../_lib";

interface ProfileRow {
  id: string;
  client_name: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = getDb({ readonly: true });
    const profile = db
      .prepare("SELECT id, client_name FROM client_snack_profiles WHERE id = ?")
      .get(id) as ProfileRow | undefined;

    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
    console.error("Failed to load snack profile:", error);
    return NextResponse.json(
      { error: "Failed to load snack profile" },
      { status: 500 }
    );
  }
}
