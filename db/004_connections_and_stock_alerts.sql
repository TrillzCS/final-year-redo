create table if not exists store_connections (
    id              uuid primary key default gen_random_uuid(),
    platform        text        not null,
    display_name    text        not null,
    store_url       text,
    webhook_secret  text        not null,
    active          boolean     not null default true,
    created_at      timestamptz not null default now(),
    last_order_at   timestamptz,
    orders_received integer     not null default 0,
    constraint store_connections_platform_check
        check (platform in ('woocommerce', 'shopify', 'generic'))
);

create index if not exists idx_store_connections_active
    on store_connections (active);

alter table orders add column if not exists source_connection_id uuid
    references store_connections (id);

alter table orders add column if not exists source text;

alter table products add column if not exists low_stock_threshold integer;
alter table products add column if not exists reorder_quantity integer;

alter table products add column if not exists perishable boolean not null default false;
alter table products add column if not exists expiry_warning_days integer;

update alerts a
set resolved_at = now()
where a.resolved_at is null
  and exists (
      select 1 from alerts b
      where b.target_type = a.target_type
        and b.target_id   = a.target_id
        and b.type        = a.type
        and b.resolved_at is null
        and (b.created_at > a.created_at
             or (b.created_at = a.created_at and b.id > a.id))
  );

create unique index if not exists uq_alerts_open_target
    on alerts (target_type, target_id, type) where resolved_at is null;
