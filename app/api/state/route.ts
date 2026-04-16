import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getTripState } from "@/lib/phase";
import { getMyRankings, hasSubmittedBallot, getAllRankings } from "@/lib/db";
import { computeIRV, type IRVResult } from "@/lib/irv";

export async function GET() {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = await getTripState();
  const [myRankings, myBallotSubmitted] = await Promise.all([
    getMyRankings(user.id),
    hasSubmittedBallot(user.id),
  ]);
  const myDestination = state.destinations.find((d) => d.user_id === user.id) ?? null;

  const destinations = state.destinations.map((d) => ({
    id: d.id,
    userId: d.user_id,
    userName: d.user_name,
    isMine: d.user_id === user.id,
    name: state.phase === "SUBMIT" ? null : d.name,
    flag: state.phase === "SUBMIT" ? null : d.flag,
    imageUrl: state.phase === "SUBMIT" ? null : d.image_url,
    description: state.phase === "SUBMIT" ? null : d.description,
    voteCount: state.phase === "REVEAL" ? d.vote_count : null,
  }));

  // Compute IRV results in REVEAL phase
  let irvResult: IRVResult | null = null;
  if (state.phase === "REVEAL") {
    const allRankings = await getAllRankings();
    // Group rankings into per-voter ballots (ordered arrays of destination IDs)
    const ballotMap = new Map<string, string[]>();
    for (const r of allRankings) {
      if (!ballotMap.has(r.voter_id)) ballotMap.set(r.voter_id, []);
      ballotMap.get(r.voter_id)!.push(r.destination_id);
    }
    const ballots = [...ballotMap.values()];
    // candidateIds in created_at order (same as destinations order)
    const candidateIds = state.destinations.map((d) => d.id);
    irvResult = computeIRV(ballots, candidateIds);
  }

  return NextResponse.json({
    phase: state.phase,
    total: state.total,
    submittedCount: state.destinations.length,
    ballotsCount: state.ballotsCount,
    destinations,
    me: { id: user.id, email: user.email, name: user.name },
    mySubmission: myDestination
      ? {
          name: myDestination.name,
          flag: myDestination.flag,
          imageUrl: myDestination.image_url,
          description: myDestination.description,
        }
      : null,
    myRankings,
    myBallotSubmitted,
    irvResult,
  });
}
