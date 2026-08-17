-- Migration 006 - stock write-offs. Run in the Supabase SQL editor.

alter table labels add column if not exists written_off_at timestamptz;
alter table labels add column if not exists write_off_reason text;

create index if not exists idx_labels_written_off on labels (written_off_at);
