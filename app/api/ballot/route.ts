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
  const rankingsRaw = body?.rankings;
  if (!Array.isArray(rankingsRaw)) {
    return NextResponse.json({ error: "rankings must be an array" }, { status: 400 });
  }
  const rankings = rankingsRaw.map((id) => String(id));

  const state = await getTripState();
  if (state.phase !== "VOTE") {
    return NextResponse.json({ error: "voting not open" }, { status: 400 });
  }

  if (await hasSubmittedBallot(user.id)) {
    return NextResponse.json({ error: "ballot already submitted" }, { status: 400 });
  }

  // Validate each ranking: must be a real destination, not the voter's own
  const all = await listDestinationIds();
  const validIds = new Set(all.map((d) => d.id));
  const myDestId = all.find((d) => d.user_id === user.id)?.id;
  const otherDestIds = all.filter((d) => d.user_id !== user.id).map((d) => d.id);

  // Must rank all other destinations (complete ballot required for IRV)
  if (rankings.length !== otherDestIds.length) {
    return NextResponse.json(
      { error: `must rank all ${otherDestIds.length} destinations` },
      { status: 400 },
    );
  }

  // Check for duplicates
  if (new Set(rankings).size !== rankings.length) {
    return NextResponse.json({ error: "duplicate rankings not allowed" }, { status: 400 });
  }

  for (const id of rankings) {
    if (!validIds.has(id)) {
      return NextResponse.json({ error: `unknown destination ${id}` }, { status: 400 });
    }
    if (id === myDestId) {
      return NextResponse.json({ error: "cannot rank your own pitch" }, { status: 400 });
    }
  }

  await submitBallot(user.id, rankings);
  return NextResponse.json({ ok: true });
}
