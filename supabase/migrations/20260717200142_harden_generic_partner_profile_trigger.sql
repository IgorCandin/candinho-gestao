-- Trigger function only. It must not be directly exposed through the REST RPC API.
revoke all on function public.configure_generic_partner_profile() from public, anon, authenticated;
