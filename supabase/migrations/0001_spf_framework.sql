-- Migration 0001: the framework data tier (ADR-0022, ADR-0008, ADR-0006).
--
-- This is the write side of the CQRS split. The framework is stored here as
-- versioned JSONB. The read side is a static snapshot the build step derives from
-- the published release and serves from the CDN, so nothing queries this database
-- on the request path.
--
-- Two tables:
--   spf_release  one row per synced framework version. Exactly one is published.
--   spf_record   one row per framework record, keyed by (release, entity, slug).
--
-- This is an initial, additive migration (expand-and-contract: expand only, no data
-- to back-fill). It is safe to run more than once: every statement guards with
-- "if not exists". It holds framework data only, never any user data (ADR-0005).

-- A synced version of the framework. The content hash and the upstream commit SHA
-- pin a release to exact bytes, so the app moves only when the pin moves (ADR-0008
-- rule 7). Record counts are stored so the snapshot build can fail closed if the
-- data it reads back does not match what was synced.
create table if not exists public.spf_release (
  id            uuid        primary key default gen_random_uuid(),
  version       text        not null default 'v1',
  upstream_sha  text        not null,
  content_hash  text        not null,
  status        text        not null default 'draft'
                  check (status in ('draft', 'published', 'archived')),
  record_count  integer     not null check (record_count >= 0),
  entity_counts jsonb       not null,
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

comment on table public.spf_release is
  'One row per synced framework version (ADR-0022). Exactly one row is published.';

-- At most one published release at a time. The sync step archives the previous
-- published release before publishing a new one, so "the published release" is
-- always a single, unambiguous row.
create unique index if not exists spf_release_one_published
  on public.spf_release (status)
  where status = 'published';

-- One row per framework record. The (release, entity, slug) primary key makes the
-- "resolve by (entity, slug), never slug alone" rule a real key (ADR-0008 rule 1)
-- and sidesteps the 183 cross-entity slug collisions: the same slug can exist as an
-- activity and as a duty task reference, but not twice within one entity. The whole
-- record is kept verbatim in data, so adding a framework field needs no migration.
create table if not exists public.spf_record (
  release_id uuid  not null references public.spf_release (id) on delete cascade,
  entity     text  not null,
  slug       text  not null,
  name       text  not null,
  data       jsonb not null,
  primary key (release_id, entity, slug)
);

comment on table public.spf_record is
  'One framework record, keyed by (release, entity, slug) (ADR-0008, ADR-0022).';

-- The snapshot build reads a whole entity for one release ("all activities in the
-- published release"), so index that access path.
create index if not exists spf_record_entity_idx
  on public.spf_record (release_id, entity);

-- Row-level security is on for every table (ADR-0006, ADR-0022). No policy is
-- granted to the anon or authenticated roles, so those roles are denied by default:
-- the browser, which only ever holds the anon key if any, can read nothing here.
-- The server's service-role key bypasses RLS, so the sync and build steps (tier 2)
-- are the only code that reads or writes this data. The browser never connects at
-- all; it reads the CDN snapshot instead.
alter table public.spf_release enable row level security;
alter table public.spf_record  enable row level security;
