-- QuizArena — Supabase schema.
-- Run this on a fresh Supabase project to recreate every table, policy and function.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('student','admin')),
  color text not null default '#4F46E5',
  created_at timestamptz not null default now()
);
create table public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null, score int not null check (score >= 0), total int not null check (total > 0),
  attempted int not null default 0, time_sec int not null default 0, points int not null default 0,
  created_at timestamptz not null default now()
);
create index attempts_user_idx on public.attempts(user_id);
create index attempts_created_idx on public.attempts(created_at desc);
create table public.custom_questions (
  id text primary key, quiz_id text not null, q text not null, opts jsonb not null,
  a int not null check (a between 0 and 3),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index custom_questions_quiz_idx on public.custom_questions(quiz_id);
create table public.removed_questions (
  question_id text primary key, quiz_id text not null,
  removed_by uuid references auth.users(id) on delete set null, removed_at timestamptz not null default now()
);
create table public.app_settings (key text primary key, value text not null);
insert into public.app_settings(key, value) values ('admin_invite_code', 'QUIZ-ADMIN-2026');

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Profile row for every new auth user; admin role when signup metadata carries the valid invite code
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  wants_admin boolean := coalesce(new.raw_user_meta_data->>'role', '') = 'admin';
  code_ok boolean := exists (select 1 from public.app_settings where key = 'admin_invite_code' and value = coalesce(new.raw_user_meta_data->>'admin_code', ''));
begin
  insert into public.profiles (id, name, color, role) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'color', ''), '#4F46E5'),
    case when wants_admin and code_ok then 'admin' else 'student' end);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.check_admin_invite(code text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_settings where key = 'admin_invite_code' and value = code);
$$;
create or replace function public.admin_list_users()
returns table (id uuid, name text, email text, role text, color text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, u.email::text, p.role, p.color, p.created_at
  from public.profiles p join auth.users u on u.id = p.id where public.is_admin();
$$;

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.custom_questions enable row level security;
alter table public.removed_questions enable row level security;
alter table public.app_settings enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
create policy "attempts are public" on public.attempts for select using (true);
create policy "users insert own attempts" on public.attempts for insert with check (auth.uid() = user_id);
create policy "custom questions readable" on public.custom_questions for select using (true);
create policy "admins add questions" on public.custom_questions for insert with check (public.is_admin());
create policy "admins delete questions" on public.custom_questions for delete using (public.is_admin());
create policy "removed questions readable" on public.removed_questions for select using (true);
create policy "admins remove questions" on public.removed_questions for insert with check (public.is_admin());
create policy "admins restore questions" on public.removed_questions for delete using (public.is_admin());
create policy "no client access" on public.app_settings for select using (false);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.check_admin_invite(text) to anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Admins can read the current invite code (shown in Admin -> Settings)
create or replace function public.admin_get_invite()
returns text language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  if not public.is_admin() then raise exception 'Only admins can view the invite code'; end if;
  select value into v from public.app_settings where key = 'admin_invite_code';
  return v;
end;
$$;
revoke execute on function public.admin_get_invite() from public, anon;
grant execute on function public.admin_get_invite() to authenticated;

-- Change the admin invite code any time:
-- update public.app_settings set value = 'NEW-CODE' where key = 'admin_invite_code';

-- ===================== Live 1v1 duels =====================
-- Two students answer the same questions against one shared clock. The server owns the
-- clock, the answer key and the score; clients only send "I picked option N".
-- Realtime: duels + duel_answers are in the supabase_realtime publication.
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  quiz_id text not null,
  q_ids text[] not null,
  q_ans int[] not null default '{}',        -- answer key: never sent to a browser
  per_q_sec int not null default 15 check (per_q_sec between 5 and 60),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','playing','done','cancelled')),
  q_index int not null default 0,
  deadline timestamptz,
  host_score int not null default 0, guest_score int not null default 0,
  host_correct int not null default 0, guest_correct int not null default 0,
  left_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index duels_open_idx on public.duels(status, created_at desc);
create index duels_host_idx on public.duels(host_id);
create index duels_guest_idx on public.duels(guest_id);

create table public.duel_answers (
  duel_id uuid not null references public.duels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  q_index int not null,
  choice int,                                -- null = ran out of time
  correct boolean not null default false,
  points int not null default 0,
  answered_at timestamptz not null default now(),
  primary key (duel_id, user_id, q_index)
);

alter table public.duels enable row level security;
alter table public.duel_answers enable row level security;
create policy "duels visible" on public.duels for select
  using (status = 'waiting' or host_id = auth.uid() or guest_id = auth.uid());
create policy "duel answers visible to players" on public.duel_answers for select
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.host_id = auth.uid() or d.guest_id = auth.uid())));

-- Column grants, not a table-wide one, so q_ans never reaches a client (a table-wide
-- SELECT grant would override any column revoke).
revoke select on public.duels from anon, authenticated;
grant select (id, code, quiz_id, q_ids, per_q_sec, host_id, guest_id, status, q_index, deadline,
              host_score, guest_score, host_correct, guest_correct, left_by, created_at, updated_at)
  on public.duels to anon, authenticated;

-- Functions: duel_payload (strips the key), duel_advance, duel_create, duel_join, duel_get,
-- duel_answer (scores server-side: 10 points + up to 5 for speed), duel_tick (closes an
-- expired question), duel_leave, duel_open (lobby), duel_history (win/loss record).
-- See the quizarena_duels* migrations for their bodies.

alter publication supabase_realtime add table public.duels;
alter publication supabase_realtime add table public.duel_answers;


-- ===================== Roles without invite codes =====================
-- Sign-up always creates a student. The first account on a fresh install becomes
-- the admin; after that admins promote people from Admin -> Students.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_ever boolean;
begin
  select not exists (select 1 from public.profiles) into first_ever;
  insert into public.profiles (id, name, color, role) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'color', ''), '#4F46E5'),
    case when first_ever then 'admin' else 'student' end);
  return new;
end; $$;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare admins int;
begin
  if not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  if p_role not in ('student','admin') then raise exception 'Unknown role'; end if;
  if p_user = auth.uid() and p_role = 'student' then
    raise exception 'You cannot remove your own admin access';
  end if;
  if p_role = 'student' then
    select count(*) into admins from public.profiles where role = 'admin';
    if admins <= 1 then raise exception 'This is the last admin - promote someone else first'; end if;
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'No such user'; end if;
  return jsonb_build_object('id', p_user, 'role', p_role);
end; $$;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- The invite-code machinery is gone:
drop function if exists public.check_admin_invite(text);
drop function if exists public.admin_get_invite();
drop function if exists public.set_admin_invite(text);
drop table if exists public.app_settings;
