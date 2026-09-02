alter table public.documents
  add column bookmarked boolean not null default false;

comment on column public.documents.bookmarked is
  'Owner bookmark for the whole document, independent of PDF page bookmarks.';
