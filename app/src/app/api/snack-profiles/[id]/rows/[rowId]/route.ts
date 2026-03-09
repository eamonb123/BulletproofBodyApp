import { NextResponse } from "next/server";
import { getDb, loadClientSnackRows } from "../../../_lib";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const { id: profileId, rowId } = await params;
  const numericRowId = Number(rowId);

  if (!Number.isFinite(numericRowId)) {
    return NextResponse.json({ error: "Invalid row id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { frequencyPerWeek?: number };
    const frequencyPerWeek = Math.max(
      1,
      Math.min(7, Math.round(body.frequencyPerWeek ?? 7))
    );

    const db = getDb();
    const result = db
      .prepare(
        `
        UPDATE client_snack_rows
        SET frequency_per_week = ?
        WHERE id = ? AND profile_id = ?
        `
      )
      .run(frequencyPerWeek, numericRowId, profileId);

    if (result.changes === 0) {
      db.close();
      return NextResponse.json({ error: "Snack row not found" }, { status: 404 });
    }

    const rows = loadClientSnackRows(db, profileId);
    db.close();

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Failed to update snack row:", error);
    return NextResponse.json(
      { error: "Failed to update snack row" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const { id: profileId, rowId } = await params;
  const numericRowId = Number(rowId);

  if (!Number.isFinite(numericRowId)) {
    return NextResponse.json({ error: "Invalid row id" }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM client_snack_rows WHERE id = ? AND profile_id = ?")
      .run(numericRowId, profileId);

    if (result.changes === 0) {
      db.close();
      return NextResponse.json({ error: "Snack row not found" }, { status: 404 });
    }

    const rows = loadClientSnackRows(db, profileId);
    db.close();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Failed to delete snack row:", error);
    return NextResponse.json(
      { error: "Failed to delete snack row" },
      { status: 500 }
    );
  }
}
