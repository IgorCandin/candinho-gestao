# Candinho ERP · V45.12

## Hierarquia UX + Bank por dia + política de estoque para o caixa atual

Pacote cumulativo: inclui os arquivos do V45.11. Se o V45.11 ainda não foi
publicado, basta extrair este V45.12 na raiz do repositório e subir somente ele.

## 1. Bank · vencimentos agrupados por dia

As listas de compromissos continuam na ordem cronológica original, porém agora
recebem cabeçalhos de grupo por vencimento.

Cada data mostra:
- total necessário naquele dia;
- saldo disponível atual;
- verde quando o saldo cobre o grupo;
- vermelho com `Falta R$ X` quando o saldo atual é menor que o total do dia.

A comparação é propositalmente com o saldo disponível atual. Não desconta os
dias anteriores para não fingir uma projeção de caixa que não considere novas
entradas.

Compromissos `Mês` / sem dia fixo mostram o total do grupo, mas não recebem o
semáforo diário.

## 2. Novo Orçamento · sem coluna espremida

O formulário passa a usar a largura inteira para cliente, produtos, ajustes e
observações.

Pagamento, entrega, pós-venda, parceria e informações auxiliares ficam abaixo
do conteúdo principal. O bloco `COMO ESTÁ ESSA NEGOCIAÇÃO?`, resumo e ações de
salvar ficam no fechamento da página.

A lógica comercial existente foi preservada:
- preço normal continua sendo o padrão;
- promoção continua sendo aplicada somente pelo botão explícito;
- orçamento continua separado de venda confirmada;
- agenda/pós-venda continuam seguindo o fluxo V45.10.

## 3. Estoque · política temporária de caixa

A prioridade agora é baseada em giro real e ruptura, não apenas em `min_stock`.

Política atual:
- venda aguardando produto: crítico;
- estoque 0 + alto giro: crítico/urgente e sugestão mínima de 1 unidade;
- estoque 0 + giro regular: atenção, sem compra automática;
- estoque 0 + baixo giro: monitorar, sem compra automática;
- estoque 1 + alto giro: atenção, sem compra obrigatória;
- estoque 1 + demais giros: monitorar;
- estoque >= 2: sem sugestão automática no modo caixa atual.

Alto giro usa os dados reais existentes: 2+ unidades em 30 dias ou 5+ em 90
dias. Não existem nomes de produtos hardcoded.

As migrations também alinham `replenishment_overview` ao giro dinâmico:
- A com 1 unidade continua `below_minimum`/atenção, sem compra automática;
- A zerado entra como reposição automática de 1 unidade;
- B zerado continua sem estoque, mas não entra como compra obrigatória;
- C/Z ficam sob demanda no modo caixa atual.

## 4. Nexus · stockout compatível com giro

O gerador antigo transformava qualquer produto zerado com estoque ideal em
`urgent`. A V45.12 adiciona um normalizador no banco:
- categoria dinâmica A zerada: `urgent`;
- B zerada: `attention`;
- C/Z: informativo e resolvido;
- saldo disponível ou reposição a caminho: resolvido.

A migration já foi aplicada no Supabase oficial. O arquivo segue no pacote
somente para manter GitHub e banco sincronizados.

## 5. Nexus Inbox · uma função clara

Inbox deixa de competir com vários painéis laterais.

Agora a tela principal responde a uma pergunta: **o que chegou para decidir?**

Mantém no topo somente:
- sinais ativos;
- urgentes;
- oportunidades.

`Rotina guiada`, `Rotina aprendida` e `Limites do Nexus` foram movidos para um
bloco recolhível no fim: `Como o Nexus trabalha`.

O score técnico dos sinais também deixa de aparecer dentro desta Inbox.

## 6. Separação de responsabilidades

Sem apagar funções:
- `Hoje`: cockpit operacional do dia;
- `Nexus Inbox`: triagem de sinais novos/exceções;
- `Fila Única`: backlog acionável completo;
- `Gestão`: supervisão e exceções, não outra fila diária;
- `Nexus IA`: interpretação/comando, não outro dashboard;
- `Rotinas`: playbooks, configuração e histórico.

Na Gestão, o painel `Prioridades` passa visualmente para depois dos blocos
operacionais e recebe o nome `Exceções de gestão`.

## Arquivos principais

- `src/app/v45-12-hierarchy-ux.css`
- `src/components/bank-daily-commitment-groups-ux.tsx`
- `src/components/erp-hierarchy-ux.tsx`
- `src/components/nexus-command-center.tsx`
- `src/components/v459-ui-foundation-marker.tsx`
- `src/app/(app)/pedidos-fornecedor/planejamento/page.tsx`
- `supabase/migrations/20260808123000_v45_12_nexus_stock_cash_policy.sql`
- `supabase/migrations/20260808123500_v45_12_replenishment_high_turnover_only.sql`

## Validação

- TypeScript/TSX: sintaxe validada com `tsc --noCheck --noEmit`;
- CSS: chaves balanceadas;
- imports duplicados: nenhum;
- migration: aplicada com sucesso no Supabase oficial.

## Commit sugerido

`V45.12 - organiza hierarquia UX, Bank por dia e prioridade de estoque`
