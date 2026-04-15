-- Run each statement separately in the Neon SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS destination (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT UNIQUE NOT NULL,
  user_name   TEXT NOT NULL,
  name        TEXT NOT NULL,
  flag        TEXT,
  image_url   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vote (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id       TEXT NOT NULL,
  destination_id UUID NOT NULL REFERENCES destination(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (voter_id, destination_id)
);

CREATE INDEX IF NOT EXISTS vote_destination_id_idx ON vote(destination_id);

CREATE TABLE IF NOT EXISTS ballot (
  voter_id     TEXT PRIMARY KEY,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations for existing installs (approval voting + image_url + flag):
ALTER TABLE destination ADD COLUMN IF NOT EXISTS flag TEXT;
ALTER TABLE destination ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Convert old single-vote table to many-per-voter:
DELETE FROM vote;
ALTER TABLE vote DROP CONSTRAINT IF EXISTS vote_voter_id_key;
ALTER TABLE vote ADD CONSTRAINT vote_voter_destination_unique UNIQUE (voter_id, destination_id);
