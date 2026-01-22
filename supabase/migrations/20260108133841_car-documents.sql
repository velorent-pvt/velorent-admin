drop table if exists car_documents;

create table car_documents (
  id uuid primary key default gen_random_uuid(),

  car_id uuid not null
    references cars(id) on delete cascade,

  document_type text not null,
  document_url text not null,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint document_type_check
    check (document_type in ('rc_book', 'owner_aadhaar', 'sign')),

  unique (car_id, document_type)
);


CREATE INDEX idx_car_documents_car_id ON car_documents(car_id);
CREATE INDEX idx_car_documents_document_type ON car_documents(document_type);