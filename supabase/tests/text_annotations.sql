-- Run after applying the text-annotation migration.
-- Synthetic content exists only inside this rolled-back transaction.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '2s';

do $$
declare
  test_owner uuid := gen_random_uuid();
  test_notebook uuid := gen_random_uuid();
  test_page uuid := gen_random_uuid();
  text_annotation uuid;
begin
  insert into auth.users (id) values (test_owner);
  insert into public.notebooks (id, owner_id, title)
    values (test_notebook, test_owner, 'Text annotation test');
  insert into public.notebook_pages (
    id, owner_id, notebook_id, title, paper_style, position
  ) values (
    test_page, test_owner, test_notebook, 'Page', 'blank', 1
  );

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', test_owner::text, true);

  insert into public.annotations (
    owner_id, notebook_page_id, kind, points, color, width, opacity,
    text_content, font_size
  ) values (
    test_owner, test_page, 'text',
    '[{"x":0.2,"y":0.2},{"x":0.52,"y":0.32}]',
    '#173f5f', 0.002, 1, 'Key finding', 0.025
  ) returning id into text_annotation;

  if not exists (
    select 1
    from public.annotations
    where id = text_annotation
      and owner_id = test_owner
      and text_content = 'Key finding'
      and font_size = 0.025
  ) then
    raise exception 'Text annotation was not stored for its owner';
  end if;

  begin
    insert into public.annotations (
      owner_id, notebook_page_id, kind, points, color, width, opacity
    ) values (
      test_owner, test_page, 'text',
      '[{"x":0.2,"y":0.2},{"x":0.52,"y":0.32}]',
      '#173f5f', 0.002, 1
    );
    raise exception 'Text annotation accepted missing text settings';
  exception when check_violation then null;
  end;

  begin
    insert into public.annotations (
      owner_id, notebook_page_id, kind, points, color, width, opacity,
      text_content, font_size
    ) values (
      test_owner, test_page, 'ink',
      '[{"x":0.2,"y":0.2},{"x":0.52,"y":0.32}]',
      '#173f5f', 0.004, 1, 'Invalid stroke text', 0.025
    );
    raise exception 'Stroke annotation accepted text settings';
  exception when check_violation then null;
  end;
end;
$$;

rollback;
