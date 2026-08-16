-- ===========================================================================
-- Migration 003 — barcode support, generic units of measure, catalogue fields
--
-- Run in the Supabase SQL editor. Every statement is idempotent.
--
-- Purpose: remove the assumptions that tied the schema to one product type
-- (loose tea sold by the kilogram) so the system serves any business that
-- receives stock, packs it into units and needs to trace those units.
-- ===========================================================================

-- 1. Barcodes ---------------------------------------------------------------
-- Units already carry a QR code holding a JSON payload. Retail supply chains
-- run on linear barcodes (EAN-13 / UPC on the product, Code128 on the unit),
-- and most warehouse scanners are keyboard-wedge devices that type a barcode
-- as text. Storing the product's retail barcode lets an imported order or a
-- scanned packet be matched by the code already printed on the packaging.
alter table products add column if not exists barcode text;

comment on column products.barcode is
    'Retail barcode (EAN-13, UPC-A or GTIN) as printed on the product. Optional: '
    'products sold only through the owner''s own channels may not have one.';

-- Two products must not share a barcode, but many may have none.
create unique index if not exists uq_products_barcode
    on products (barcode) where barcode is not null;

create unique index if not exists uq_products_sku
    on products (sku) where sku is not null;

-- 2. Generic units of measure -----------------------------------------------
-- batches.net_kg and products.net_weight_grams assume everything is weighed.
-- A business selling candles, cosmetics or hardware counts items or measures
-- volume. Quantity and unit are stored separately so the schema stops implying
-- a unit; the legacy columns are retained and backfilled so nothing breaks.
alter table batches add column if not exists quantity numeric;
alter table batches add column if not exists unit text;

update batches set quantity = net_kg where quantity is null and net_kg is not null;
update batches set unit = 'kg' where unit is null;

alter table products add column if not exists unit_size numeric;
alter table products add column if not exists unit_of_measure text;

update products set unit_size = net_weight_grams
    where unit_size is null and net_weight_grams is not null;
update products set unit_of_measure = 'g' where unit_of_measure is null;

comment on column batches.net_kg is
    'Legacy. Superseded by quantity + unit, which do not assume a weight.';
comment on column products.net_weight_grams is
    'Legacy. Superseded by unit_size + unit_of_measure.';

-- 3. Catalogue management ---------------------------------------------------
-- There was no way to add a product or a supplier without editing the database
-- by hand, which also meant an imported order naming an unknown SKU could not
-- be resolved without leaving the application.
alter table products add column if not exists active boolean not null default true;
alter table products add column if not exists shelf_life_months integer;
alter table products add column if not exists created_at timestamptz default now();

alter table suppliers add column if not exists contact_email text;
alter table suppliers add column if not exists contact_phone text;
alter table suppliers add column if not exists country text;
alter table suppliers add column if not exists active boolean not null default true;
alter table suppliers add column if not exists created_at timestamptz default now();

comment on column products.shelf_life_months is
    'Per-product shelf life used to default a batch best-before date. Falls back to '
    'the application-wide default when null, replacing the hard-coded 18 months.';

-- 4. Verification ------------------------------------------------------------
-- select column_name from information_schema.columns
-- where table_name = 'products' order by column_name;
-- ===========================================================================
-- Migration 004 — store connections and stock alerting
--
-- Run in the Supabase SQL editor. Idempotent.
-- ===========================================================================

-- 1. Store connections --------------------------------------------------------
-- Connecting a storefront previously meant an administrator editing
-- application.properties and redeploying: one hard-coded WooCommerce secret,
-- one store, developer-only. A connection is configuration, not code, and an
-- operator should be able to add one from the interface.
--
-- Each connection gets its own webhook URL and its own generated secret, so
-- several stores can feed the same warehouse and one store's secret can be
-- rotated without disturbing the others.
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

comment on table store_connections is
    'A connected storefront. The webhook secret authenticates inbound order '
    'notifications from that specific store.';

create index if not exists idx_store_connections_active
    on store_connections (active);

-- Which connection an order arrived through, for traceability back to source.
alter table orders add column if not exists source_connection_id uuid
    references store_connections (id);

alter table orders add column if not exists source text;

comment on column orders.source is
    'How the order entered the system: woocommerce, shopify, csv, json or manual.';

-- 2. Low stock alerting -------------------------------------------------------
-- The alerts table has always permitted a LOW_STOCK type but nothing ever
-- produced one: the scheduler only checked expiry. Reordering is the single
-- most common operational need in stock control, so the threshold lives on the
-- product and the scheduler now acts on it.
alter table products add column if not exists low_stock_threshold integer;
alter table products add column if not exists reorder_quantity integer;

comment on column products.low_stock_threshold is
    'Raise a LOW_STOCK alert when available units of this product fall to or '
    'below this number. Null disables low-stock alerting for the product.';

comment on column products.reorder_quantity is
    'Suggested quantity to reorder, shown on the alert. Advisory only.';

-- 3. Perishable handling ------------------------------------------------------
-- Expiry alerting assumed a long-dated product: a fixed 30-day warning window
-- suits an 18-month shelf life and is useless for fresh goods, where a 3-day
-- warning on a 10-day life is what matters. Perishable products carry their own
-- window; everything else falls back to the application default.
alter table products add column if not exists perishable boolean not null default false;
alter table products add column if not exists expiry_warning_days integer;

comment on column products.expiry_warning_days is
    'Days before expiry at which to warn for this product. Overrides the '
    'application-wide default. Essential for perishables, where a 30-day '
    'window would fire on the day the item is produced.';

-- 4. Alert de-duplication -----------------------------------------------------
-- The scheduler checks for an existing unresolved alert before inserting, but
-- nothing at the database level enforced it. Under concurrent runs that check
-- is a race.
-- Existing duplicates must be cleared first or the index cannot be created. The
-- original scheduler inserted without checking and accumulated thousands of rows;
-- this keeps the most recent open alert per target and resolves the rest.
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

-- 5. Verification -------------------------------------------------------------
-- select count(*) from store_connections;
-- select name, low_stock_threshold, perishable, expiry_warning_days from products;
