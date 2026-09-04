alter table public.notebook_pages
  alter constraint notebook_pages_document_notebook_owner_fk
  deferrable initially immediate;

alter table public.page_bookmarks
  alter constraint page_bookmarks_page_notebook_owner_fk
  deferrable initially immediate;

alter table public.page_bookmarks
  alter constraint page_bookmarks_document_notebook_owner_fk
  deferrable initially immediate;

create or replace function public.protect_trashed_notebook_page()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.deleted_at is not null or new.deleted_at is not null)
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at') then
    if old.document_id is not null
      and new.document_id = old.document_id
      and new.owner_id = old.owner_id
      and new.notebook_id <> old.notebook_id
      and (to_jsonb(new) - 'notebook_id' - 'position' - 'updated_at')
        is not distinct from
        (to_jsonb(old) - 'notebook_id' - 'position' - 'updated_at')
      and exists (
        select 1
        from public.notebooks
        where notebooks.id = new.notebook_id
          and notebooks.owner_id = new.owner_id
          and notebooks.archived_at is null
      ) then
      return new;
    end if;

    raise exception 'Restore the notebook page before editing it.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create function public.move_document_to_notebook(
  p_source_notebook_id uuid,
  p_document_id uuid,
  p_destination_notebook_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_document public.documents%rowtype;
  v_page record;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select documents.*
  into v_document
  from public.documents
  where documents.id = p_document_id
    and documents.notebook_id = p_source_notebook_id
    and documents.owner_id = v_user_id
    and documents.deleted_at is null
    and documents.status <> 'awaiting_upload'
    and exists (
      select 1
      from public.notebooks
      where notebooks.id = p_source_notebook_id
        and notebooks.owner_id = v_user_id
        and notebooks.archived_at is null
    )
  for update;

  if not found then
    raise exception 'The document was not found.' using errcode = 'P0002';
  end if;

  if p_source_notebook_id = p_destination_notebook_id then
    return jsonb_build_object(
      'id', v_document.id,
      'notebook_id', v_document.notebook_id,
      'title', v_document.title,
      'original_filename', v_document.original_filename,
      'source_type', v_document.source_type,
      'media_type', v_document.media_type,
      'status', v_document.status,
      'page_count', v_document.page_count,
      'byte_size', v_document.byte_size,
      'revision', v_document.revision,
      'bookmarked', v_document.bookmarked,
      'created_at', v_document.created_at,
      'updated_at', v_document.updated_at
    );
  end if;

  perform 1
  from public.notebooks
  where notebooks.id = p_destination_notebook_id
    and notebooks.owner_id = v_user_id
    and notebooks.archived_at is null
  for update;

  if not found then
    raise exception 'The selected notebook is unavailable.'
      using errcode = '23503';
  end if;

  set constraints all deferred;

  for v_page in
    select notebook_pages.id
    from public.notebook_pages
    where notebook_pages.owner_id = v_user_id
      and notebook_pages.document_id = p_document_id
      and notebook_pages.notebook_id = p_source_notebook_id
    order by notebook_pages.position, notebook_pages.id
    for update
  loop
    update public.notebook_pages
    set
      notebook_id = p_destination_notebook_id,
      position = nextval('public.notebook_pages_position_seq'::regclass)
    where notebook_pages.id = v_page.id
      and notebook_pages.owner_id = v_user_id;
  end loop;

  update public.page_bookmarks
  set notebook_id = p_destination_notebook_id
  where page_bookmarks.owner_id = v_user_id
    and page_bookmarks.notebook_id = p_source_notebook_id
    and (
      page_bookmarks.document_id = p_document_id
      or exists (
        select 1
        from public.notebook_pages
        where notebook_pages.id = page_bookmarks.notebook_page_id
          and notebook_pages.owner_id = v_user_id
          and notebook_pages.notebook_id = p_destination_notebook_id
          and notebook_pages.document_id = p_document_id
      )
    );

  update public.documents
  set notebook_id = p_destination_notebook_id
  where documents.id = p_document_id
    and documents.notebook_id = p_source_notebook_id
    and documents.owner_id = v_user_id
    and documents.deleted_at is null
  returning documents.* into v_document;

  if not found then
    raise exception 'The document changed during the move.'
      using errcode = '40001';
  end if;

  return jsonb_build_object(
    'id', v_document.id,
    'notebook_id', v_document.notebook_id,
    'title', v_document.title,
    'original_filename', v_document.original_filename,
    'source_type', v_document.source_type,
    'media_type', v_document.media_type,
    'status', v_document.status,
    'page_count', v_document.page_count,
    'byte_size', v_document.byte_size,
    'revision', v_document.revision,
    'bookmarked', v_document.bookmarked,
    'created_at', v_document.created_at,
    'updated_at', v_document.updated_at
  );
end;
$$;

revoke all on function public.move_document_to_notebook(uuid, uuid, uuid)
  from public;
revoke all on function public.move_document_to_notebook(uuid, uuid, uuid)
  from anon;
grant execute on function public.move_document_to_notebook(uuid, uuid, uuid)
  to authenticated;

comment on function public.move_document_to_notebook(uuid, uuid, uuid) is
  'Atomically moves an owned document and its connected notes and bookmarks to an active owned notebook.';
