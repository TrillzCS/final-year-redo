alter table products add column if not exists barcode text;

-- Two products must not share a barcode, but many may have none.
create unique index if not exists uq_products_barcode
    on products (barcode) where barcode is not null;

create unique index if not exists uq_products_sku
    on products (sku) where sku is not null;

alter table batches add column if not exists quantity numeric;
alter table batches add column if not exists unit text;

update batches set quantity = net_kg where quantity is null and net_kg is not null;
update batches set unit = 'kg' where unit is null;

alter table products add column if not exists unit_size numeric;
alter table products add column if not exists unit_of_measure text;

update products set unit_size = net_weight_grams
    where unit_size is null and net_weight_grams is not null;
update products set unit_of_measure = 'g' where unit_of_measure is null;

alter table products add column if not exists active boolean not null default true;
alter table products add column if not exists shelf_life_months integer;
alter table products add column if not exists created_at timestamptz default now();

alter table suppliers add column if not exists contact_email text;
alter table suppliers add column if not exists contact_phone text;
alter table suppliers add column if not exists country text;
alter table suppliers add column if not exists active boolean not null default true;
alter table suppliers add column if not exists created_at timestamptz default now();
