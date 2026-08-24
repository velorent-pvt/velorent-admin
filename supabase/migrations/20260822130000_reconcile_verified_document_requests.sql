-- Close stale pending review requests when the document is already stored as
-- verified customer data. This keeps the admin queue aligned with customers.
update public.manual_verifications as verification
set status = 'approved', updated_at = now()
from public.customers as customer
where verification.profile_id = customer.id
  and verification.status = 'pending'
  and (
    (verification.document_type = 'aadhaar' and nullif(trim(customer.aadhaar_number), '') is not null)
    or
    (verification.document_type = 'dl' and nullif(trim(customer.dl_number), '') is not null)
  );
