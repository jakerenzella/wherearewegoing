import "server-only";
import { sql } from "./db";

export type AdminDestination = {
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

export async function adminListDestinations(): Promise<AdminDestination[]> {
  const rows = await sql`
    SELECT d.id, d.user_id, d.user_name, d.name, d.flag, d.image_url, d.description, d.created_at,
           COUNT(v.id)::int AS vote_count
    FROM destination d
    LEFT JOIN vote v ON v.destination_id = d.id
    GROUP BY d.id
    ORDER BY vote_count DESC, d.created_at ASC
  `;
  return rows as AdminDestination[];
}

export type AdminBallot = {
  voter_id: string;
  voter_name: string | null;
  submitted_at: string;
  approvals: Array<{ name: string; flag: string | null }>;
};

export async function adminListBallots(): Promise<AdminBallot[]> {
  const rows = await sql`
    SELECT
      b.voter_id,
      b.submitted_at,
      d_self.user_name AS voter_name,
      COALESCE(
        json_agg(
          json_build_object('name', d.name, 'flag', d.flag)
          ORDER BY d.created_at
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
      ) AS approvals
    FROM ballot b
    LEFT JOIN destination d_self ON d_self.user_id = b.voter_id
    LEFT JOIN vote v ON v.voter_id = b.voter_id
    LEFT JOIN destination d ON d.id = v.destination_id
    GROUP BY b.voter_id, b.submitted_at, d_self.user_name
    ORDER BY b.submitted_at ASC
  `;
  return rows as AdminBallot[];
}
