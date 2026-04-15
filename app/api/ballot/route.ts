import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getTripState } from "@/lib/phase";
import {
  hasSubmittedBallot,
  listDestinationIds,
  submitBallot,
} from "@/lib/db";

export async function POST(req: Request) {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const approvalsRaw = body?.approvals;
  if (!Array.isArray(approvalsRaw)) {
    return NextResponse.json({ error: "approvals must be an array" }, { status: 400 });
  }
  const approvals = approvalsRaw.map((id) => String(id));

  const state = await getTripState();
  if (state.phase !== "VOTE") {
    return NextResponse.json({ error: "voting not open" }, { status: 400 });
  }

  if (await hasSubmittedBallot(user.id)) {
    return NextResponse.json({ error: "ballot already submitted" }, { status: 400 });
  }

  // Validate each approval: must be a real destination, not the voter's own
  const all = await listDestinationIds();
  const validIds = new Set(all.map((d) => d.id));
  const myDestId = all.find((d) => d.user_id === user.id)?.id;

  for (const id of approvals) {
    if (!validIds.has(id)) {
      return NextResponse.json({ error: `unknown destination ${id}` }, { status: 400 });
    }
    if (id === myDestId) {
      return NextResponse.json({ error: "cannot approve your own pitch" }, { status: 400 });
    }
  }

  // Dedupe
  const unique = Array.from(new Set(approvals));
  await submitBallot(user.id, unique);
  return NextResponse.json({ ok: true });
}
