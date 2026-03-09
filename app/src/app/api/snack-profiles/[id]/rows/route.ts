import { NextResponse } from "next/server";
import { getDb, loadClientSnackRows } from "../../_lib";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;

  try {
    const body = (await request.json()) as {
      snackSwapId?: string;
      frequencyPerWeek?: number;
    };

    const snackSwapId = body.snackSwapId?.trim() ?? "";
    const frequencyPerWeek = Math.max(
      1,
      Math.min(7, Math.round(body.frequencyPerWeek ?? 7))
    );

    if (!snackSwapId) {
      return NextResponse.json(
        { error: "Field 'snackSwapId' is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const profileExists = db
      .prepare("SELECT id FROM client_snack_profiles WHERE id = ?")
      .get(profileId);
    if (!profileExists) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const swapExists = db
      .prepare("SELECT id FROM snack_swaps WHERE id = ? AND is_active = 1")
      .get(snackSwapId);
    if (!swapExists) {
      db.close();
      return NextResponse.json({ error: "Snack swap not found" }, { status: 404 });
    }

    const maxDisplayOrderRow = db
      .prepare(
        "SELECT COALESCE(MAX(display_order), 0) AS max_order FROM client_snack_rows WHERE profile_id = ?"
      )
      .get(profileId) as { max_order: number };
    const nextDisplayOrder = maxDisplayOrderRow.max_order + 1;

    db.prepare(
      `
      INSERT INTO client_snack_rows (profile_id, snack_swap_id, frequency_per_week, display_order)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(profile_id, snack_swap_id) DO UPDATE SET
        frequency_per_week = excluded.frequency_per_week
      `
    ).run(profileId, snackSwapId, frequencyPerWeek, nextDisplayOrder);

    const rows = loadClientSnackRows(db, profileId);
    db.close();

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Failed to add snack row:", error);
    return NextResponse.json(
      { error: "Failed to add snack row" },
      { status: 500 }
    );
  }
}
