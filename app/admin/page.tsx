import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { neonAuth } from "@/lib/auth/server";
import { isAdmin } from "@/lib/admin";
import { allowedEmails } from "@/lib/allowlist";
import { getTripState } from "@/lib/phase";
import {
  adminListDestinations,
  adminListBallots,
} from "@/lib/admin-queries";
import { ResetButton } from "./reset-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await neonAuth();
  if (!user) redirect("/auth/sign-in");
  if (!isAdmin(user.email)) notFound();

  const [state, destinations, ballots] = await Promise.all([
    getTripState(),
    adminListDestinations(),
    adminListBallots(),
  ]);

  const emails = allowedEmails();
  const pitchedUserIds = new Set(destinations.map((d) => d.user_id));
  const ballotedUserIds = new Set(ballots.map((b) => b.voter_id));

  return (
    <div className="min-h-screen px-6 py-10 max-w-3xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header
        className="border-1.5 border-foreground bg-surface"
        style={{ borderWidth: "1.5px" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b-1.5 border-foreground"
          style={{ borderBottomWidth: "1.5px" }}
        >
          <span className="label-mono">WAWG · Control tower</span>
          <span className="label-mono">Status: {state.phase}</span>
        </div>
        <div className="flex items-center justify-between p-5 gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
              Admin
            </h1>
            <div className="label-mono mt-2">
              Signed in as {user.email}
            </div>
          </div>
          <Link
            href="/"
            className="label-mono underline decoration-dotted underline-offset-4 hover:text-accent"
          >
            ← Back to trip
          </Link>
        </div>
      </header>

      {/* Summary stats */}
      <section
        className="border-1.5 border-foreground bg-surface grid grid-cols-3"
        style={{ borderWidth: "1.5px" }}
      >
        <StatCell label="Phase" value={state.phase} />
        <StatCell
          label="Pitches"
          value={`${destinations.length} / ${state.total}`}
        />
        <StatCell
          label="Ballots"
          value={`${ballots.length} / ${state.total}`}
          last
        />
      </section>

      {/* Allowlist status */}
      <Section title="Passengers on the manifest" overline="ALLOWED_EMAILS">
        {emails.length === 0 ? (
          <p className="p-5 label-mono">ALLOWED_EMAILS is empty.</p>
        ) : (
          <ul>
            {emails.map((email, i) => {
              const dest = destinations.find(
                (d) => d.user_name?.toLowerCase() === email.split("@")[0].toLowerCase(),
              );
              return (
                <li
                  key={email}
                  className={`flex items-center justify-between px-5 py-3 ${
                    i < emails.length - 1
                      ? "border-b-1.5 border-foreground"
                      : ""
                  }`}
                  style={i < emails.length - 1 ? { borderBottomWidth: "1.5px" } : {}}
                >
                  <span className="font-sans text-sm">{email}</span>
                  <span className="label-mono">
                    {dest ? "pitched" : "—"}
                    {" · "}
                    {dest && ballotedUserIds.has(dest.user_id) ? "balloted" : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-5 pb-4 label-mono text-muted">
          Matching by name prefix of email — not perfect; compare against pitches + ballots below for ground truth.
        </p>
      </Section>

      {/* Pitches */}
      <Section
        title="All pitches"
        overline={`${destinations.length} destination${destinations.length === 1 ? "" : "s"}`}
      >
        {destinations.length === 0 ? (
          <p className="p-5 label-mono">No pitches yet.</p>
        ) : (
          destinations.map((d, i) => (
            <div
              key={d.id}
              className={`flex gap-4 p-5 ${
                i < destinations.length - 1
                  ? "border-b-1.5 border-foreground"
                  : ""
              }`}
              style={
                i < destinations.length - 1
                  ? { borderBottomWidth: "1.5px" }
                  : {}
              }
            >
              {d.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={d.image_url}
                  alt={d.name}
                  className="w-20 h-20 object-cover flex-shrink-0 border-1.5 border-foreground"
                  style={{ borderWidth: "1.5px" }}
                />
              ) : (
                <div
                  className="w-20 h-20 flex items-center justify-center bg-surface-secondary flex-shrink-0 border-1.5 border-foreground text-3xl"
                  style={{ borderWidth: "1.5px" }}
                >
                  {d.flag ?? "📍"}
                </div>
              )}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold uppercase tracking-tight text-lg">
                    {d.flag && <span className="mr-2">{d.flag}</span>}
                    {d.name}
                  </span>
                  <span className="label-mono whitespace-nowrap">
                    {d.vote_count} approval{d.vote_count === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="label-mono">
                  Pitched by {d.user_name} · {formatDate(d.created_at)}
                </span>
                {d.description && (
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {d.description}
                  </p>
                )}
                <span className="label-mono text-muted truncate mt-1">
                  user_id: {d.user_id}
                </span>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Ballots */}
      <Section
        title="Ballots cast"
        overline={`${ballots.length} ballot${ballots.length === 1 ? "" : "s"}`}
      >
        {ballots.length === 0 ? (
          <p className="p-5 label-mono">No ballots yet.</p>
        ) : (
          ballots.map((b, i) => (
            <div
              key={b.voter_id}
              className={`p-5 flex flex-col gap-2 ${
                i < ballots.length - 1
                  ? "border-b-1.5 border-foreground"
                  : ""
              }`}
              style={
                i < ballots.length - 1
                  ? { borderBottomWidth: "1.5px" }
                  : {}
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-bold uppercase tracking-tight">
                  {b.voter_name ?? "Unknown voter"}
                </span>
                <span className="label-mono whitespace-nowrap">
                  {formatDate(b.submitted_at)}
                </span>
              </div>
              {b.approvals.length === 0 ? (
                <span className="label-mono text-muted">
                  Approved: none (abstained)
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {b.approvals.map((a, idx) => (
                    <span
                      key={idx}
                      className="border-1.5 border-foreground px-2 py-1 label-mono"
                      style={{ borderWidth: "1.5px" }}
                    >
                      {a.flag && <span className="mr-1">{a.flag}</span>}
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
              <span className="label-mono text-muted truncate">
                voter_id: {b.voter_id}
              </span>
            </div>
          ))
        )}
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone" overline="Irreversible">
        <div className="p-5">
          <ResetButton />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  overline,
  children,
}: {
  title: string;
  overline: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-1.5 border-foreground bg-surface"
      style={{ borderWidth: "1.5px" }}
    >
      <div
        className="p-5 border-b-1.5 border-foreground flex items-end justify-between gap-4"
        style={{ borderBottomWidth: "1.5px" }}
      >
        <div className="flex flex-col gap-1">
          <span className="label-mono">{overline}</span>
          <h2 className="text-lg font-bold uppercase tracking-tight leading-none">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatCell({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-5 flex flex-col gap-1 ${
        last ? "" : "border-r-1.5 border-foreground"
      }`}
      style={last ? {} : { borderRightWidth: "1.5px" }}
    >
      <span className="label-mono">{label}</span>
      <span className="text-xl font-bold uppercase tracking-tight">
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-AU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
