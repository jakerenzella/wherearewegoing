# Where are we going?

Invite-only app where a small group pitches destinations, then votes via **approval voting** (any you'd be happy with), then the winner is revealed.

## Stack
- Next.js 16 + React 19, App Router
- HeroUI v3 + Tailwind v4
- Neon Postgres via `@neondatabase/serverless`
- Neon Auth (Better Auth) via `@neondatabase/auth` — email OTP sign-in
- Wikipedia API for place autocomplete + hero images
- REST Countries API for flag detection

## One-time setup

1. On Vercel, enable the Neon + Neon Auth integrations — populates `DATABASE_URL` and `NEON_AUTH_BASE_URL`.
2. Set `ALLOWED_EMAILS` in Vercel (comma-separated). Count = number of passengers the app expects.
3. Pull env locally: `vercel env pull .env.local`
4. Run `schema.sql` in the Neon SQL editor (one statement at a time).
5. `npm run dev`

## Voting
- Approval voting: tick every destination you'd be happy with (not your own)
- Click **Submit ballot** to lock in your picks
- Phase flips to REVEAL once everyone's submitted a ballot
- Winner = most approvals (ties broken by earliest submission)

## Demo mode (test the full flow solo)

Populate fake passengers + pitches with real Wikipedia images. Requires `ALLOWED_EMAILS` to have 7 entries (6 fake + yours).

```bash
npm run demo          # 6 fake pitches → you pitch the 7th → VOTE
npm run demo:ballots  # 6 pitches + 6 ballots → you ballot → REVEAL
npm run demo:full     # 7 pitches + 7 ballots → instant REVEAL (spectator)
```

Suggested `ALLOWED_EMAILS` for demo:
```
ALLOWED_EMAILS=you@example.com,demo-1@wawg.local,demo-2@wawg.local,demo-3@wawg.local,demo-4@wawg.local,demo-5@wawg.local,demo-6@wawg.local
```

The fake emails don't need to receive mail — nobody signs in as them.

## Reset the trip
```sql
TRUNCATE vote, ballot, destination CASCADE;
```
