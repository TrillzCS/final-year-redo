-- Migration 005 - activity log. Run in the Supabase SQL editor.

create table if not exists activity_log (
    id          uuid primary key default gen_random_uuid(),
    occurred_at timestamptz not null default now(),
    actor       text,
    action      text not null,
    entity_type text,
    entity_id   uuid,
    detail      text
);

alter table activity_log enable row level security;

create index if not exists idx_activity_log_time on activity_log (occurred_at desc);
create index if not exists idx_activity_log_entity on activity_log (entity_type, entity_id);
