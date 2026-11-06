-- LP Sortr database schema. Paste into Supabase → SQL Editor → Run.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz default now()
);

create table albums_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list text not null check (list in ('ranked', 'shortlist')),
  album_id text not null,              -- "itunes:<collectionId>" or "mb:<release-group id>"
  itunes_id bigint,                    -- Apple collection id, if known
  mbid uuid,                           -- MusicBrainz release-group id, if known
  title text not null,
  artist text not null,
  year int,
  cover_url text not null default '',
  kind text not null default 'album' check (kind in ('album', 'ep')),
  position double precision not null,  -- fractional ordering: a reorder updates one row
  note text,
  created_at timestamptz default now(),
  unique (user_id, album_id)           -- an album lives in exactly one list
);

alter table profiles enable row level security;
alter table albums_entries enable row level security;

create policy "own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy "own entries" on albums_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile row from the username passed at sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, new.raw_user_meta_data->>'username');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
