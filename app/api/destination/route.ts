import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getTripState } from "@/lib/phase";
import { upsertDestination } from "@/lib/db";

export async function POST(req: Request) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const imageUrlRaw = String(body?.imageUrl ?? "").trim();
  const imageUrl =
    imageUrlRaw &&
    imageUrlRaw.length <= 2048 &&
    /^https?:\/\//i.test(imageUrlRaw)
      ? imageUrlRaw
      : null;
  const flagRaw = String(body?.flag ?? "").trim();
  const flag = flagRaw && flagRaw.length <= 16 ? flagRaw : null;

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (name.length > 120 || description.length > 1000) {
    return NextResponse.json({ error: "too long" }, { status: 400 });
  }

  const state = await getTripState();
  if (state.phase !== "SUBMIT") {
    return NextResponse.json({ error: "submission closed" }, { status: 400 });
  }

  const userName = user.name || user.email || "anonymous";
  await upsertDestination({
    userId: user.id,
    userName,
    name,
    flag,
    imageUrl,
    description: description || null,
  });
  return NextResponse.json({ ok: true });
}
