import { NextResponse } from "next/server";
import {
  clampFrequency,
  findJumperProfileById,
  getDb,
  loadJumperSession,
  sanitizeSelectedOrderIdsByRestaurant,
  upsertJumperSession,
} from "../../_lib";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;

  try {
    const body = (await request.json()) as {
      frequency?: number;
      selectedRestaurantId?: string | null;
      selectedOrderIdsByRestaurant?: unknown;
    };

    const db = getDb();
    const profile = findJumperProfileById(db, profileId);
    if (!profile) {
      db.close();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const current = loadJumperSession(db, profileId);
    const nextFrequency =
      typeof body.frequency === "number"
        ? clampFrequency(body.frequency)
        : current.frequency;

    const nextRestaurantId =
      body.selectedRestaurantId === undefined
        ? current.selectedRestaurantId
        : body.selectedRestaurantId?.trim() || null;

    const nextOrderIds =
      body.selectedOrderIdsByRestaurant === undefined
        ? current.selectedOrderIdsByRestaurant
        : sanitizeSelectedOrderIdsByRestaurant(body.selectedOrderIdsByRestaurant);

    upsertJumperSession(db, profileId, {
      frequency: nextFrequency,
      selectedRestaurantId: nextRestaurantId,
      selectedOrderIdsByRestaurant: nextOrderIds,
    });

    const session = loadJumperSession(db, profileId);
    db.close();

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to update jumper session:", error);
    return NextResponse.json(
      { error: "Failed to update jumper session" },
      { status: 500 }
    );
  }
}
