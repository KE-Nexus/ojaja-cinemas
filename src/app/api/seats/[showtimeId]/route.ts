import { NextResponse } from "next/server";
import { getShowtimeWithSeatMap } from "@/lib/booking";

export async function GET(request: Request, { params }: { params: Promise<{ showtimeId: string }> }) {
  const { showtimeId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? undefined;
  const data = await getShowtimeWithSeatMap(showtimeId, sessionId);
  if (!data) return NextResponse.json({ error: "Showtime not found" }, { status: 404 });

  return NextResponse.json({
    seats: data.seats,
    rows: data.rows,
    seatsPerRow: data.seatsPerRow,
    basePrice: data.showtime.basePrice,
  });
}
