BEGIN;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN unnest(con.conkey) AS colnum(attnum) ON TRUE
    JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = colnum.attnum
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'bookings'
      AND con.contype = 'u'
      AND attr.attname = 'host_id'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.booking_host_id_key;

CREATE INDEX IF NOT EXISTS bookings_host_id_idx ON public.bookings(host_id);

COMMIT;
