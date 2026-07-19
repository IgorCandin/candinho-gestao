# Hotfix Nexus/CORS V1.1

## O erro encontrado
Os PDFs não estavam falhando na leitura do Nexus.
O navegador nem conseguia iniciar o POST.

Nos logs do Supabase, todas as tentativas do `marketing-pdf-ingest` chegaram como:

`OPTIONS | 405`

Isso é o preflight CORS do navegador. A Edge Function aceitava somente POST, então o navegador bloqueava a chamada antes do processamento começar.

## Correção aplicada no app
Em vez de o navegador chamar a Edge Function diretamente:

Browser -> Supabase Edge Function

agora o fluxo é:

Browser -> API interna do Next.js -> Supabase Edge Function

Assim não existe preflight CORS entre o navegador e a Edge Function.

## PDFs existentes
Os 3 projetos continuam com status `pending`, então depois do deploy basta abrir `/marketing/ideias`.
O processador automático tentará os três novamente e atualizará as páginas quando concluir.

## Bônus
Os logs mostraram o mesmo `OPTIONS | 405` na nova função `central-delete-conversation`.
Este hotfix também corrige o botão `Excluir do Inbox` usando uma rota interna do Next.js.

## Commit sugerido
`Hotfix V1.1 · Corrige CORS do Nexus e excluir conversa`
