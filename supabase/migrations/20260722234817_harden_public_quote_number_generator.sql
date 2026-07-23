alter function public.generate_public_quote_number() security invoker;
revoke all on function public.generate_public_quote_number() from public;
revoke execute on function public.generate_public_quote_number() from anon, authenticated;
