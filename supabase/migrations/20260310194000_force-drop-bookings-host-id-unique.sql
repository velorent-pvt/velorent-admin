BEGIN;

-- Drop UNIQUE constraints that include host_id on public.bookings.
DO $$
DECLARE
  con_record RECORD;
BEGIN
  FOR con_record IN
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
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', con_record.conname);
  END LOOP;
END $$;

-- Drop standalone UNIQUE indexes that include host_id on public.bookings.
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  FOR idx_record IN
    SELECT idx.relname AS index_name
    FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
    JOIN unnest(i.indkey) AS keycol(attnum) ON TRUE
    JOIN pg_attribute attr ON attr.attrelid = tbl.oid AND attr.attnum = keycol.attnum
    WHERE nsp.nspname = 'public'
      AND tbl.relname = 'bookings'
      AND i.indisunique = true
      AND i.indisprimary = false
      AND attr.attname = 'host_id'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_record.index_name);
  END LOOP;
END $$;

-- Keep a normal non-unique index for host lookup.
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON public.bookings(host_id);

COMMIT;
