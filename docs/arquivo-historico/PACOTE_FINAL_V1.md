# Candinho Company — Pacote Final V1

Este pacote consolida a V1 das operações Candinho Suplementos, Candinho Bank e Candinho Fitness.

## Fechamento incluído

- Tratamento de sessão Supabase expirada/revogada no middleware: sessão inválida volta para login e limpa cookies antigos, em vez de gerar erro de runtime.
- Hardening final de RLS e permissões.
- Baseline operacional de produção documentado em `supabase/baseline/PRODUCTION_BASELINE_20260716.md`.
- Candinho Fitness alimentada em produção com a planilha oficial da Giulia.
- Catálogo de desenvolvimento Fitness arquivado e retirado da operação.
- Migrações finais de estrutura/hardening registradas no projeto.

## Dados oficiais Fitness carregados

25 produtos-base, 62 variações, 29 clientes, 58 vendas, 6 fornecedores, 15 pedidos, 77 itens de pedido, 138 movimentos e 71 unidades em estoque.

As imagens antigas não vieram incorporadas no arquivo XLSX; devem ser cadastradas pelo fluxo normal de fotos do aplicativo.

## Revisão final da Candinho Bank

- Corrigida a regra de não duplicidade do Dashboard: uma fatura que também possua cobrança gerada não é mais descontada duas vezes.
- A projeção anual já tratava `card_invoice` separadamente; o Dashboard agora segue a mesma regra.

## Validação técnica final

- `npm ci`: 364 pacotes instalados, 0 vulnerabilidades encontradas.
- ESLint: aprovado.
- TypeScript (`tsc --noEmit`): aprovado.
- Next.js 16: build validado em modo `compile` + `generate`; todas as rotas das três operações foram geradas.
- Teste transacional Fitness: criar cliente → venda → receber → entregar → cancelar → estoque restaurado; rollback concluído e 0 registros de teste persistidos.
- Estoque Fitness oficial comparado SKU a SKU com a planilha: 0 divergências, 71 unidades.
- Dashboard Bank revisado para impedir dupla contagem de faturas.
