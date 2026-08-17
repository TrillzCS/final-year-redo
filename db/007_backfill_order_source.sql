-- Orders created before the source column existed have no channel recorded, so the
-- fulfilment and picking screens cannot say where they came from.
--
-- The WooCommerce webhook was the only automated intake at the time and it prefixes
-- every order number it writes, so those rows can be set safely. Anything else is left
-- null on purpose rather than guessed at: the screens show "Not recorded" for those,
-- which is honest, and a traceability record should not carry invented provenance.

update orders
set source = 'woocommerce'
where source is null
  and order_no like 'WOO-%';
