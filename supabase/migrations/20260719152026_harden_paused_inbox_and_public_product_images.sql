-- Inbox pausado: a etiqueta de conversa não precisa ser chamável anonimamente.
revoke execute on function public.central_set_conversation_label(uuid, text) from public;
revoke execute on function public.central_set_conversation_label(uuid, text) from anon;
grant execute on function public.central_set_conversation_label(uuid, text) to authenticated;

-- product-images é bucket público. A leitura por URL pública não depende de
-- SELECT em storage.objects; remover a policy evita listagem ampla do bucket.
drop policy if exists product_images_read on storage.objects;
