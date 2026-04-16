import "server-only";

/**
 * Instant-runoff voting (IRV) — Australian-style preferential voting.
 *
 * Each ballot is an ordered array of candidate IDs (index 0 = first preference).
 * Rounds:
 *   1. Count first-preference votes for each remaining candidate.
 *   2. If a candidate has a strict majority (> 50%), they win.
 *   3. Otherwise, eliminate the candidate with the fewest first-preference votes.
 *      Tie-break: eliminate the candidate submitted latest (highest index in candidateIds).
 *   4. Redistribute eliminated candidate's ballots to the next-preferred remaining candidate.
 *   5. Repeat.
 */

export type IRVRound = {
  round: number;
  /** candidate ID → number of ballots whose top remaining preference is this candidate */
  tallies: Record<string, number>;
  /** candidate eliminated this round, or null if a winner was found */
  eliminated: string | null;
};

export type IRVResult = {
  winnerId: string;
  rounds: IRVRound[];
};

export function computeIRV(
  ballots: string[][],
  candidateIds: string[],
): IRVResult {
  const rounds: IRVRound[] = [];
  const remaining = new Set(candidateIds);

  // If there are no candidates or no ballots, return the first candidate
  if (candidateIds.length === 0) {
    return { winnerId: "", rounds: [] };
  }
  if (candidateIds.length === 1) {
    return {
      winnerId: candidateIds[0],
      rounds: [{ round: 1, tallies: { [candidateIds[0]]: ballots.length }, eliminated: null }],
    };
  }

  while (remaining.size > 1) {
    // Count first preferences among remaining candidates
    const tallies: Record<string, number> = {};
    for (const id of remaining) tallies[id] = 0;

    for (const ballot of ballots) {
      const topChoice = ballot.find((id) => remaining.has(id));
      if (topChoice) tallies[topChoice]++;
    }

    const totalVotes = Object.values(tallies).reduce((a, b) => a + b, 0);

    // Check for majority
    for (const [id, count] of Object.entries(tallies)) {
      if (count * 2 > totalVotes) {
        rounds.push({ round: rounds.length + 1, tallies, eliminated: null });
        return { winnerId: id, rounds };
      }
    }

    // Find the minimum vote count
    let minCount = Infinity;
    for (const count of Object.values(tallies)) {
      if (count < minCount) minCount = count;
    }

    // Candidates tied at the minimum
    const lowestCandidates = Object.entries(tallies)
      .filter(([, count]) => count === minCount)
      .map(([id]) => id);

    // Tie-break: eliminate the one that appears latest in the original candidateIds order
    // (i.e. the one submitted most recently — rewards earlier submissions)
    let eliminated: string;
    if (lowestCandidates.length === 1) {
      eliminated = lowestCandidates[0];
    } else {
      eliminated = lowestCandidates.reduce((latest, id) => {
        return candidateIds.indexOf(id) > candidateIds.indexOf(latest) ? id : latest;
      });
    }

    rounds.push({ round: rounds.length + 1, tallies, eliminated });
    remaining.delete(eliminated);
  }

  // Last candidate standing
  const winnerId = [...remaining][0];
  return { winnerId, rounds };
}
