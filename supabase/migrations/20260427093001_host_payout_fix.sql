ALTER TABLE public.host_payouts
DROP CONSTRAINT IF EXISTS host_payout_host_id_fkey;

ALTER TABLE public.host_payouts
ADD CONSTRAINT host_payout_host_id_fkey 
FOREIGN KEY (host_id) 
REFERENCES profiles(id)
ON DELETE CASCADE;
