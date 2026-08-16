alter table assigned_units
    add column if not exists returned_at timestamptz;

 '
    'the unit is quarantined rather than returned to available stock.';

create index if not exists idx_assigned_units_returned_at
    on assigned_units (returned_at);

alter table orders
    add column if not exists dispatched_at timestamptz;

update sub_batches sb
set units_available = coalesce(sub.free, 0)
from (
    select l.sub_batch_id,
           count(*) filter (
               where not exists (
                   select 1 from assigned_units au
                   where au.sub_batch_id = l.sub_batch_id
                     and au.unit_serial_no = l.serial_no
               )
           ) as free
    from labels l
    group by l.sub_batch_id
) sub
where sub.sub_batch_id = sb.id;
