-- Remove política antiga que liberava parceiros para qualquer autenticado.
drop policy if exists partners_read_authenticated on public.partners;
