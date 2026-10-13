-- Run once against the Neon/Vercel Postgres database, e.g.:
--   psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists pgcrypto;

-- Uploaded versions of the sales deck served at /, one of which is live.
-- The HTML itself lives in Vercel Blob (or .data/ locally); storage_key points
-- at it.

create table if not exists deck_versions (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  notes         text,
  filename      text not null,
  storage_key   text unique not null,
  size_bytes    bigint not null,
  sha256        text not null,
  warnings      text[] not null default '{}',
  uploaded_by   text not null,
  created_at    timestamptz not null default now(),
  is_live       boolean not null default false,
  published_at  timestamptz
);

-- At most one live version at a time.
create unique index if not exists idx_deck_versions_live on deck_versions(is_live) where is_live;

-- One row per tracker beacon while a signed-in rep has a version open: open,
-- per-slide dwell (slide_view), periodic heartbeat, and close.
create table if not exists deck_view_events (
  id            bigserial primary key,
  version_id    uuid not null references deck_versions(id) on delete cascade,
  viewer_email  text not null,
  session_id    uuid not null,
  event_type    text not null check (event_type in ('open', 'slide_view', 'heartbeat', 'close')),
  slide_index   int,
  seconds       int,
  geo_country   text,
  geo_city      text,
  geo_region    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_deck_view_events_version on deck_view_events(version_id, created_at);
create index if not exists idx_deck_view_events_session on deck_view_events(session_id);

-- Who can sign into /admin, in addition to anyone listed in ADMIN_EMAILS.
create table if not exists admins (
  email         text primary key,
  added_by      text not null,
  created_at    timestamptz not null default now()
);
