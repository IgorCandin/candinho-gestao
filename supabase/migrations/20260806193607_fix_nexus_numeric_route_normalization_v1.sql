create or replace function public.normalize_nexus_route_v1(p_route text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          split_part(split_part(coalesce(p_route,''),'?',1),'#',1),
          '/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}',
          '/:id',
          'g'
        ),
        '/[0-9]+/',
        '/:id/',
        'g'
      ),
      '/[0-9]+$',
      '/:id'
    ),
    280
  );
$$;

