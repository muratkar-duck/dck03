update scripts
set owner_id = coalesce(owner_id, user_id);

update scripts
set price_cents = coalesce(price_cents, 0);
