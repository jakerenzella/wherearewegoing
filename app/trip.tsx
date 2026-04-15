"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, TextArea, TextField, Label } from "@heroui/react";
import { authClient } from "@/lib/auth/client";
import { PlaceAutocomplete, type PlaceDetails } from "./place-autocomplete";

type Phase = "SUBMIT" | "VOTE" | "REVEAL";

type Destination = {
  id: string;
  userId: string;
  userName: string;
  isMine: boolean;
  name: string | null;
  flag: string | null;
  imageUrl: string | null;
  description: string | null;
  voteCount: number | null;
};

type State = {
  phase: Phase;
  total: number;
  submittedCount: number;
  ballotsCount: number;
  destinations: Destination[];
  me: { id: string; email: string | null; name: string | null };
  mySubmission: {
    name: string;
    flag: string | null;
    imageUrl: string | null;
    description: string | null;
  } | null;
  myApprovals: string[];
  myBallotSubmitted: boolean;
};

export function Trip() {
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/auth/sign-in";
  }

  if (!state) {
    return (
      <div className="p-8 font-mono text-xs uppercase tracking-wider text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto flex flex-col gap-8">
      <TripHeader state={state} onSignOut={signOut} />
      {state.phase === "SUBMIT" && <SubmitPanel state={state} reload={load} />}
      {state.phase === "VOTE" && <VotePanel state={state} reload={load} />}
      {state.phase === "REVEAL" && <RevealPanel state={state} />}
    </div>
  );
}

/* -------------------- shared bits -------------------- */

function FlagName({
  flag,
  name,
  className,
}: {
  flag: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className ?? ""}`}>
      {flag && <span className="leading-none">{flag}</span>}
      <span>{name}</span>
    </span>
  );
}

function HeroImage({
  src,
  alt,
  fallback,
  height = 180,
}: {
  src: string | null;
  alt: string;
  fallback?: string | null;
  height?: number;
}) {
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full object-cover block"
        style={{ height: `${height}px` }}
      />
    );
  }
  return (
    <div
      className="w-full flex items-center justify-center bg-surface-secondary"
      style={{ height: `${height}px` }}
    >
      <span className="text-6xl leading-none">{fallback || "📍"}</span>
    </div>
  );
}

function Ticket({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={`border-1.5 border-foreground bg-surface overflow-hidden ${className ?? ""}`}
      style={{ borderWidth: "1.5px", ...style }}
    >
      {children}
    </section>
  );
}

function TicketHeader({
  overline,
  title,
  meta,
}: {
  overline: string;
  title: string;
  meta?: string;
}) {
  return (
    <div
      className="p-5 border-b-1.5 border-foreground flex items-end justify-between gap-4"
      style={{ borderBottomWidth: "1.5px" }}
    >
      <div className="flex flex-col gap-1">
        <span className="label-mono">{overline}</span>
        <h2 className="text-xl font-bold uppercase tracking-tight leading-none">
          {title}
        </h2>
      </div>
      {meta && <span className="label-mono whitespace-nowrap">{meta}</span>}
    </div>
  );
}

/* -------------------- header -------------------- */

function TripHeader({
  state,
  onSignOut,
}: {
  state: State;
  onSignOut: () => void;
}) {
  return (
    <header
      className="border-1.5 border-foreground bg-surface"
      style={{ borderWidth: "1.5px" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 border-b-1.5 border-foreground"
        style={{ borderBottomWidth: "1.5px" }}
      >
        <span className="label-mono">WAWG · Flight 001</span>
        <span className="label-mono">{phaseStatus(state)}</span>
      </div>
      <div className="flex items-center justify-between p-5 gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight leading-none uppercase">
            Where Are
            <br />
            We Going?
          </h1>
          <div className="label-mono mt-2">
            Passenger · {state.me.name ?? state.me.email}
          </div>
        </div>
        <PhaseBadge phase={state.phase} />
      </div>
      <div className="perforate mx-5 mb-4" />
      <div className="px-5 pb-3 flex items-center justify-between">
        <span className="label-mono">
          {state.submittedCount}/{state.total} pitched · {state.ballotsCount}/
          {state.total} ballots
        </span>
        <button
          onClick={onSignOut}
          className="font-mono uppercase tracking-wider text-xs underline decoration-dotted underline-offset-4 hover:text-accent"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const bg =
    phase === "SUBMIT"
      ? "bg-warning text-warning-foreground"
      : phase === "VOTE"
      ? "bg-accent text-accent-foreground"
      : "bg-success text-success-foreground";
  return (
    <div
      className={`${bg} px-3 py-2 border-1.5 border-foreground font-mono uppercase tracking-widest text-xs font-bold whitespace-nowrap`}
      style={{ borderWidth: "1.5px" }}
    >
      {phaseLabel(phase)}
    </div>
  );
}

function phaseLabel(p: Phase): string {
  if (p === "SUBMIT") return "Pitching";
  if (p === "VOTE") return "Voting";
  return "Boarding";
}

function phaseStatus(state: State): string {
  if (state.phase === "SUBMIT") return "Status: On time";
  if (state.phase === "VOTE") return "Status: Final call";
  return "Status: Arrived";
}

/* -------------------- submit -------------------- */

function SubmitPanel({ state, reload }: { state: State; reload: () => void }) {
  const [name, setName] = useState(state.mySubmission?.name ?? "");
  const [flag, setFlag] = useState<string | null>(state.mySubmission?.flag ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    state.mySubmission?.imageUrl ?? null,
  );
  const [blurb, setBlurb] = useState<string>("");
  const [description, setDescription] = useState(
    state.mySubmission?.description ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSelect(details: PlaceDetails) {
    setName(details.title);
    setFlag(details.flag);
    setImageUrl(details.imageUrl);
    setBlurb(details.description || details.extract?.slice(0, 140) || "");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/destination", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, flag, imageUrl, description }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    reload();
  }

  return (
    <Ticket>
      <TicketHeader
        overline="Pitch your destination"
        title="Where should we go?"
        meta={`${state.submittedCount}/${state.total} in`}
      />
      <div className="p-5 flex flex-col gap-5">
        <PlaceAutocomplete
          value={name}
          onSelect={onSelect}
          onTextChange={(t) => {
            setName(t);
            if (!t) {
              setImageUrl(null);
              setFlag(null);
              setBlurb("");
            }
          }}
        />

        {(imageUrl || blurb || flag) && name && (
          <div
            className="border-1.5 border-foreground overflow-hidden"
            style={{ borderWidth: "1.5px" }}
          >
            <HeroImage src={imageUrl} alt={name} fallback={flag} height={160} />
            <div className="p-3 bg-surface">
              <div className="label-mono">Selected</div>
              <div className="font-bold uppercase tracking-tight">
                <FlagName flag={flag} name={name} />
              </div>
              {blurb && (
                <div className="text-xs text-muted mt-1 line-clamp-2">
                  {blurb}
                </div>
              )}
            </div>
          </div>
        )}

        <TextField
          value={description}
          onChange={setDescription}
          maxLength={1000}
        >
          <Label className="label-mono">Sell it to us</Label>
          <TextArea placeholder="Why here?" rows={4} />
        </TextField>

        {error && (
          <p className="font-mono uppercase text-xs tracking-wider text-danger">
            ✕ {error}
          </p>
        )}

        <Button
          variant="primary"
          onPress={submit}
          isPending={saving}
          isDisabled={!name.trim()}
        >
          {state.mySubmission ? "Update pitch" : "Submit pitch"}
        </Button>
        {state.mySubmission && (
          <p className="label-mono">
            ✓ Submitted · edit until everyone's in
          </p>
        )}
      </div>
    </Ticket>
  );
}

/* -------------------- vote (approval) -------------------- */

function VotePanel({ state, reload }: { state: State; reload: () => void }) {
  const initial = new Set(state.myApprovals);
  const [approvals, setApprovals] = useState<Set<string>>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = state.myBallotSubmitted;
  const options = state.destinations.filter((d) => !d.isMine);

  function toggle(id: string) {
    if (submitted) return;
    setApprovals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitBallot() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/ballot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approvals: [...approvals] }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    reload();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-mono">Approval voting</span>
          <h2 className="text-xl font-bold uppercase tracking-tight">
            Tick anywhere you'd be happy
          </h2>
        </div>
        <span className="label-mono">
          {state.ballotsCount}/{state.total} in
        </span>
      </div>

      {submitted && (
        <div
          className="border-1.5 border-foreground bg-success/20 px-4 py-2 label-mono"
          style={{ borderWidth: "1.5px" }}
        >
          ✓ Ballot locked · waiting on remaining passengers
        </div>
      )}
      {error && (
        <p className="font-mono uppercase text-xs tracking-wider text-danger">
          ✕ {error}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {options.map((d) => {
          const isApproved = approvals.has(d.id);
          return (
            <Ticket
              key={d.id}
              className={isApproved ? "shadow-[6px_6px_0_var(--accent)]" : ""}
            >
              <HeroImage
                src={d.imageUrl}
                alt={d.name ?? ""}
                fallback={d.flag}
                height={180}
              />
              <div
                className="p-5 flex flex-col gap-2 border-t-1.5 border-foreground"
                style={{ borderTopWidth: "1.5px" }}
              >
                <span className="label-mono">Destination</span>
                <h3 className="text-2xl font-bold uppercase tracking-tight leading-none">
                  <FlagName flag={d.flag} name={d.name} />
                </h3>
                {d.description && (
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {d.description}
                  </p>
                )}
              </div>
              <div className="perforate mx-5" />
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => toggle(d.id)}
                  disabled={submitted}
                  className={`w-full p-3 border-1.5 border-foreground font-mono uppercase tracking-widest text-xs font-bold transition-colors ${
                    isApproved
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface hover:bg-surface-secondary"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ borderWidth: "1.5px" }}
                >
                  {isApproved ? "✓ Approved" : "○ Approve"}
                </button>
              </div>
            </Ticket>
          );
        })}
      </div>

      {!submitted && (
        <div className="sticky bottom-0 pt-4">
          <Ticket>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="label-mono">Your ballot</span>
                <span className="font-bold uppercase tracking-tight">
                  {approvals.size} approval{approvals.size === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                variant="primary"
                onPress={submitBallot}
                isPending={submitting}
              >
                Submit ballot
              </Button>
            </div>
          </Ticket>
        </div>
      )}
    </div>
  );
}

/* -------------------- reveal -------------------- */

function RevealPanel({ state }: { state: State }) {
  const sorted = [...state.destinations].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0),
  );
  const winner = sorted[0];
  if (!winner) return null;
  const rest = sorted.slice(1);

  return (
    <div className="flex flex-col gap-6">
      <Ticket className="shadow-[8px_8px_0_var(--accent)]">
        <div
          className="px-5 py-3 border-b-1.5 border-foreground bg-accent text-accent-foreground"
          style={{ borderBottomWidth: "1.5px" }}
        >
          <span className="font-mono uppercase tracking-widest text-xs font-bold">
            ★ Final boarding · Gate 1
          </span>
        </div>
        <HeroImage
          src={winner.imageUrl}
          alt={winner.name ?? ""}
          fallback={winner.flag}
          height={300}
        />
        <div
          className="p-6 flex flex-col gap-2 border-t-1.5 border-foreground"
          style={{ borderTopWidth: "1.5px" }}
        >
          <span className="label-mono">The winner</span>
          <h2 className="text-4xl font-bold uppercase tracking-tight leading-none">
            <FlagName flag={winner.flag} name={winner.name} />
          </h2>
          <span className="label-mono mt-1">
            Pitched by {winner.userName} · {winner.voteCount} approval
            {winner.voteCount === 1 ? "" : "s"}
          </span>
        </div>
        {winner.description && (
          <>
            <div className="perforate mx-5" />
            <p className="p-5 text-sm whitespace-pre-wrap">
              {winner.description}
            </p>
          </>
        )}
      </Ticket>

      {rest.length > 0 && (
        <div className="flex flex-col gap-4">
          <span className="label-mono">Also on the manifest</span>
          {rest.map((d) => (
            <Ticket key={d.id}>
              <div className="flex">
                <div
                  className="flex-shrink-0 border-r-1.5 border-foreground"
                  style={{ borderRightWidth: "1.5px", width: "128px" }}
                >
                  <HeroImage
                    src={d.imageUrl}
                    alt={d.name ?? ""}
                    fallback={d.flag}
                    height={128}
                  />
                </div>
                <div className="flex-1 px-4 py-3 flex flex-col justify-center">
                  <span className="font-bold uppercase tracking-tight text-lg leading-tight">
                    <FlagName flag={d.flag} name={d.name} />
                  </span>
                  <span className="label-mono">
                    Pitched by {d.userName}
                  </span>
                </div>
                <div
                  className="px-4 py-3 border-l-1.5 border-foreground flex items-center"
                  style={{ borderLeftWidth: "1.5px" }}
                >
                  <span className="font-mono uppercase text-xs font-bold tracking-wider whitespace-nowrap">
                    {d.voteCount}
                  </span>
                </div>
              </div>
              {d.description && (
                <>
                  <div className="perforate mx-4" />
                  <p className="p-4 text-sm whitespace-pre-wrap">
                    {d.description}
                  </p>
                </>
              )}
            </Ticket>
          ))}
        </div>
      )}
    </div>
  );
}
