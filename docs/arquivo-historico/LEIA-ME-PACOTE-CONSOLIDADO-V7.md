# Candinho Company — Pacote Consolidado V7

Este pacote foi gerado como **pacote consolidado completo** para ser extraído sobre o repositório atual.
Ele inclui as evoluções do V6 que ainda não estavam em produção e todas as correções/evoluções do V7.

## Como aplicar

1. Faça uma cópia de segurança da pasta atual, se desejar.
2. Extraia o conteúdo deste ZIP sobre a raiz do projeto `candinho-gestao`.
3. Preserve seus arquivos locais `.git`, `.env` e `.env.local`.
4. Revise as alterações no GitHub Desktop.
5. Commit sugerido:
   `Pacote Consolidado V7 · UX, Logos, Investimentos e Radar`
6. Faça Push para `main` e aguarde o deploy da Vercel.

As migrations incluídas neste pacote que já aparecem no histórico de produção do Supabase **não precisam ser executadas manualmente**.

---

## V7 — Identidade e UX

- Logos substituídas pelas novas versões nomeadas enviadas pelo usuário.
- Separação oficial entre logos `Reduzida` e `Completa`.
- Login mantém a ordem:
  1. Fitness
  2. Suplementos
  3. Bank
  4. Central
  5. Marketing
- Home da Company sem o cabeçalho/logo redundante no topo.
- Home reorganizada e centralizada:
  - Linha 1: Suplementos | Fitness | Marketing
  - Linha 2: Bank | Central
- Logos reduzidas nos cards de seleção de operação.
- Logo completa dentro de cada operação, no menu lateral e cabeçalho mobile.
- Removido atalho mobile duplicado de Pendências da Central.
- Sidebar passa a rolar verticalmente em telas de menor altura, evitando corte no Bank e demais operações.
- Ajustes de overflow horizontal para reduzir corte de layout em zoom normal.

## V7 — Product Gallery

- Zoom da galeria refeito como tamanho real dos cards.
- Cinco níveis de tamanho.
- Grid responsivo por `auto-fit/minmax` no desktop.
- Comportamento específico no celular:
  - níveis menores: 2 colunas;
  - níveis médios/grandes: 1 coluna.
- Removida dependência do antigo comportamento `density-*` que forçava colunas pequenas.

## V7 — Valor Investido por Operação

Nova RPC:
- `bank_operation_investment_snapshot(reference_month)`

Nova visualização no Bank com alternância:
- **Mensal**
- **Montante**

### Mensal
Soma:
- custo efetivamente recebido no mês;
- parte ainda pendente dos pedidos realizados naquele mês.

Evita contar duas vezes um pedido já recebido.

### Montante
Soma:
- valor atual do estoque a custo;
- valor ainda aberto em pedidos a caminho.

Exibe:
- Company;
- Suplementos;
- Fitness.

O indicador de Suplementos também aparece na Home da operação Suplementos.

## V7 — Radar de Oportunidades

Nova rota:
- `/clientes/radar`

O Radar cruza:
- histórico de compras;
- última compra;
- produto mais comprado;
- último produto;
- duração estimada de uso;
- janela provável de recompra;
- dias sem comprar;
- dias sem contato;
- leads em aberto;
- retornos/follow-ups do CRM;
- histórico migrado do fluxo AppSheet;
- perfil de creatina;
- recorrência e valor do cliente.

Prioridade:
1. retornos já registrados no CRM/AppSheet;
2. leads existentes do fluxo antigo;
3. janela provável de recompra;
4. reativação de clientes recorrentes.

Filtros:
- prioridade;
- origem;
- busca por cliente/produto/oportunidade.

A lógica foi refinada para evitar que clientes com recompra estimada muito antiga dominem o Radar.

## V6 incluído neste pacote

Como o V6 ainda não estava no último deploy consultado, este V7 inclui também:

- Busca Global da Candinho Company;
- Central de Alertas;
- Governança V2;
- Feature Flags;
- presets de permissões;
- Reconciliação de Estoque V2;
- histórico de análise/resolução de reconciliações;
- correções da Busca Global feitas após smoke test real.

## Segurança

- Novas funções não são executáveis por `anon`.
- Views do Radar endurecidas para leitura (`SELECT`) dos perfis autenticados permitidos.
- Resolver uma reconciliação continua sem alterar estoque automaticamente.
- Nenhuma quantidade de ItaPharma, Ingrid, CTS ou Adriana foi inventada ou corrigida por suposição.

## Validação final

- ESLint: 0 erros.
- 2 warnings conhecidos nas páginas de mídia por uso de `<img>` com URLs assinadas privadas do Supabase.
- TypeScript: 0 erros.
- Next.js production build: exit code 0.
- Rota `/clientes/radar`: reconhecida no build.
- Rotas V6 `/central/busca`, `/central/alertas`, `/central/governanca` e `/estoque/reconciliacao`: reconhecidas no build.
- Radar V3 validado no banco de produção.

## Estado de produção no momento da geração

O último deploy consultado na Vercel estava READY e correspondia ao V5.
Por isso este pacote foi montado de forma consolidada para levar V6 + V7 em um único commit.
