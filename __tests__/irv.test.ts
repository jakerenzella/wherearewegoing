import { describe, it, expect } from "vitest";
import { computeIRV, type IRVResult } from "@/lib/irv";

// ---------------------------------------------------------------------------
// Seed-data candidates (scripts/seed.mjs)
// Ordered by created_at ASC (same order as candidateIds in production).
// ---------------------------------------------------------------------------
const LISBON = "lisbon"; // demo-1 / Alice
const TOKYO = "tokyo"; // demo-2 / Bob
const MEXICO = "mexico"; // demo-3 / Carla
const REYKJAVIK = "reykjavik"; // demo-4 / Dan
const MARRAKESH = "marrakesh"; // demo-5 / Eve
const HANOI = "hanoi"; // demo-6 / Frank
const BUENOS_AIRES = "buenos-aires"; // demo-7 / Gwen

const ALL_CANDIDATES = [
  LISBON,
  TOKYO,
  MEXICO,
  REYKJAVIK,
  MARRAKESH,
  HANOI,
  BUENOS_AIRES,
];

// Each voter ranks the 6 destinations they didn't pitch.
// In a 7-person trip, each voter's ballot has exactly 6 entries.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert the winner and return the result for further inspection. */
function expectWinner(
  result: IRVResult,
  expectedWinner: string,
): IRVResult {
  expect(result.winnerId).toBe(expectedWinner);
  return result;
}

/** The final round should have no elimination (winner was declared). */
function expectFinalRoundDeclared(result: IRVResult): void {
  const final = result.rounds[result.rounds.length - 1];
  expect(final.eliminated).toBeNull();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IRV algorithm — edge cases", () => {
  it("single candidate wins immediately", () => {
    const result = computeIRV(
      [["a"], ["a"], ["a"]],
      ["a"],
    );
    expectWinner(result, "a");
    expect(result.rounds).toHaveLength(1);
  });

  it("no ballots — first candidate wins by default", () => {
    const result = computeIRV([], ["a", "b"]);
    // With 0 votes, everyone is tied at 0. The last candidate in order
    // gets eliminated until one remains.
    expectWinner(result, "a");
  });

  it("two candidates — simple majority", () => {
    const result = computeIRV(
      [["a", "b"], ["a", "b"], ["b", "a"]],
      ["a", "b"],
    );
    expectWinner(result, "a");
    expect(result.rounds).toHaveLength(1); // 2/3 > 50%
    expectFinalRoundDeclared(result);
  });

  it("two candidates — other side wins", () => {
    const result = computeIRV(
      [["b", "a"], ["b", "a"], ["a", "b"]],
      ["a", "b"],
    );
    expectWinner(result, "b");
    expect(result.rounds).toHaveLength(1);
  });
});

describe("IRV algorithm — three candidates, preference transfer", () => {
  it("no first-round majority, last place eliminated, preferences flow", () => {
    // 5 voters, 3 candidates: a, b, c
    // First prefs: a=2, b=2, c=1  — no majority
    // c eliminated → c's voter had b second → b gets to 3/5 → b wins
    const ballots = [
      ["a", "b", "c"],
      ["a", "c", "b"],
      ["b", "a", "c"],
      ["b", "c", "a"],
      ["c", "b", "a"], // c eliminated → flows to b
    ];
    const result = computeIRV(ballots, ["a", "b", "c"]);
    expectWinner(result, "b");
    expect(result.rounds).toHaveLength(2);

    // Round 1: a=2, b=2, c=1, c eliminated
    expect(result.rounds[0].tallies).toEqual({ a: 2, b: 2, c: 1 });
    expect(result.rounds[0].eliminated).toBe("c");

    // Round 2: a=2, b=3 → b wins
    expect(result.rounds[1].tallies).toEqual({ a: 2, b: 3 });
    expectFinalRoundDeclared(result);
  });

  it("first-round majority skips elimination", () => {
    const ballots = [
      ["a", "b", "c"],
      ["a", "c", "b"],
      ["a", "b", "c"],
      ["b", "a", "c"],
      ["c", "b", "a"],
    ];
    const result = computeIRV(ballots, ["a", "b", "c"]);
    expectWinner(result, "a"); // 3/5 > 50%
    expect(result.rounds).toHaveLength(1);
  });
});

describe("IRV algorithm — tie-breaking at elimination", () => {
  it("tied candidates: later-submitted one is eliminated", () => {
    // 4 voters, 3 candidates: a, b, c (created in that order)
    // First prefs: a=2, b=1, c=1 — no majority
    // b and c tied at 1. c is later in candidateIds → c eliminated.
    const ballots = [
      ["a", "b", "c"],
      ["a", "c", "b"],
      ["b", "c", "a"],
      ["c", "b", "a"],
    ];
    const result = computeIRV(ballots, ["a", "b", "c"]);

    // Round 1: a=2, b=1, c=1. c eliminated (later in candidate order)
    expect(result.rounds[0].tallies).toEqual({ a: 2, b: 1, c: 1 });
    expect(result.rounds[0].eliminated).toBe("c");

    // Round 2: c's voter flows to b → a=2, b=2. Tie at top — neither is >50%.
    // But with 2 candidates left and both at 2, a has 2/4 = 50% which is NOT
    // strictly > 50%, so b gets eliminated (later in order), a wins.
    expectWinner(result, "a");
  });

  it("three-way tie at elimination — last in order eliminated", () => {
    // 3 voters, 3 candidates: x, y, z
    // First prefs: x=1, y=1, z=1  — three-way tie
    // z eliminated (last in candidate order)
    const ballots = [
      ["x", "y", "z"],
      ["y", "z", "x"],
      ["z", "x", "y"],
    ];
    const result = computeIRV(ballots, ["x", "y", "z"]);
    expect(result.rounds[0].eliminated).toBe("z");
  });
});

describe("IRV algorithm — using seed destinations (7 candidates)", () => {
  it("unanimous first preference — immediate win in round 1", () => {
    // All 7 voters rank Tokyo first.
    // Each voter can't rank their own pitch, but for the pure algorithm test
    // we just provide ballots directly. Simulating: everyone loves Tokyo.
    const ballots = [
      [TOKYO, LISBON, MEXICO, REYKJAVIK, MARRAKESH, HANOI, BUENOS_AIRES],
      [TOKYO, MEXICO, LISBON, HANOI, MARRAKESH, REYKJAVIK, BUENOS_AIRES],
      [TOKYO, HANOI, REYKJAVIK, LISBON, BUENOS_AIRES, MEXICO, MARRAKESH],
      [TOKYO, BUENOS_AIRES, MARRAKESH, MEXICO, LISBON, HANOI, REYKJAVIK],
      [TOKYO, REYKJAVIK, LISBON, HANOI, MEXICO, BUENOS_AIRES, MARRAKESH],
      [TOKYO, MARRAKESH, BUENOS_AIRES, REYKJAVIK, HANOI, LISBON, MEXICO],
      [TOKYO, LISBON, HANOI, BUENOS_AIRES, MEXICO, REYKJAVIK, MARRAKESH],
    ];
    const result = computeIRV(ballots, ALL_CANDIDATES);
    expectWinner(result, TOKYO);
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].tallies[TOKYO]).toBe(7);
  });

  it("close race — winner only emerges after multiple eliminations", () => {
    // Realistic scenario: preferences are split, winner needs redistributions.
    //
    // Voter allocations (each voter excludes their own pitch):
    //   Alice (demo-1): ranks Tokyo, Mexico, Reykjavik, Marrakesh, Hanoi, Buenos Aires
    //   Bob   (demo-2): ranks Mexico, Lisbon, Hanoi, Reykjavik, Marrakesh, Buenos Aires
    //   Carla (demo-3): ranks Lisbon, Tokyo, Buenos Aires, Hanoi, Reykjavik, Marrakesh
    //   Dan   (demo-4): ranks Marrakesh, Hanoi, Tokyo, Lisbon, Mexico, Buenos Aires
    //   Eve   (demo-5): ranks Hanoi, Buenos Aires, Lisbon, Tokyo, Mexico, Reykjavik
    //   Frank (demo-6): ranks Buenos Aires, Tokyo, Lisbon, Mexico, Reykjavik, Marrakesh
    //   Gwen  (demo-7): ranks Lisbon, Reykjavik, Tokyo, Marrakesh, Hanoi, Mexico
    const ballots = [
      [TOKYO, MEXICO, REYKJAVIK, MARRAKESH, HANOI, BUENOS_AIRES],      // Alice
      [MEXICO, LISBON, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES],     // Bob
      [LISBON, TOKYO, BUENOS_AIRES, HANOI, REYKJAVIK, MARRAKESH],      // Carla
      [MARRAKESH, HANOI, TOKYO, LISBON, MEXICO, BUENOS_AIRES],         // Dan
      [HANOI, BUENOS_AIRES, LISBON, TOKYO, MEXICO, REYKJAVIK],         // Eve
      [BUENOS_AIRES, TOKYO, LISBON, MEXICO, REYKJAVIK, MARRAKESH],     // Frank
      [LISBON, REYKJAVIK, TOKYO, MARRAKESH, HANOI, MEXICO],            // Gwen
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // First prefs: Lisbon=2, Tokyo=1, Mexico=1, Marrakesh=1, Hanoi=1, Buenos Aires=1
    // Reykjavik=0 → eliminated first (no first-preference votes)
    expect(result.rounds[0].tallies[LISBON]).toBe(2);
    expect(result.rounds[0].tallies[TOKYO]).toBe(1);
    expect(result.rounds[0].tallies[REYKJAVIK]).toBe(0);
    expect(result.rounds[0].eliminated).toBe(REYKJAVIK);

    // Should take multiple rounds to resolve
    expect(result.rounds.length).toBeGreaterThan(2);
    expectFinalRoundDeclared(result);
    // The winner should be one of the candidates
    expect(ALL_CANDIDATES).toContain(result.winnerId);
  });

  it("tracks correct elimination order through all rounds", () => {
    // Construct ballots so elimination order is deterministic:
    //   Buenos Aires has 0 first prefs → eliminated R1
    //   Marrakesh has 0 first prefs after redistribution → eliminated R2
    //   Then cascade continues...
    //
    // First prefs: Lisbon=2, Tokyo=2, Mexico=1, Hanoi=1, Reykjavik=1,
    //              Marrakesh=0, Buenos Aires=0
    const ballots = [
      [LISBON, TOKYO, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [LISBON, MEXICO, TOKYO, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [TOKYO, LISBON, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [TOKYO, MEXICO, LISBON, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [MEXICO, LISBON, TOKYO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [HANOI, REYKJAVIK, LISBON, TOKYO, MEXICO, BUENOS_AIRES, MARRAKESH],
      [REYKJAVIK, HANOI, LISBON, TOKYO, MEXICO, MARRAKESH, BUENOS_AIRES],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // Round 1: Marrakesh=0, Buenos Aires=0. Tied → Buenos Aires eliminated
    //          (later in candidate order)
    expect(result.rounds[0].eliminated).toBe(BUENOS_AIRES);

    // Round 2: Marrakesh still 0 → eliminated
    expect(result.rounds[1].eliminated).toBe(MARRAKESH);

    // Verify every eliminated candidate appears exactly once
    const eliminated = result.rounds
      .filter((r) => r.eliminated)
      .map((r) => r.eliminated!);
    expect(new Set(eliminated).size).toBe(eliminated.length);

    // At most candidates - 1 eliminations (fewer if majority reached early)
    expect(eliminated.length).toBeLessThan(ALL_CANDIDATES.length);
    expect(eliminated.length).toBeGreaterThan(0);
    // The winner is NOT in the eliminated set
    expect(eliminated).not.toContain(result.winnerId);
  });

  it("preference redistribution changes the outcome", () => {
    // Without IRV (plurality): Tokyo wins with 3 first prefs.
    // With IRV: Tokyo's opponents' preferences converge on Lisbon.
    //
    // First prefs: Tokyo=3, Lisbon=2, Mexico=1, Hanoi=1
    // But every non-Tokyo voter has Lisbon as 2nd preference.
    // As candidates get eliminated, their votes flow to Lisbon.
    const ballots = [
      [TOKYO, MEXICO, LISBON, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [TOKYO, LISBON, MEXICO, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [TOKYO, HANOI, LISBON, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [LISBON, MEXICO, TOKYO, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [LISBON, TOKYO, MEXICO, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [MEXICO, LISBON, TOKYO, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [HANOI, LISBON, MEXICO, TOKYO, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // Plurality would say Tokyo (3 first prefs) but IRV should give Lisbon
    // because all 4 non-Tokyo first-pref voters prefer Lisbon over Tokyo.
    expectWinner(result, LISBON);

    // Verify Tokyo had the most first-preference votes
    expect(result.rounds[0].tallies[TOKYO]).toBe(3);
    expect(result.rounds[0].tallies[LISBON]).toBe(2);
  });

  it("exhausted ballots — voters whose remaining prefs are all eliminated", () => {
    // All 7 candidates, but some ballots only rank a subset of candidates.
    // (In our app we require complete ballots, but the algorithm should still
    // handle partial ballots gracefully in case of future changes.)
    const ballots = [
      [LISBON, TOKYO],                    // partial — only 2 ranked
      [LISBON],                           // partial — only 1 ranked
      [TOKYO, LISBON],                    // partial
      [MEXICO, TOKYO, LISBON],            // partial
      [MEXICO, HANOI, REYKJAVIK, TOKYO],  // partial
      [HANOI, MEXICO, TOKYO, LISBON],     // partial
      [REYKJAVIK, HANOI, MEXICO],         // partial
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // Should still produce a winner without crashing
    expect(result.winnerId).toBeTruthy();
    expect(ALL_CANDIDATES).toContain(result.winnerId);
    expectFinalRoundDeclared(result);
  });
});

describe("IRV algorithm — round tally integrity", () => {
  it("total votes in each round never exceeds ballot count", () => {
    const ballots = [
      [TOKYO, LISBON, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [LISBON, TOKYO, MEXICO, REYKJAVIK, HANOI, BUENOS_AIRES, MARRAKESH],
      [MEXICO, LISBON, TOKYO, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [HANOI, REYKJAVIK, MARRAKESH, TOKYO, LISBON, MEXICO, BUENOS_AIRES],
      [BUENOS_AIRES, MARRAKESH, REYKJAVIK, HANOI, MEXICO, LISBON, TOKYO],
      [REYKJAVIK, BUENOS_AIRES, MARRAKESH, HANOI, TOKYO, LISBON, MEXICO],
      [MARRAKESH, HANOI, BUENOS_AIRES, REYKJAVIK, TOKYO, LISBON, MEXICO],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    for (const round of result.rounds) {
      const total = Object.values(round.tallies).reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(ballots.length);
      // Each tally is non-negative
      for (const count of Object.values(round.tallies)) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("eliminated candidates do not appear in subsequent round tallies", () => {
    const ballots = [
      [LISBON, TOKYO, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [TOKYO, LISBON, MEXICO, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [MEXICO, TOKYO, LISBON, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [REYKJAVIK, LISBON, TOKYO, MEXICO, HANOI, BUENOS_AIRES, MARRAKESH],
      [HANOI, MEXICO, LISBON, TOKYO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [MARRAKESH, HANOI, REYKJAVIK, TOKYO, LISBON, MEXICO, BUENOS_AIRES],
      [BUENOS_AIRES, MARRAKESH, HANOI, REYKJAVIK, TOKYO, LISBON, MEXICO],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);
    const eliminatedSoFar = new Set<string>();

    for (const round of result.rounds) {
      // No previously eliminated candidate should have a tally entry
      for (const gone of eliminatedSoFar) {
        expect(round.tallies).not.toHaveProperty(gone);
      }
      if (round.eliminated) {
        eliminatedSoFar.add(round.eliminated);
      }
    }
  });

  it("each round reduces the candidate count by exactly one (or declares winner)", () => {
    const ballots = [
      [LISBON, TOKYO, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [TOKYO, MEXICO, LISBON, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [MEXICO, LISBON, TOKYO, HANOI, BUENOS_AIRES, REYKJAVIK, MARRAKESH],
      [HANOI, REYKJAVIK, MARRAKESH, LISBON, TOKYO, MEXICO, BUENOS_AIRES],
      [MARRAKESH, HANOI, REYKJAVIK, BUENOS_AIRES, LISBON, TOKYO, MEXICO],
      [REYKJAVIK, BUENOS_AIRES, MARRAKESH, HANOI, MEXICO, LISBON, TOKYO],
      [BUENOS_AIRES, MARRAKESH, HANOI, REYKJAVIK, MEXICO, TOKYO, LISBON],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);
    let candidateCount = ALL_CANDIDATES.length;

    for (const round of result.rounds) {
      expect(Object.keys(round.tallies)).toHaveLength(candidateCount);
      if (round.eliminated) {
        candidateCount--;
      }
    }
  });
});

describe("IRV algorithm — real-world scenarios with seed data", () => {
  it("condorcet-style winner beats every other candidate head-to-head", () => {
    // Lisbon is ranked 1st or 2nd by everyone — a consensus favourite.
    // Even though it's not everyone's #1, it should win via preference flow.
    const ballots = [
      [TOKYO, LISBON, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
      [MEXICO, LISBON, TOKYO, HANOI, REYKJAVIK, BUENOS_AIRES, MARRAKESH],
      [HANOI, LISBON, TOKYO, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [REYKJAVIK, LISBON, TOKYO, MEXICO, HANOI, BUENOS_AIRES, MARRAKESH],
      [MARRAKESH, LISBON, HANOI, TOKYO, REYKJAVIK, MEXICO, BUENOS_AIRES],
      [BUENOS_AIRES, LISBON, MARRAKESH, HANOI, TOKYO, MEXICO, REYKJAVIK],
      [LISBON, TOKYO, MEXICO, REYKJAVIK, HANOI, MARRAKESH, BUENOS_AIRES],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);
    expectWinner(result, LISBON);
  });

  it("dark horse wins — last in first prefs but everyone's second choice", () => {
    // Hanoi gets 0 first preferences but is ranked 2nd by all voters.
    // In a tight race, redistributed votes should flow to Hanoi.
    //
    // First prefs are spread: each of the other 6 gets exactly 1 first pref.
    // Ties broken by candidate order (later eliminated first).
    // As each is eliminated, their voter's 2nd pref (Hanoi) was already gone
    // from their ballots... Hmm, let's make Hanoi their 2nd.
    //
    // Actually, Hanoi can't win with 0 first prefs if every elimination
    // only looks at remaining candidates. Let me construct carefully:
    //
    // 7 voters, Hanoi gets 1 first pref. Others: Lisbon=1, Tokyo=1, Mexico=1,
    // Reykjavik=1, Marrakesh=1, Buenos Aires=1.
    // All non-Hanoi voters rank Hanoi 2nd.
    // First elimination: Buenos Aires (tied, last in order).
    //   Buenos Aires voter → Hanoi. Now Hanoi=2.
    // Second elimination: Marrakesh (tied among 1-vote candidates, last remaining).
    //   Marrakesh voter → Hanoi. Now Hanoi=3.
    // This continues until Hanoi accumulates majority.
    const ballots = [
      [LISBON, HANOI, TOKYO, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [TOKYO, HANOI, LISBON, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [MEXICO, HANOI, LISBON, TOKYO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
      [REYKJAVIK, HANOI, LISBON, TOKYO, MEXICO, MARRAKESH, BUENOS_AIRES],
      [MARRAKESH, HANOI, LISBON, TOKYO, MEXICO, REYKJAVIK, BUENOS_AIRES],
      [BUENOS_AIRES, HANOI, LISBON, TOKYO, MEXICO, REYKJAVIK, MARRAKESH],
      [HANOI, LISBON, TOKYO, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // First prefs: each has 1. Hanoi should accumulate votes as others are
    // eliminated, because it's everyone's 2nd preference.
    expectWinner(result, HANOI);

    // Verify Hanoi started with just 1 first-preference vote
    expect(result.rounds[0].tallies[HANOI]).toBe(1);
  });

  it("polarising destination loses despite strong first-pref support", () => {
    // Tokyo gets 3 first prefs (most), but no one else ranks it high.
    // Lisbon gets only 2 first prefs but is widely liked (ranked 2nd/3rd by all).
    // The other 2 voters go to Mexico and Hanoi.
    //
    // Non-Tokyo voters all have Lisbon early in their rankings.
    // As losers are eliminated, their votes flow to Lisbon, not Tokyo.
    const ballots = [
      [TOKYO, BUENOS_AIRES, MARRAKESH, REYKJAVIK, HANOI, MEXICO, LISBON],
      [TOKYO, MARRAKESH, BUENOS_AIRES, REYKJAVIK, HANOI, MEXICO, LISBON],
      [TOKYO, REYKJAVIK, MARRAKESH, BUENOS_AIRES, HANOI, MEXICO, LISBON],
      [LISBON, MEXICO, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES, TOKYO],
      [LISBON, HANOI, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES, TOKYO],
      [MEXICO, LISBON, HANOI, REYKJAVIK, MARRAKESH, BUENOS_AIRES, TOKYO],
      [HANOI, LISBON, MEXICO, REYKJAVIK, MARRAKESH, BUENOS_AIRES, TOKYO],
    ];

    const result = computeIRV(ballots, ALL_CANDIDATES);

    // Tokyo had the plurality (3 votes) but should lose to Lisbon in IRV
    expect(result.rounds[0].tallies[TOKYO]).toBe(3);
    expect(result.rounds[0].tallies[LISBON]).toBe(2);
    expectWinner(result, LISBON);
  });
});
