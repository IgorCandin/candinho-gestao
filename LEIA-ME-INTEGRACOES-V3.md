# Candinho Central — Integrações V3

Este patch evolui a tela `/central/integracoes`.

## Incluído
- Cadastro de conta Meta diretamente pela interface.
- Campos: canal, operação, nome da conta e ID externo.
- Nenhum token, senha ou secret é salvo pela tela.
- Cadastro utiliza a RPC segura `central_register_integration` já existente no Supabase.
- Conta é registrada inicialmente como `disconnected` até a ativação externa da Meta.
- Confirmação visual após cadastro.
- Saúde das contas passa a exibir escopo, nome e ID externo.
- Mantém diagnóstico de Meta e OpenAI.

## Validação
- ESLint: 0 erros (1 aviso preexistente na página de mídia sobre `<img>`).
- `next build`: concluído com sucesso.

## Commit sugerido
`Integrações V3 · Cadastro de contas Meta`
