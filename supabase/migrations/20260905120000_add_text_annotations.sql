alter table public.annotations
  add column text_content text,
  add column font_size double precision;

alter table public.annotations
  drop constraint annotations_kind_check,
  add constraint annotations_kind_check check (
    kind in ('ink', 'highlight', 'text')
  ),
  add constraint annotations_text_shape_check check (
    (
      kind in ('ink', 'highlight')
      and text_content is null
      and font_size is null
    )
    or
    (
      kind = 'text'
      and text_content is not null
      and font_size is not null
      and char_length(btrim(text_content)) between 1 and 2000
      and font_size between 0.01 and 0.12
    )
  );
