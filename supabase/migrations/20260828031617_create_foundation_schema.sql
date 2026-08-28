create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(trim(display_name)) between 1 and 80
  ),
  study_program text check (
    study_program is null
    or char_length(trim(study_program)) between 1 and 120
  ),
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (
    char_length(trim(name)) between 1 and 120
  ),
  description text check (
    description is null
    or char_length(description) <= 1000
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid,
  title text not null check (
    char_length(trim(title)) between 1 and 160
  ),
  description text check (
    description is null
    or char_length(description) <= 1000
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebooks_course_owner_fk
    foreign key (course_id, owner_id)
    references public.courses(id, owner_id)
    on delete cascade
);

create index courses_owner_id_idx
  on public.courses(owner_id);

create unique index courses_owner_name_active_idx
  on public.courses(owner_id, lower(name))
  where archived_at is null;

create index notebooks_owner_id_idx
  on public.notebooks(owner_id);

create index notebooks_course_id_idx
  on public.notebooks(course_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger notebooks_set_updated_at
before update on public.notebooks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      ''
    )
  );

  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.notebooks enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy courses_select_own
on public.courses
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy courses_insert_own
on public.courses
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy courses_update_own
on public.courses
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy courses_delete_own
on public.courses
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy notebooks_select_own
on public.notebooks
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy notebooks_insert_own
on public.notebooks
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy notebooks_update_own
on public.notebooks
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy notebooks_delete_own
on public.notebooks
for delete
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.profiles from anon;
revoke all on public.courses from anon;
revoke all on public.notebooks from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.notebooks to authenticated;