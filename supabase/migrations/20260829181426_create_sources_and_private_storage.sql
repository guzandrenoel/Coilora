alter table public.notebooks
  add constraint notebooks_id_owner_key unique (id, owner_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  notebook_id uuid not null,
  title text not null check (
    char_length(trim(title)) between 1 and 200
  ),
  original_filename text not null check (
    char_length(trim(original_filename)) between 1 and 255
  ),
  source_type text not null check (
    source_type in ('pdf', 'image', 'text', 'markdown')
  ),
  media_type text not null check (
    char_length(trim(media_type)) between 1 and 255
  ),
  status text not null default 'awaiting_upload' check (
    status in (
      'awaiting_upload',
      'uploaded',
      'validating',
      'quarantined',
      'extracting',
      'ocr_required',
      'indexing',
      'ready',
      'failed'
    )
  ),
  page_count integer check (
    page_count is null
    or page_count >= 0
  ),
  byte_size bigint not null check (
    byte_size between 1 and 52428800
  ),
  sha256 text check (
    sha256 is null
    or sha256 ~ '^[0-9a-f]{64}$'
  ),
  source_object_path text,
  sanitized_object_path text,
  parser_version text,
  indexed_at timestamptz,
  failure_code text,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  constraint documents_notebook_owner_fk
    foreign key (notebook_id, owner_id)
    references public.notebooks(id, owner_id)
    on delete cascade,
  constraint documents_source_path_owner_check check (
    source_object_path is null
    or source_object_path like (
      'users/' || owner_id::text || '/documents/' || id::text || '/%'
    )
  ),
  constraint documents_sanitized_path_owner_check check (
    sanitized_object_path is null
    or sanitized_object_path like (
      'users/' || owner_id::text || '/documents/' || id::text || '/%'
    )
  )
);

create index documents_owner_id_idx
  on public.documents(owner_id);

create index documents_notebook_id_idx
  on public.documents(notebook_id);

create index documents_owner_status_active_idx
  on public.documents(owner_id, status)
  where deleted_at is null;

create unique index documents_source_object_path_idx
  on public.documents(source_object_path)
  where source_object_path is not null;

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy documents_select_own
on public.documents
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy documents_insert_own
on public.documents
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy documents_update_own
on public.documents
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy documents_delete_own
on public.documents
for delete
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.documents from anon;
grant select, insert, update, delete on public.documents to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documents',
  'documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/x-markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy document_objects_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid()::text)
  and (storage.foldername(name))[3] = 'documents'
  and exists (
    select 1
    from public.documents
    where documents.owner_id = (select auth.uid())
      and documents.source_object_path = name
      and documents.deleted_at is null
  )
);

create policy document_objects_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid()::text)
  and (storage.foldername(name))[3] = 'documents'
  and exists (
    select 1
    from public.documents
    where documents.owner_id = (select auth.uid())
      and (
        documents.source_object_path = name
        or documents.sanitized_object_path = name
      )
      and documents.deleted_at is null
  )
);

create policy document_objects_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid()::text)
  and (storage.foldername(name))[3] = 'documents'
  and exists (
    select 1
    from public.documents
    where documents.owner_id = (select auth.uid())
      and (
        documents.source_object_path = name
        or documents.sanitized_object_path = name
      )
  )
);
