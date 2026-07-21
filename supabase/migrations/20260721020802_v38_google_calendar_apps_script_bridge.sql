begin;

alter table public.central_calendar_internal_config
  add column if not exists apps_script_url text,
  add column if not exists apps_script_secret text;

update public.central_calendar_internal_config
set
  apps_script_url=
    'https://script.google.com/macros/s/AKfycbwp1YjbcmqxjYIJy-f0bDKI2blH44ja8bgegl56tsZTSo9xa2ETLwwMCdi_57HcFgTSSQ/exec',
  apps_script_secret=coalesce(
    nullif(apps_script_secret,''),
    encode(gen_random_bytes(32),'hex')
  ),
  updated_at=now()
where singleton=true;

commit;
