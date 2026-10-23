# P0 Company — navegação, lote 1 (23/10/2026)

Cartão único: https://trello.com/c/Fftoz6V9 . Escopo: não sair silenciosamente da Company nos caminhos confirmados, preservando componentes, consultas e ações. Não é desativação integral do ERP legado.

## Estado conferido antes da alteração

- Main `1148780c088542e65628377e23535f079399a479`; produção `dpl_9GCMMAA4kcLzk8wohbryHvECSxMn`, READY no mesmo SHA.
- PRs #58, #63, #64 já integrados. Somente PRs Dependabot #22–25 estavam abertos, fora deste lote. Nenhum trabalho repetido.
- Quatro skills locais passaram no verificador. Usadas investigação, verificação, React e testes; nenhuma instalação nova. Subagente da mesma tarefa inventariou e revisou caminhos; não foram reabertos os outros chats.
- ZIP lido como proposta, não executado em massa: SHA256 `08fb0dd8eccb0a6c4bffcbbc5faf8396ba49e98c8f954fd17a1f8a264c0cbad1`. Adendo 23/10 confrontado com Trello/main; patch P0 inspecionado. Correções adaptadas manualmente com `apply_patch`, não aplicação de scripts antigos.

## Matriz confirmada deste lote

| Origem / destino histórico | Destino Company / estado |
| --- | --- |
| Compras Suplementos, `waiting_sales` → `/vendas/:id` | `/company/concluir/:id` quando Company; fora dela mantém legado. Mesma venda. |
| SaleDetailsView → `/produtos/:id`, `/clientes/:id` | Prefixo Company derivado do retorno Company; fora dele mantém legado. |
| Logo início → `/dashboard` | `/company/inicio`; redirecionamentos por acesso não alterados. |
| Busca global, cliente Fitness → `/fitness/clientes/:id` | `/company/clientes/fitness/:id`; demais três ramos já corretos, permissões/consultas/cache preservados. |
| Nexus palette / Alt+1–4, destinos conhecidos | Reaproveita companyDestination somente no contexto Company; preserva ID do pin, query/hash, catálogo e ação/telemetria existentes. |
| Canonicalizador global de Suplementos | Não registra reescrita/listener na Company; continua funcionando fora dela. Fonte corrigida, sem redirect genérico. |
| Central `/central/*` em componentes contextuais | Já usa CompanyContextLink e rewrite `/company/gestao/central/*`; não duplicado. |
| OperationToolSearch / menus AppShell antigos | Hosts ausentes no CompanyShellV2; AppShell retorna shell Company antes desses menus. Código legado não prova escape montado. Não removido. |
| `/leads/novo` / `/suplementos/leads/novo` | Não remapeado pelo Nexus: helper histórico aponta para venda, não cadastro de lead. Precisa conferir fluxo e link de novo cliente antes de afirmar paridade. |
| `/nexus/rotinas`, `/nexus/foco`, ações Copilot e rotinas dinâmicas | Cobertura ainda incompleta; preservar disponíveis. Não inventar destino nem excluir função. |
| Downloads `/api/orcamentos/:id/pdf`, ações e RPCs | Mantidos. Endpoint de API compartilhada não é saída de interface para legado. |

O corpo SupplierOrderDetailsPage foi movido para `components/operational-pages/`, compartilhado pelos wrappers Company/legado. Páginas Next agora recebem apenas params de rota. Comparação da extração confirmou somente alteração do link esperando estoque; sabores, erros, formulário de recebimento e cancelamento intactos.

## Evidências e limites

- Antes da correção: quatro falhas reproduzidas por testes (reserva, cliente/produto, busca Fitness, canonicalização); demais verificações de acesso/erros já passavam.
- Depois: 12/12 testes focados e suíte completa 162/162; mock de reads, ações nunca chamadas. Revisão separada sem achados obrigatórios novos.
- Navegador Chromium isolado, componentes reais SSR e Nexus hidratado, dados fictícios em 320/390/414/1366 px: pedido → mesma venda Company, links cliente/produto, Ctrl+K, Alt+1, voltar; sem overflow ou erros JS/hidratação. APIs Next/RSC completas e Safari físico não são homologados por essa fixture. Telemetria Nexus foi simulada, não persistida.
- Lint global executado: 249 erros e 28 avisos. No diff há uma falha `react-hooks/set-state-in-effect` em NexusPersonalKeyboard (`void load()`), reproduzida também sobre o arquivo original do main; não introduzida pelo mapeamento. Não houve disable da regra nem correção genérica do legado. Aviso novo de fixture foi corrigido. Lint completo não é considerado aprovado.
- Build/TypeScript remoto deve ser verificado para o SHA exato antes da publicação. Não inferir publicação desta documentação. Evidência definitiva e links de PR/deployment serão registrados no cartão.

## Próximo objetivo do mesmo P0

Inventário completo antigo→Company com cobertura de permissões e pós-gravação, especialmente cadastro de lead/cliente, rotinas, Copilot e destinos dinâmicos. Somente depois de paridade e testes retirar ERP 1.0/alterar redirects; manter código compartilhado. Os P0 de realocação de reserva real, Google OAuth e correção histórica Francyelle são separados e não foram executados aqui.
