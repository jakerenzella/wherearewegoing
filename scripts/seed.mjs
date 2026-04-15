#!/usr/bin/env node
// Demo seed: populate fake pitches (and optional fake ballots) so you can
// test the SUBMIT / VOTE / REVEAL phases end-to-end without 7 real humans.
//
// Run via package scripts:
//   npm run demo            # 6 pitches, no ballots — you pitch #7 → VOTE
//   npm run demo:ballots    # 6 pitches + 6 ballots — you pitch + ballot → REVEAL
//   npm run demo:full       # 7 pitches + 7 ballots — pure spectator REVEAL

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Make sure .env.local exists and run via npm scripts.",
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const args = new Set(process.argv.slice(2));
const MODE = args.has("--reset")
  ? "reset"
  : args.has("--full")
    ? "full"
    : args.has("--ballots")
      ? "ballots"
      : "pitches";

const PLACES = [
  {
    name: "Lisbon",
    flag: "🇵🇹",
    pitcher: "Alice",
    wikiTitle: "Lisbon",
    description: "Sunny, cheap, amazing seafood. Pastel de nata every morning.",
  },
  {
    name: "Tokyo",
    flag: "🇯🇵",
    pitcher: "Bob",
    wikiTitle: "Tokyo",
    description: "Ramen, temples, vending machines, jet lag worth it.",
  },
  {
    name: "Mexico City",
    flag: "🇲🇽",
    pitcher: "Carla",
    wikiTitle: "Mexico City",
    description: "Best food scene in the world. Don't @ me.",
  },
  {
    name: "Reykjavík",
    flag: "🇮🇸",
    pitcher: "Dan",
    wikiTitle: "Reykjavík",
    description: "Northern lights + hot springs + impossibly cute town.",
  },
  {
    name: "Marrakesh",
    flag: "🇲🇦",
    pitcher: "Eve",
    wikiTitle: "Marrakesh",
    description: "Riads, tagines, the medina at sunset. Sensory overload, the good kind.",
  },
  {
    name: "Hanoi",
    flag: "🇻🇳",
    pitcher: "Frank",
    wikiTitle: "Hanoi",
    description: "Motorbike chaos, pho for breakfast, bánh mì for lunch.",
  },
  {
    name: "Buenos Aires",
    flag: "🇦🇷",
    pitcher: "Gwen",
    wikiTitle: "Buenos Aires",
    description: "Steak, tango, and staying out until 4am like it's normal.",
  },
];

async function fetchImage(title) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  if (MODE === "reset") {
    console.log("\n🧹  Wiping all pitches, ballots, and votes…");
    await sql`TRUNCATE vote, ballot, destination CASCADE`;
    console.log("✅  Cleared. Trip is back to empty SUBMIT phase.\n");
    return;
  }

  const pitchCount = MODE === "full" ? 7 : 6;
  const ballots = MODE === "full" || MODE === "ballots";

  console.log(
    `\n🛫  Demo seed — mode: ${MODE}  ·  ${pitchCount} pitches  ·  ballots: ${ballots ? "yes" : "no"}\n`,
  );

  console.log("Wiping existing pitches + ballots + votes…");
  await sql`TRUNCATE vote, ballot, destination CASCADE`;

  const places = PLACES.slice(0, pitchCount);
  const inserted = [];

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const userId = `demo-${i + 1}`;
    process.stdout.write(
      `  [${i + 1}/${places.length}] ${p.name.padEnd(15)} · fetching image… `,
    );
    const imageUrl = await fetchImage(p.wikiTitle);
    console.log(imageUrl ? "✓" : "no image");

    const rows = await sql`
      INSERT INTO destination (user_id, user_name, name, flag, image_url, description)
      VALUES (${userId}, ${p.pitcher}, ${p.name}, ${p.flag}, ${imageUrl}, ${p.description})
      RETURNING id, user_id
    `;
    inserted.push(rows[0]);
  }

  if (ballots) {
    console.log("\nCasting fake ballots…");
    const allDests = await sql`SELECT id, user_id FROM destination`;
    for (const voter of inserted) {
      const others = allDests.filter((d) => d.user_id !== voter.user_id);
      const n = 2 + Math.floor(Math.random() * 3); // approve 2–4 others
      const picks = shuffle(others).slice(0, n);
      for (const dest of picks) {
        await sql`
          INSERT INTO vote (voter_id, destination_id)
          VALUES (${voter.user_id}, ${dest.id})
          ON CONFLICT (voter_id, destination_id) DO NOTHING
        `;
      }
      await sql`
        INSERT INTO ballot (voter_id) VALUES (${voter.user_id})
        ON CONFLICT (voter_id) DO NOTHING
      `;
      console.log(`  ✓ ${voter.user_id} approved ${picks.length}`);
    }
  }

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  console.log("\n✅  Done.\n");
  console.log("Next step — make sure ALLOWED_EMAILS has 7 entries so total = 7:");
  console.log(
    `  You currently have ${allowed.length} email${allowed.length === 1 ? "" : "s"} in ALLOWED_EMAILS.`,
  );
  if (allowed.length !== 7) {
    console.log("\n  Paste this into your .env.local to match the 7-person demo:");
    const yours = allowed[0] ?? "you@example.com";
    const fakes = [
      "demo-1@wawg.local",
      "demo-2@wawg.local",
      "demo-3@wawg.local",
      "demo-4@wawg.local",
      "demo-5@wawg.local",
      "demo-6@wawg.local",
    ];
    console.log(`  ALLOWED_EMAILS=${yours},${fakes.join(",")}`);
  }

  if (MODE === "pitches") {
    console.log(
      "\n  Now sign in and pitch your 7th destination → phase flips to VOTE.",
    );
  } else if (MODE === "ballots") {
    console.log(
      "\n  Now sign in → pitch your 7th → submit your ballot → phase flips to REVEAL.",
    );
  } else {
    console.log(
      "\n  Sign in to see the REVEAL screen with fake vote counts. Nothing to do.",
    );
    console.log(
      "  Heads up: you won't be able to pitch — there's already a 7th destination seeded.",
    );
  }
  console.log();
}

main().catch((e) => {
  console.error("\n✕  Seed failed:", e);
  process.exit(1);
});
