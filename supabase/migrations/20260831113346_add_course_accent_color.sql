alter table public.courses
  add column accent_color text not null default 'sage'
  constraint courses_accent_color_check
  check (
    accent_color in (
      'sage', 'ocean', 'lavender', 'rose', 'peach', 'slate'
    )
  );