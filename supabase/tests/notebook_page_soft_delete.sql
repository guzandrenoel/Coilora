-- Run against a development database after applying the soft-delete migration.
-- Synthetic users and content are created only inside this rolled-back transaction.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '2s';

do $$
declare
  test_owner uuid := gen_random_uuid();
  other_owner uuid := gen_random_uuid();
  test_notebook uuid := gen_random_uuid();
  test_page uuid := gen_random_uuid();
  test_document uuid := gen_random_uuid();
  changed integer;
  first_deleted_at timestamptz;
begin
  insert into auth.users (id) values (test_owner), (other_owner);
  insert into public.notebooks (id, owner_id, title)
    values (test_notebook, test_owner, 'Page deletion regression test');
  insert into public.documents (
    id, owner_id, notebook_id, title, original_filename,
    source_type, media_type, byte_size, page_count, status
  ) values (
    test_document, test_owner, test_notebook, 'Test PDF', 'test.pdf',
    'pdf', 'application/pdf', 10, 1, 'uploaded'
  );
  insert into public.notebook_pages (
    id, owner_id, notebook_id, title, paper_style, position,
    document_id, after_document_page_number
  ) values (
    test_page, test_owner, test_notebook, 'Saved notes', 'grid', 1,
    test_document, 1
  );
  insert into public.annotations (
    owner_id, notebook_page_id, document_id, document_page_number,
    kind, color, width, points, z_index
  ) values
    (test_owner, test_page, null, null, 'ink', '#173f5f', 0.004,
      '[{"x":0,"y":0},{"x":1,"y":1}]', 1),
    (test_owner, null, test_document, 1, 'ink', '#173f5f', 0.004,
      '[{"x":0,"y":0},{"x":1,"y":1}]', 1);
  insert into public.page_bookmarks (
    owner_id, notebook_id, notebook_page_id, document_id, document_page_number
  ) values
    (test_owner, test_notebook, test_page, null, null),
    (test_owner, test_notebook, null, test_document, 1);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', test_owner::text, true);
  if current_user <> 'authenticated' or auth.uid() <> test_owner then
    raise exception 'Test must run with authenticated ownership policies';
  end if;

  update public.notebook_pages set deleted_at = now()
    where id = test_page and owner_id = test_owner
      and notebook_id = test_notebook and deleted_at is null;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Owner could not soft-delete the page'; end if;
  select deleted_at into first_deleted_at from public.notebook_pages where id = test_page;
  if exists (select 1 from public.notebook_pages where id = test_page and deleted_at is null) then
    raise exception 'Trashed page remained in the active list';
  end if;
  if exists (select 1 from public.annotations where notebook_page_id = test_page)
    or exists (select 1 from public.page_bookmarks where notebook_page_id = test_page) then
    raise exception 'Trashed page annotations or bookmarks remained visible';
  end if;
  if not exists (select 1 from public.annotations where document_id = test_document)
    or not exists (select 1 from public.page_bookmarks where document_id = test_document)
    or not exists (select 1 from public.documents where id = test_document and deleted_at is null) then
    raise exception 'Note deletion affected the PDF or its annotations/bookmarks';
  end if;

  begin
    update public.notebook_pages set title = 'Changed' where id = test_page;
    raise exception 'Trashed page accepted a title edit';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.notebook_pages set deleted_at = null, title = 'Changed' where id = test_page;
    raise exception 'Restoration accepted a simultaneous content edit';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.notebook_pages where id = test_page;
    raise exception 'Authenticated role could permanently delete a page';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.annotations (owner_id, notebook_page_id, kind, color, width, points, z_index)
      values (test_owner, test_page, 'ink', '#173f5f', 0.004, '[{"x":0,"y":0},{"x":1,"y":1}]', 2);
    raise exception 'Trashed page accepted a new annotation';
  exception when insufficient_privilege then null;
  end;
  delete from public.annotations where notebook_page_id = test_page;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Trashed annotation could be erased'; end if;
  delete from public.page_bookmarks where notebook_page_id = test_page;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Trashed bookmark could be erased'; end if;

  update public.notebook_pages set deleted_at = now() + interval '1 minute'
    where id = test_page and deleted_at is null;
  get diagnostics changed = row_count;
  if changed <> 0 or first_deleted_at is distinct from
    (select deleted_at from public.notebook_pages where id = test_page) then
    raise exception 'Repeated deletion changed the original deletion timestamp';
  end if;

  perform set_config('request.jwt.claim.sub', other_owner::text, true);
  update public.notebook_pages set deleted_at = null where id = test_page;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another owner could restore the page'; end if;
  perform set_config('request.jwt.claim.sub', test_owner::text, true);

  update public.notebook_pages set deleted_at = null where id = test_page and deleted_at is not null;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Owner could not restore the page'; end if;
  if not exists (
    select 1 from public.notebook_pages where id = test_page and deleted_at is null
      and title = 'Saved notes' and paper_style = 'grid' and position = 1
      and document_id = test_document and after_document_page_number = 1
  ) or not exists (select 1 from public.annotations where notebook_page_id = test_page)
    or not exists (select 1 from public.page_bookmarks where notebook_page_id = test_page) then
    raise exception 'Restoration did not preserve page content, annotations, or bookmarks';
  end if;
  perform set_config('request.jwt.claim.sub', other_owner::text, true);
  update public.notebook_pages set deleted_at = now() where id = test_page;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another owner could delete the page'; end if;
  execute 'reset role';
end;
$$;

select 'Notebook page delete/restore and ownership checks passed; fixtures rolled back' as result;
rollback;
