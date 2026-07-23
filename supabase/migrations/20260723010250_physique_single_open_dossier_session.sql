create unique index if not exists physique_athlete_one_open_import_session_idx
on public.physique_athlete_import_sessions(athlete_id)
where status = 'open';
