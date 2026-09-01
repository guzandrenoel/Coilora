alter table public.notebook_pages
  add column title text,
  add column document_id uuid,
  add column after_document_page_number integer;

update public.notebook_pages
set title = 'Page ' || position::text
where title is null;

alter table public.notebook_pages
  alter column title set not null,
  alter column title set default 'Untitled page',
  add constraint notebook_pages_title_check check (
    char_length(trim(title)) between 1 and 120
  ),
  add constraint notebook_pages_document_position_check check (
    (
      document_id is null
      and after_document_page_number is null
    )
    or
    (
      document_id is not null
      and after_document_page_number between 0 and 5000
    )
  ),
  add constraint notebook_pages_id_notebook_owner_key
    unique (id, notebook_id, owner_id);

alter table public.documents
  add constraint documents_id_notebook_owner_key
  unique (id, notebook_id, owner_id);

alter table public.notebook_pages
  add constraint notebook_pages_document_notebook_owner_fk
  foreign key (document_id, notebook_id, owner_id)
  references public.documents(id, notebook_id, owner_id)
  on delete restrict;

create index notebook_pages_document_position_idx
  on public.notebook_pages(
    owner_id,
    document_id,
    after_document_page_number,
    position
  )
  where document_id is not null;

create table public.page_bookmarks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  notebook_id uuid not null,
  notebook_page_id uuid,
  document_id uuid,
  document_page_number integer,
  created_at timestamptz not null default now(),

  constraint page_bookmarks_target_check check (
    (
      notebook_page_id is not null
      and document_id is null
      and document_page_number is null
    )
    or
    (
      notebook_page_id is null
      and document_id is not null
      and document_page_number between 1 and 5000
    )
  ),

  constraint page_bookmarks_notebook_owner_fk
    foreign key (notebook_id, owner_id)
    references public.notebooks(id, owner_id)
    on delete cascade,

  constraint page_bookmarks_page_notebook_owner_fk
    foreign key (notebook_page_id, notebook_id, owner_id)
    references public.notebook_pages(id, notebook_id, owner_id)
    on delete cascade,

  constraint page_bookmarks_document_notebook_owner_fk
    foreign key (document_id, notebook_id, owner_id)
    references public.documents(id, notebook_id, owner_id)
    on delete cascade
);

create unique index page_bookmarks_notebook_page_key
  on public.page_bookmarks(owner_id, notebook_page_id)
  where notebook_page_id is not null;

create unique index page_bookmarks_document_page_key
  on public.page_bookmarks(
    owner_id,
    document_id,
    document_page_number
  )
  where document_id is not null;

create index page_bookmarks_notebook_created_idx
  on public.page_bookmarks(owner_id, notebook_id, created_at);

alter table public.page_bookmarks enable row level security;

create policy page_bookmarks_select_own
on public.page_bookmarks
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy page_bookmarks_insert_own_active_notebook
on public.page_bookmarks
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.notebooks
    where notebooks.id = page_bookmarks.notebook_id
      and notebooks.owner_id = (select auth.uid())
      and notebooks.archived_at is null
  )
);

create policy page_bookmarks_delete_own
on public.page_bookmarks
for delete
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.page_bookmarks from anon;
grant select, insert, delete on public.page_bookmarks to authenticated;
