import { NextResponse } from "next/server";
import {
  findJumperProfileById,
  getDb,
  loadJumperPlanRows,
  loadJumperSession,
  toProfileView,
} from "../_lib";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = getDb({ readonly: true });
    const profile = findJumperProfileById(db, id);

    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
    console.error("Failed to load jumper profile:", error);
    return NextResponse.json(
      { error: "Failed to load jumper profile" },
      { status: 500 }
    );
  }
}
