alter table public.support_leads
add column if not exists attachment text;

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

drop policy if exists "support_attachments_public_read" on storage.objects;
create policy "support_attachments_public_read"
on storage.objects for select
to public
using (bucket_id = 'support-attachments');

drop policy if exists "support_attachments_authenticated_insert" on storage.objects;
create policy "support_attachments_authenticated_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'support-attachments');

drop policy if exists "support_attachments_authenticated_update" on storage.objects;
create policy "support_attachments_authenticated_update"
on storage.objects for update
to authenticated
using (bucket_id = 'support-attachments')
with check (bucket_id = 'support-attachments');

drop policy if exists "support_attachments_authenticated_delete" on storage.objects;
create policy "support_attachments_authenticated_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'support-attachments');
