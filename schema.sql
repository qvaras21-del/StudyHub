-- StudyHub schema for Supabase (NOT yet connected to the app; run in the SQL editor of your project).
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '', role text not null default 'student' check (role in ('student','teacher','admin')),
  points int not null default 0, banned boolean not null default false, created_at timestamptz default now());
create table courses (id text primary key, category text, level int, title jsonb, description jsonb, published boolean default true);
create table lessons (id bigint generated always as identity primary key, course_id text references courses on delete cascade, position int, title jsonb, body jsonb, quiz jsonb);
create table progress (user_id uuid references profiles on delete cascade, lesson_id bigint references lessons on delete cascade, completed_at timestamptz default now(), primary key (user_id, lesson_id));
create table tests (id uuid primary key default gen_random_uuid(), owner uuid references profiles on delete cascade, title text not null, minutes int default 10, questions jsonb not null, is_public boolean default false);
create table attempts (id bigint generated always as identity primary key, user_id uuid references profiles on delete cascade, test_id uuid references tests on delete set null, score int, total int, created_at timestamptz default now());
create table tasks (id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, title text not null, due date, priority int default 2, done boolean default false, done_at timestamptz);
create table materials (id uuid primary key default gen_random_uuid(), owner uuid references profiles on delete cascade, title text not null, author text, category text, file_path text, downloadable boolean default false, approved boolean default false, created_at timestamptz default now());

create function public.my_role() returns text language sql security definer stable set search_path = public as $$ select role from profiles where id = auth.uid() $$;
create function public.is_admin() returns boolean language sql security definer stable set search_path = public as $$ select coalesce(public.my_role() = 'admin', false) $$;

-- Create a profile on signup
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Points come only from the server: +10 per newly completed lesson (primary key blocks repeats)
create function public.award_lesson() returns trigger language plpgsql security definer set search_path = public as $$
begin update profiles set points = points + 10 where id = new.user_id; return new; end $$;
create trigger on_progress_insert after insert on progress for each row execute function public.award_lesson();

-- Users may edit only their own name; role/points/banned cannot be changed from the client
revoke update on profiles from authenticated, anon;
grant update (name) on profiles to authenticated;
create function public.set_role(target uuid, new_role text) returns void language plpgsql security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'forbidden'; end if; update profiles set role = new_role where id = target; end $$;

alter table profiles enable row level security; alter table courses enable row level security; alter table lessons enable row level security;
alter table progress enable row level security; alter table tests enable row level security; alter table attempts enable row level security;
alter table tasks enable row level security; alter table materials enable row level security;

create policy profiles_read on profiles for select using (auth.uid() is not null);
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy courses_read on courses for select using (published or public.is_admin());
create policy courses_write on courses for all using (public.is_admin() or public.my_role()='teacher') with check (public.is_admin() or public.my_role()='teacher');
create policy lessons_read on lessons for select using (auth.uid() is not null);
create policy lessons_write on lessons for all using (public.is_admin() or public.my_role()='teacher') with check (public.is_admin() or public.my_role()='teacher');
create policy progress_own on progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tests_read on tests for select using (is_public or owner = auth.uid() or public.is_admin());
create policy tests_write on tests for all using (owner = auth.uid() or public.is_admin()) with check (owner = auth.uid() or public.is_admin());
create policy attempts_own on attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_own on tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy materials_read on materials for select using (approved or owner = auth.uid() or public.is_admin());
create policy materials_write on materials for insert with check (owner = auth.uid());
create policy materials_edit on materials for update using (owner = auth.uid() or public.is_admin());
create policy materials_del on materials for delete using (owner = auth.uid() or public.is_admin());
