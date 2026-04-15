import "server-only";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

export type DestinationRow = {
  id: string;
  user_id: string;
  user_name: string;
  name: string;
  flag: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  vote_count: number;
};

export async function listDestinations(): Promise<DestinationRow[]> {
  const rows = await sql`
    SELECT d.id, d.user_id, d.user_name, d.name, d.flag, d.image_url, d.description, d.created_at,
           COUNT(v.id)::int AS vote_count
    FROM destination d
    LEFT JOIN vote v ON v.destination_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at ASC
  `;
  return rows as DestinationRow[];
}

export async function countBallots(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM ballot`;
  return (rows[0] as { count: number }).count;
}

export async function hasSubmittedBallot(voterId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM ballot WHERE voter_id = ${voterId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function getMyApprovals(voterId: string): Promise<string[]> {
  const rows = await sql`
    SELECT destination_id FROM vote WHERE voter_id = ${voterId}
  `;
  return (rows as Array<{ destination_id: string }>).map((r) => r.destination_id);
}

export async function upsertDestination(params: {
  userId: string;
  userName: string;
  name: string;
  flag: string | null;
  imageUrl: string | null;
  description: string | null;
}): Promise<void> {
  const { userId, userName, name, flag, imageUrl, description } = params;
  await sql`
    INSERT INTO destination (user_id, user_name, name, flag, image_url, description)
    VALUES (${userId}, ${userName}, ${name}, ${flag}, ${imageUrl}, ${description})
    ON CONFLICT (user_id)
    DO UPDATE SET user_name = EXCLUDED.user_name,
                  name = EXCLUDED.name,
                  flag = EXCLUDED.flag,
                  image_url = EXCLUDED.image_url,
                  description = EXCLUDED.description
  `;
}

export async function findOwnDestination(
  userId: string,
): Promise<{ id: string } | null> {
  const rows = await sql`
    SELECT id FROM destination WHERE user_id = ${userId} LIMIT 1
  `;
  return (rows[0] as { id: string } | undefined) ?? null;
}

export async function listDestinationIds(): Promise<Array<{ id: string; user_id: string }>> {
  const rows = await sql`SELECT id, user_id FROM destination`;
  return rows as Array<{ id: string; user_id: string }>;
}

export async function submitBallot(
  voterId: string,
  destinationIds: string[],
): Promise<void> {
  // Replace existing approvals — wipe and re-insert. Then mark ballot as submitted.
  await sql`DELETE FROM vote WHERE voter_id = ${voterId}`;
  for (const destinationId of destinationIds) {
    await sql`
      INSERT INTO vote (voter_id, destination_id)
      VALUES (${voterId}, ${destinationId})
      ON CONFLICT (voter_id, destination_id) DO NOTHING
    `;
  }
  await sql`
    INSERT INTO ballot (voter_id)
    VALUES (${voterId})
    ON CONFLICT (voter_id) DO UPDATE SET submitted_at = NOW()
  `;
}
