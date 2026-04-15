import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getTripState } from "@/lib/phase";
import { getMyApprovals, hasSubmittedBallot } from "@/lib/db";

export async function GET() {
  const { user } = await neonAuth();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = await getTripState();
  const [myApprovals, myBallotSubmitted] = await Promise.all([
    getMyApprovals(user.id),
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
    myApprovals,
    myBallotSubmitted,
  });
}
