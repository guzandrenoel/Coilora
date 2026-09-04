-- Run against a development database after applying the document-move migration.
-- Synthetic users and content are created only inside this rolled-back transaction.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '2s';

do $$
declare
  test_owner uuid := gen_random_uuid();
  other_owner uuid := gen_random_uuid();
  source_notebook uuid := gen_random_uuid();
  destination_notebook uuid := gen_random_uuid();
  archived_notebook uuid := gen_random_uuid();
  other_notebook uuid := gen_random_uuid();
  test_document uuid := gen_random_uuid();
  archived_target_document uuid := gen_random_uuid();
  other_document uuid := gen_random_uuid();
  active_note uuid := gen_random_uuid();
  trashed_note uuid := gen_random_uuid();
  move_result jsonb;
begin
  insert into auth.users (id) values (test_owner), (other_owner);

  insert into public.notebooks (id, owner_id, title, archived_at)
  values
    (source_notebook, test_owner, 'Move source', null),
    (destination_notebook, test_owner, 'Move destination', null),
    (archived_notebook, test_owner, 'Archived destination', now()),
    (other_notebook, other_owner, 'Another owner notebook', null);

  insert into public.documents (
    id, owner_id, notebook_id, title, original_filename,
    source_type, media_type, byte_size, page_count, status
  )
  values
    (
      test_document, test_owner, source_notebook, 'Move me', 'move.pdf',
      'pdf', 'application/pdf', 10, 2, 'uploaded'
    ),
    (
      archived_target_document, test_owner, source_notebook,
      'Keep in source', 'keep.pdf', 'pdf', 'application/pdf', 10, 1,
      'uploaded'
    ),
    (
      other_document, other_owner, other_notebook, 'Private', 'private.pdf',
      'pdf', 'application/pdf', 10, 1, 'uploaded'
    );

  insert into public.notebook_pages (
    id, owner_id, notebook_id, title, paper_style,
    document_id, after_document_page_number, deleted_at
  )
  values
    (
      active_note, test_owner, source_notebook, 'Active connected note',
      'grid', test_document, 1, null
    ),
    (
      trashed_note, test_owner, source_notebook, 'Trashed connected note',
      'blank', test_document, 2, now()
    );

  insert into public.annotations (
    owner_id, notebook_page_id, document_id, document_page_number,
    kind, color, width, points, z_index
  )
  values
    (
      test_owner, active_note, null, null, 'ink', '#173f5f', 0.004,
      '[{"x":0,"y":0},{"x":1,"y":1}]', 1
    ),
    (
      test_owner, null, test_document, 1, 'ink', '#173f5f', 0.004,
      '[{"x":0,"y":0},{"x":1,"y":1}]', 1
    );

  insert into public.page_bookmarks (
    owner_id, notebook_id, notebook_page_id, document_id,
    document_page_number
  )
  values
    (test_owner, source_notebook, active_note, null, null),
    (test_owner, source_notebook, trashed_note, null, null),
    (test_owner, source_notebook, null, test_document, 1);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', test_owner::text, true);
  if current_user <> 'authenticated' or auth.uid() <> test_owner then
    raise exception 'Test must run with authenticated ownership policies';
  end if;

  move_result := public.move_document_to_notebook(
    source_notebook,
    test_document,
    destination_notebook
  );

  if move_result ->> 'id' <> test_document::text
    or move_result ->> 'notebook_id' <> destination_notebook::text then
    raise exception 'Move returned an unexpected document';
  end if;

  if not exists (
    select 1
    from public.documents
    where id = test_document
      and notebook_id = destination_notebook
      and owner_id = test_owner
  ) then
    raise exception 'Document did not move to the destination';
  end if;

  if (
    select count(*)
    from public.notebook_pages
    where document_id = test_document
      and notebook_id = destination_notebook
      and owner_id = test_owner
      and deleted_at is null
  ) <> 1 then
    raise exception 'Active connected note did not move';
  end if;

  if (
    select count(*)
    from public.page_bookmarks
    where notebook_id = destination_notebook
      and owner_id = test_owner
  ) <> 2 then
    raise exception 'Visible connected bookmarks did not move';
  end if;

  if not exists (
    select 1
    from public.annotations
    where document_id = test_document
  ) or not exists (
    select 1
    from public.annotations
    where notebook_page_id = active_note
  ) then
    raise exception 'Move did not preserve annotations';
  end if;

  begin
    perform public.move_document_to_notebook(
      source_notebook,
      archived_target_document,
      archived_notebook
    );
    raise exception 'Archived destination accepted a document';
  exception when foreign_key_violation then
    null;
  end;

  if not exists (
    select 1
    from public.documents
    where id = archived_target_document
      and notebook_id = source_notebook
  ) then
    raise exception 'Rejected archived move changed the document';
  end if;

  begin
    perform public.move_document_to_notebook(
      source_notebook,
      archived_target_document,
      other_notebook
    );
    raise exception 'Another owner notebook accepted the document';
  exception when foreign_key_violation then
    null;
  end;

  if not exists (
    select 1
    from public.documents
    where id = archived_target_document
      and notebook_id = source_notebook
  ) then
    raise exception 'Rejected cross-owner move changed the document';
  end if;

  begin
    perform public.move_document_to_notebook(
      other_notebook,
      other_document,
      destination_notebook
    );
    raise exception 'Another owner moved a private document';
  exception when no_data_found then
    null;
  end;

  execute 'reset role';

  if not exists (
    select 1
    from public.notebook_pages
    where id = trashed_note
      and document_id = test_document
      and notebook_id = destination_notebook
      and deleted_at is not null
  ) then
    raise exception 'Trashed connected note was not preserved and moved';
  end if;

  if (
    select count(*)
    from public.page_bookmarks
    where notebook_id = destination_notebook
      and owner_id = test_owner
  ) <> 3 then
    raise exception 'Move did not update all connected bookmarks';
  end if;

  if not exists (
    select 1
    from public.documents
    where id = other_document
      and notebook_id = other_notebook
      and owner_id = other_owner
  ) then
    raise exception 'Ownership failure changed another owner document';
  end if;
end;
$$;

select 'Document move relationships and security checks passed; fixtures rolled back'
  as result;
rollback;
