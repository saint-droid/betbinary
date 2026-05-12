-- Enable Supabase Realtime for tournament tables, deposits, and users
alter publication supabase_realtime add table tournament_entries;
alter publication supabase_realtime add table tournament_participants;
alter publication supabase_realtime add table deposits;
alter publication supabase_realtime add table users;
