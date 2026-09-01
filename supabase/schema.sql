-- SVHA MO13-1 Teamapp - Supabase schema + beginvulling
-- Plak dit één keer in Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  shirt_number integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'parent' check (role in ('parent','coach')),
  created_at timestamptz not null default now()
);

create table if not exists public.parent_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (user_id, player_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('training','match')),
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  round integer,
  home_team text,
  away_team text,
  location_name text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(player_id,event_id)
);

create table if not exists public.transport_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','replacement_needed')),
  unique(event_id,player_id)
);

create table if not exists public.laundry_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','replacement_needed')),
  unique(event_id,player_id)
);

-- Automatisch profiel aanmaken wanneer een Auth-gebruiker wordt aangemaakt.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 'parent')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='coach');
$$;

create or replace function public.is_my_player(pid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.parent_players pp where pp.user_id=auth.uid() and pp.player_id=pid);
$$;

alter table public.players enable row level security;
alter table public.profiles enable row level security;
alter table public.parent_players enable row level security;
alter table public.events enable row level security;
alter table public.absences enable row level security;
alter table public.transport_assignments enable row level security;
alter table public.laundry_assignments enable row level security;

-- Lezen: alle ingelogde teamleden mogen de teamplanning zien.
create policy "players read authenticated" on public.players for select to authenticated using (true);
create policy "events read authenticated" on public.events for select to authenticated using (true);
create policy "absences read authenticated" on public.absences for select to authenticated using (true);
create policy "transport read authenticated" on public.transport_assignments for select to authenticated using (true);
create policy "laundry read authenticated" on public.laundry_assignments for select to authenticated using (true);
create policy "own profile read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_coach());
create policy "own links read" on public.parent_players for select to authenticated using (user_id=auth.uid() or public.is_coach());

-- Ouders mogen alleen voor gekoppelde speelsters afmelden; coaches mogen alles.
create policy "absence insert own player" on public.absences for insert to authenticated with check (public.is_my_player(player_id) or public.is_coach());
create policy "absence delete own player" on public.absences for delete to authenticated using (public.is_my_player(player_id) or public.is_coach());
create policy "transport update own player" on public.transport_assignments for update to authenticated using (public.is_my_player(player_id) or public.is_coach()) with check (public.is_my_player(player_id) or public.is_coach());
create policy "laundry update own player" on public.laundry_assignments for update to authenticated using (public.is_my_player(player_id) or public.is_coach()) with check (public.is_my_player(player_id) or public.is_coach());

-- Coaches kunnen planning beheren.
create policy "coach manage players" on public.players for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "coach manage events" on public.events for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "coach manage transport" on public.transport_assignments for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "coach manage laundry" on public.laundry_assignments for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "coach manage links" on public.parent_players for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy "coach update profiles" on public.profiles for update to authenticated using (public.is_coach()) with check (public.is_coach());

-- Speelsters
insert into public.players(name,shirt_number) values
('Willemijn Doelman',1),('Julé Arwen van de Wal',2),('Soof de Ruijter',3),('Anna Gidding',4),('Lexi van de Ven',5),('Nola Roelofsen',6),('Aaliyah Ansari',7),('Norjan Daoud',8),('Evi Rothoff',9),('Fayenn Hanhart',10),('Milou Riedijk',11),('Vajèn Velthuizen',12),('Noelle van Drunen',13)
on conflict(name) do update set shirt_number=excluded.shirt_number, active=true;

-- Wedstrijden
insert into public.events(event_type,starts_at,ends_at,round,home_team,away_team,location_name,address)
select * from (values
('match','2026-09-05 08:30 Europe/Amsterdam'::timestamptz,'2026-09-05 10:00 Europe/Amsterdam'::timestamptz,1,'DTS ''35 Ede MO13-1','SVHA MO13-1','Sportpark Inschoten','Inschoterweg 2, 6715 CS Ede'),
('match','2026-09-12 08:30 Europe/Amsterdam'::timestamptz,'2026-09-12 10:00 Europe/Amsterdam'::timestamptz,2,'SVHA MO13-1','sv DFS MO13-1','Sportpark SVHA',null),
('match','2026-09-19 10:00 Europe/Amsterdam'::timestamptz,'2026-09-19 11:30 Europe/Amsterdam'::timestamptz,3,'Leones MO13-1 (9-tal)','SVHA MO13-1','Sportpark ''Het Zijvond''','De Peel 6, 6658 DJ Beneden-Leeuwen'),
('match','2026-09-26 08:30 Europe/Amsterdam'::timestamptz,'2026-09-26 10:00 Europe/Amsterdam'::timestamptz,4,'Bennekom MO13-1','SVHA MO13-1','Sportpark ''De Eikelhof''','Achterstraat 7, 6721 VM Bennekom'),
('match','2026-10-03 10:30 Europe/Amsterdam'::timestamptz,'2026-10-03 12:00 Europe/Amsterdam'::timestamptz,5,'SVHA MO13-1','Blauw Geel ''55 MO13-1','Sportpark SVHA',null)
) as v(event_type,starts_at,ends_at,round,home_team,away_team,location_name,address)
where not exists(select 1 from public.events e where e.event_type='match' and e.starts_at=v.starts_at and e.home_team=v.home_team and e.away_team=v.away_team);

-- Trainingen: maandag en woensdag 18:00-19:00, beginfase t/m 7 oktober.
insert into public.events(event_type,title,starts_at,ends_at,location_name)
select 'training','Training',
       ((g::date + time '18:00') at time zone 'Europe/Amsterdam'),
       ((g::date + time '19:00') at time zone 'Europe/Amsterdam'),
       'Sportpark SVHA'
from generate_series('2026-09-02'::date,'2026-10-07'::date,'1 day'::interval) g
where extract(isodow from g) in (1,3)
and not exists(select 1 from public.events e where e.event_type='training' and e.starts_at=((g::date + time '18:00') at time zone 'Europe/Amsterdam'));

-- Rijschema
insert into public.transport_assignments(event_id,player_id)
select e.id,p.id from (values
('2026-09-05'::date,'Willemijn Doelman'),('2026-09-05','Julé Arwen van de Wal'),('2026-09-05','Soof de Ruijter'),
('2026-09-19','Anna Gidding'),('2026-09-19','Lexi van de Ven'),('2026-09-19','Nola Roelofsen'),
('2026-09-26','Aaliyah Ansari'),('2026-09-26','Evi Rothoff'),('2026-09-26','Fayenn Hanhart')
) v(match_date,player_name)
join public.players p on p.name=v.player_name
join public.events e on e.event_type='match' and (e.starts_at at time zone 'Europe/Amsterdam')::date=v.match_date
on conflict(event_id,player_id) do nothing;

-- Wastasschema
insert into public.laundry_assignments(event_id,player_id)
select e.id,p.id from (values
('2026-09-05'::date,'Norjan Daoud'),('2026-09-12','Lexi van de Ven'),('2026-09-19','Vajèn Velthuizen'),('2026-09-26','Milou Riedijk'),('2026-10-03','Willemijn Doelman')
) v(match_date,player_name)
join public.players p on p.name=v.player_name
join public.events e on e.event_type='match' and (e.starts_at at time zone 'Europe/Amsterdam')::date=v.match_date
on conflict(event_id,player_id) do nothing;
