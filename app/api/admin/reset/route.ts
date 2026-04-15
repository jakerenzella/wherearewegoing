import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { isAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export async function POST() {
  const { user } = await neonAuth();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await sql`TRUNCATE vote, ballot, destination CASCADE`;
  return NextResponse.json({ ok: true });
}
