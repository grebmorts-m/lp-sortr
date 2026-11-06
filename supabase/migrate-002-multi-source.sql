-- Only needed if you ran the original schema.sql (MusicBrainz-only, keyed by mbid).
-- Adds iTunes support: entries are keyed by a text album_id instead of mbid.

alter table albums_entries add column album_id text;
alter table albums_entries add column itunes_id bigint;
alter table albums_entries add column cover_url text not null default '';
alter table albums_entries add column kind text not null default 'album' check (kind in ('album', 'ep'));

update albums_entries
set album_id = 'mb:' || mbid,
    cover_url = 'https://coverartarchive.org/release-group/' || mbid || '/front-250';

alter table albums_entries alter column album_id set not null;
alter table albums_entries alter column mbid drop not null;
alter table albums_entries drop constraint albums_entries_user_id_mbid_key;
alter table albums_entries add constraint albums_entries_user_id_album_id_key unique (user_id, album_id);
