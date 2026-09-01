alter table public.notebooks
  add column cover_color text not null default 'sage'
  constraint notebooks_cover_color_check
  check (cover_color in ('sage', 'ocean', 'lavender', 'rose', 'peach', 'slate'));

comment on column public.notebooks.cover_color is
  'User-selected notebook cover palette. Existing owner-scoped policies apply.';
