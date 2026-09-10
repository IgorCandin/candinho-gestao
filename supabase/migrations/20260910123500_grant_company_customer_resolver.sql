-- The resolver is the authenticated Company/Fitness customer-write endpoint.
-- Its body still enforces can_write_fitness() before touching any row.
revoke execute on function public.fitness_resolve_customer(uuid, text, text, text, text, text)
from public, anon;

grant execute on function public.fitness_resolve_customer(uuid, text, text, text, text, text)
to authenticated, service_role;
