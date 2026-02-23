alter table car_documents
  drop constraint if exists document_type_check;

update car_documents d
set document_type = 'rc_front'
where d.document_type = 'rc_book'
  and not exists (
    select 1
    from car_documents d2
    where d2.car_id = d.car_id
      and d2.document_type = 'rc_front'
  );

delete from car_documents d
where d.document_type = 'rc_book';

update car_documents d
set document_type = 'aadhaar_front'
where d.document_type = 'owner_aadhaar'
  and not exists (
    select 1
    from car_documents d2
    where d2.car_id = d.car_id
      and d2.document_type = 'aadhaar_front'
  );

delete from car_documents d
where d.document_type = 'owner_aadhaar';

alter table car_documents
  add constraint document_type_check
  check (
    document_type in (
      'rc_front',
      'rc_back',
      'aadhaar_front',
      'aadhaar_back',
      'sign'
    )
  );
