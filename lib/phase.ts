import "server-only";
import { allowedEmails } from "./allowlist";
import { listDestinations, countBallots, type DestinationRow } from "./db";

export type Phase = "SUBMIT" | "VOTE" | "REVEAL";

export type TripState = {
  phase: Phase;
  total: number;
  destinations: DestinationRow[];
  ballotsCount: number;
};

export async function getTripState(): Promise<TripState> {
  const total = allowedEmails().length;

  const [destinations, ballotsCount] = await Promise.all([
    listDestinations(),
    countBallots(),
  ]);

  let phase: Phase = "SUBMIT";
  if (total > 0 && destinations.length >= total) phase = "VOTE";
  if (phase === "VOTE" && ballotsCount >= total) phase = "REVEAL";

  return { phase, total, destinations, ballotsCount };
}
