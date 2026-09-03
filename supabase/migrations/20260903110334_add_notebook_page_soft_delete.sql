alter table public.notebook_pages
  add column deleted_at timestamptz;

comment on column public.notebook_pages.deleted_at is
  'Null for active pages. A timestamp marks a page as soft-deleted and recoverable.';

create index notebook_pages_active_owner_notebook_position_idx
  on public.notebook_pages(owner_id, notebook_id, position)
  where deleted_at is null;

-- Page removal uses deleted_at instead of a direct permanent delete.
revoke delete on public.notebook_pages from authenticated;

drop policy notebook_pages_delete_own
  on public.notebook_pages;

-- A direct database client must restore before changing page content. RLS
-- continues to check ownership; this trigger also protects the saved snapshot.
create function public.protect_trashed_notebook_page()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.deleted_at is not null or new.deleted_at is not null)
    and (to_jsonb(new) - 'deleted_at' - 'updated_at')
      is distinct from (to_jsonb(old) - 'deleted_at' - 'updated_at') then
    raise exception 'Restore the notebook page before editing it.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_trashed_notebook_page() from public;

create trigger notebook_pages_protect_trashed
before update on public.notebook_pages
for each row execute function public.protect_trashed_notebook_page();

-- Preserve annotations while preventing access through a trashed note page.
create policy annotations_require_active_note_page
on public.annotations
as restrictive
for all
to authenticated
using (
  notebook_page_id is null
  or exists (
    select 1
    from public.notebook_pages
    where notebook_pages.id = annotations.notebook_page_id
      and notebook_pages.owner_id = (select auth.uid())
      and notebook_pages.deleted_at is null
  )
);

-- Preserve bookmarks so they become available again after restoration.
create policy page_bookmarks_require_active_note_page
on public.page_bookmarks
as restrictive
for all
to authenticated
using (
  notebook_page_id is null
  or exists (
    select 1
    from public.notebook_pages
    where notebook_pages.id = page_bookmarks.notebook_page_id
      and notebook_pages.owner_id = (select auth.uid())
      and notebook_pages.deleted_at is null
  )
);
