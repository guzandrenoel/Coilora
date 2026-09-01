begin;

alter table public.courses
  drop constraint courses_accent_color_check,
  add constraint courses_accent_color_check
    check (accent_color in ('sage', 'ocean', 'lavender', 'rose', 'peach', 'yellow', 'slate'));

alter table public.notebooks
  drop constraint notebooks_cover_color_check,
  add constraint notebooks_cover_color_check
    check (cover_color in ('sage', 'ocean', 'lavender', 'rose', 'peach', 'yellow', 'slate'));

commit;
