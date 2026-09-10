create function public.permanently_delete_notebook_page(p_notebook_id uuid, p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.notebooks
  where id = p_notebook_id and owner_id = auth.uid() and archived_at is null
  for update;
  if not found then
    raise exception 'Notebook not found.' using errcode = 'P0002';
  end if;
  delete from public.notebook_pages
  where id = p_page_id and notebook_id = p_notebook_id
    and owner_id = auth.uid() and deleted_at is not null;
  if not found then
    raise exception 'Only a page in Trash can be permanently deleted.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.permanently_delete_notebook_page(uuid, uuid) from public, anon;
grant execute on function public.permanently_delete_notebook_page(uuid, uuid) to authenticated;
