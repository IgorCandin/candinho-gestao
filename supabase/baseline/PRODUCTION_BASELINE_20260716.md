# Candinho Company — Baseline operacional de produção

Data de fechamento da V1: 16/07/2026
Projeto Supabase de produção: `ilboydbakpcfoaexpnhw`

## Estado considerado fonte de verdade

A produção recebeu migrações incrementais durante o desenvolvimento rápido do aplicativo. O histórico do Supabase é a fonte de verdade para a sequência exata já aplicada em produção. Este repositório preserva as migrações estruturais disponíveis e os arquivos finais de hardening da V1.

Este documento é um baseline operacional; não substitui um `pg_dump` completo do banco.

## Candinho Fitness — importação oficial

Fonte: planilha `Candinho Fitness Gestao.xlsx`, fornecida pelo usuário em 16/07/2026.

Importado e validado em produção:

- 25 produtos-base ativos
- 62 variações oficiais por tamanho/cor/SKU
- 29 clientes
- 58 vendas históricas
- 58 itens de venda
- 6 fornecedores
- 15 pedidos de fornecedor
- 77 itens de pedido
- 138 movimentos de estoque
- 71 unidades de estoque físico final
- 6 vendas ainda a receber

O catálogo Fitness gerado durante desenvolvimento foi arquivado no schema privado `fitness_archive` e removido da operação ativa.

### Exceção histórica preservada

`PED-00009 / PROD-00027`: a aba de itens do pedido informa 10 unidades recebidas, mas o `Movimento_Geral` possui entrada de 5 unidades. O estoque final da planilha fecha corretamente usando 5 unidades. Por isso:

- histórico do item de pedido: 10 recebidas;
- razão/ledger de estoque: 5 entradas;
- estoque atual segue `Movimento_Geral`, considerado fonte de verdade para saldo físico.

## Validações do fechamento

- estoque Fitness por SKU comparado com os 62 SKUs da planilha: 0 divergências;
- estoque físico total: 71 unidades;
- estoque negativo: 0;
- fluxo temporário Cliente → Venda → Pago → Entregue → Cancelado testado com rollback;
- nenhum registro de teste permaneceu salvo;
- custos históricos preservados com precisão da planilha; totais contábeis do app são arredondados a centavos por venda;
- RLS de Orçamentos restringida à operação Suplementos;
- view de ordenação comercial alterada para `security_invoker`;
- funções `SECURITY DEFINER` operacionais não são executáveis pelo papel `anon`, com exceção intencional de `resolve_login_email` para login por usuário.

## Itens não bloqueantes / manuais

- Ativar “Leaked Password Protection” no painel do Supabase Auth é recomendado, mas não é executável pela camada SQL usada neste fechamento.
- O bucket público `product-images` mantém a política atual para não arriscar quebra do fluxo de imagens já estável; o Advisor alerta que a listagem de objetos é ampla. Revisar somente em uma janela própria de segurança.
- Tabelas antigas de staging/importação AppSheet continuam isoladas e podem aparecer como avisos informativos do Advisor.
- As fotos referenciadas na planilha Fitness eram caminhos do AppSheet e não estavam incorporadas no XLSX; portanto as fotos devem ser adicionadas pelo app.

## Recuperação

Para recuperação completa em desastre, manter:

1. backup do Supabase / dump PostgreSQL;
2. este repositório;
3. a planilha original `Candinho Fitness Gestao.xlsx` em local privado;
4. histórico de migrações registrado no projeto Supabase de produção.

## Bank — regra de não duplicidade

No fechamento da V1 foi revisada a view `bank_dashboard_summary`. Cobranças com `charge_type = 'card_invoice'` são excluídas dos totais de cobranças porque as faturas são somadas separadamente por `bank_card_invoices`. Isso evita descontar a mesma obrigação duas vezes.
