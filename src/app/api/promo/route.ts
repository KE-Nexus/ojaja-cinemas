import { NextResponse } from "next/server";
import { applyPromoCode } from "@/lib/booking";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  const subtotal = typeof body?.subtotal === "number" ? body.subtotal : 0;

  if (!code) return NextResponse.json({ error: "Enter a promo code." }, { status: 400 });

  const result = await applyPromoCode(code, subtotal);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ discount: result.discount });
}
