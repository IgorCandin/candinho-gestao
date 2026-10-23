# Bank — entrada monetária sem ambiguidade

Cartão https://trello.com/c/W0dF6isP . Corrige somente interpretação de entrada, não cálculos, saldos, permissões, RPCs ou valores históricos. Nenhum registro real modificado.

12 parsers de Server Actions agora reutilizam `parseBankMoneyInput`: contas, atualização rápida, entradas, recebimentos, faturas, fatura rápida, mensalidades, cobranças, empréstimos, correções de empréstimo, compromissos e objetivos. Os contratos externos continuam nos wrappers originais: obrigatório/opcional, null, zero, negativo, arredondamento e erro de domínio. Autorização e payloads não foram alterados.

Antes, `1.234` era interpretado como 1,234 decimal e salvo arredondado a1,23; agora é rejeitado com indicação de usar `1234,00` ou `1.234,00`. Formatos BR explícitos e decimal técnico com até dois centavos são aceitos. Rejeita expoente, hexadecimal, misturas inválidas, separadores repetidos e valor fora de cents seguro. Não adivinha a intenção de um ponto com três dígitos.

Teste reproduziu a falha antes; matriz cobre todas as12funções, formatos, sinais/vazio/zero e preservação dos contratos. Receipt action real com RPC simulado confirma rejeição antes de enviar e preserva1234,56 em formato BR. Sem chamadas Supabase reais. Lint da árvore Bank sem erros, com aviso antigo não alterado em entradas/page.tsx (toggleBankIncomeSource não utilizado). Build/TypeScript remoto e produção devem ser conferidos por SHA e registrados no Trello antes de declarar publicação.

Teste manual posterior: em campo monetário editável use `1234,56` ou `1.234,56`; `1.234` deve ser recusado, nunca virar1,23. Não salvar uma operação fictícia em produção para testar. Alguns formulários usam input numérico nativo; nesses, usar valor sem milhar conforme permitido pelo navegador. A mensagem do servidor pode seguir o tratamento de erro já existente no formulário; não foi reconstruída toda UX de erro financeiro.
