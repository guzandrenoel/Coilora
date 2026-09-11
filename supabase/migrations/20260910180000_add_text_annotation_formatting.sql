alter table public.annotations
  add column font_family text,
  add column font_weight smallint,
  add column font_style text,
  add column text_align text;

update public.annotations
set font_family = 'modern',
    font_weight = 400,
    font_style = 'normal',
    text_align = 'left'
where kind = 'text';

alter table public.annotations
  drop constraint annotations_text_shape_check,
  add constraint annotations_text_shape_check check (
    (
      kind in ('ink', 'pencil', 'highlight')
      and text_content is null
      and font_size is null
      and font_family is null
      and font_weight is null
      and font_style is null
      and text_align is null
    )
    or
    (
      kind = 'text'
      and text_content is not null
      and font_size between 0.01 and 0.12
      and char_length(btrim(text_content)) between 1 and 2000
      and font_family in ('modern', 'classic', 'rounded', 'typewriter', 'handwritten')
      and font_weight in (400, 700)
      and font_style in ('normal', 'italic')
      and text_align in ('left', 'center', 'right')
    )
  );
