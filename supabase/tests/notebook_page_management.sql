-- Run on a development database after the page-management migration.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
do $$
declare
  owner uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  notebook uuid := gen_random_uuid();
  first_page uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (owner), (outsider);
  insert into public.notebooks(id, owner_id, title) values (notebook, owner, 'Page management test');
  insert into public.notebook_pages(id, owner_id, notebook_id, title, paper_style, position)
  values (first_page, owner, notebook, 'First', 'blank', 1);
  insert into public.annotations(owner_id, notebook_page_id, kind, color, width, points, z_index)
  values (owner, first_page, 'ink', '#173f5f', 0.004, '[{"x":0,"y":0},{"x":1,"y":1}]', 1);
  insert into public.page_bookmarks(owner_id, notebook_id, notebook_page_id)
  values (owner, notebook, first_page);
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', owner::text, true);
  begin
    perform public.permanently_delete_notebook_page(notebook, first_page);
    raise exception 'Permanent deletion accepted an active page';
  exception when no_data_found then null;
  end;
  update public.notebook_pages set deleted_at = now() where id = first_page;
  update public.notebook_pages set deleted_at = null where id = first_page;
  if not exists(select 1 from public.annotations where notebook_page_id = first_page)
    or not exists(select 1 from public.page_bookmarks where notebook_page_id = first_page) then
    raise exception 'Restoration lost saved content';
  end if;
  update public.notebook_pages set deleted_at = now() where id = first_page;
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  begin
    perform public.permanently_delete_notebook_page(notebook, first_page);
    raise exception 'Cross-owner permanent deletion succeeded';
  exception when no_data_found then null;
  end;
  perform set_config('request.jwt.claim.sub', owner::text, true);
  perform public.permanently_delete_notebook_page(notebook, first_page);
  execute 'reset role';
  if exists(select 1 from public.notebook_pages where id = first_page)
    or exists(select 1 from public.annotations where notebook_page_id = first_page)
    or exists(select 1 from public.page_bookmarks where notebook_page_id = first_page) then
    raise exception 'Permanent deletion did not cascade';
  end if;
end;
$$;
rollback;
