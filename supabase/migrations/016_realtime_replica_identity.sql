-- Required for Supabase Realtime UPDATE events to include full row data
alter table deposits replica identity full;
alter table users replica identity full;
alter table tournament_entries replica identity full;
alter table tournament_participants replica identity full;
