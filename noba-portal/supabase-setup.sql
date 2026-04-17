-- NOBA Portal — Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project.

-- Scorecard: metric definitions per group
create table if not exists scorecard_metrics (
  id         uuid    default gen_random_uuid() primary key,
  group_id   text    not null,
  name       text    not null,
  target     numeric not null default 1,
  unit       text    default '',
  sort_order int     default 0,
  created_at timestamptz default now()
);

-- Scorecard: weekly entries per member per metric
create table if not exists scorecard_entries (
  id          uuid    default gen_random_uuid() primary key,
  group_id    text    not null,
  member_name text    not null,
  metric_id   uuid    references scorecard_metrics(id) on delete cascade,
  week_start  date    not null,
  value       numeric,
  updated_at  timestamptz default now(),
  unique(group_id, member_name, metric_id, week_start)
);

-- Rocks: 90-day goals per group
create table if not exists rocks (
  id         uuid default gen_random_uuid() primary key,
  group_id   text not null,
  title      text not null,
  owner      text not null,
  due_date   date,
  status     text default 'on_track', -- on_track | off_track | complete | dropped
  created_at timestamptz default now()
);

-- Milestones: checkpoints under each rock
create table if not exists milestones (
  id         uuid    default gen_random_uuid() primary key,
  rock_id    uuid    references rocks(id) on delete cascade,
  title      text    not null,
  due_date   date,
  done       boolean default false,
  created_at timestamptz default now()
);

-- Issues: IDS list per group
create table if not exists issues (
  id              uuid default gen_random_uuid() primary key,
  group_id        text not null,
  title           text not null,
  raised_by       text not null,
  priority        text default 'medium', -- high | medium | low
  status          text default 'open',   -- open | solved | dropped
  resolution_note text,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);

-- Vault: file uploads and links per group
create table if not exists vault_items (
  id          uuid default gen_random_uuid() primary key,
  group_id    text not null,
  title       text not null,
  uploaded_by text not null,
  type        text not null default 'file', -- file | link
  file_name   text,
  file_url    text,
  link_url    text,
  created_at  timestamptz default now()
);

-- Allow public read/write (Cloudflare Access handles auth at the page level)
alter table scorecard_metrics enable row level security;
alter table scorecard_entries  enable row level security;
alter table rocks               enable row level security;
alter table milestones          enable row level security;
alter table issues              enable row level security;

create policy "public access" on scorecard_metrics for all using (true) with check (true);
create policy "public access" on scorecard_entries  for all using (true) with check (true);
create policy "public access" on rocks               for all using (true) with check (true);
create policy "public access" on milestones          for all using (true) with check (true);
create policy "public access" on issues              for all using (true) with check (true);

alter table vault_items enable row level security;
create policy "public access" on vault_items for all using (true) with check (true);

-- Storage bucket (run in Supabase Dashboard → Storage → New bucket)
-- Name: vault, Public: true
