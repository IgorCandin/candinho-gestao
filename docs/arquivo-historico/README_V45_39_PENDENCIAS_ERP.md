# V45.39 — Pacotão de pendências do ERP

Base usada: `main` no commit `3b0a8c8884ba0c03e701d6ee6083cb521b355ac3`.

## O que entra neste pacote

### 1. Top Training / parceiros com estoque
- Parceiro marcado com **Pode manter estoque** passa a ganhar automaticamente um `location` ligado.
- Esse ponto entra no mesmo fluxo de `getSaleLocations`, portanto aparece no seletor de **Transferir estoque**.
- A Top Training atual recebe o código curto `TT` no backfill.
- O pacote **não movimenta quantidade sozinho**: depois do deploy, faça a transferência das 3 creatinas para `TT · CT Top Traning` pela tela normal.

### 2. Venda — Entregue por
- Na tela **Nova venda** aparece um cartão flutuante **Entregue por**.
- Pode selecionar parceiro/ponto cadastrado ou escrever texto livre, por exemplo `Posto Marechal`.
- Esse dado é independente de **Estoque / depósito de origem**.
- Ao confirmar a venda, a informação é gravada automaticamente em `sales.delivered_by_partner_id` ou `sales.delivered_by_text`.

### 3. Corrigir venda — estoque e entrega
- Na rota de **Corrigir venda** aparece **Corrigir estoque / entrega**.
- Permite mudar o estoque de origem e também quem entregou.
- Se a venda já baixou estoque, o banco faz em uma única transação:
  1. estorno no estoque antigo;
  2. baixa no estoque correto;
  3. atualização da venda e do orçamento ligado.
- Se ainda não houve baixa, as reservas são movidas e recalculadas no novo estoque.
- Se o novo estoque não tiver saldo suficiente, a transação falha inteira e não deixa o estoque pela metade.

### 4. Bank — Atualizar saldo do dia
- Em **Bank > Empréstimos e Notinhas**, ao abrir os detalhes de uma dívida aparece **Atualizar saldo do dia**.
- Basta informar quanto ainda falta pagar hoje.
- O ERP preserva `total_paid` e recalcula o total-base para que `remaining_amount` fique exatamente no valor informado.
- O ajuste fica registrado no histórico e no `audit_events`.

### 5. Mensalidade semanal / psicóloga
- O fluxo existente `skipped` continua sem gerar cobrança naquela semana.
- A interface passa a mostrar **Adiar** e, depois de marcado, **Adiada**.
- A semana seguinte continua normal.

### 6. Nexus UX Doctor
- Corrigido o falso positivo do `div.mobile-menu-panel` quando o `<details>` está fechado.
- O painel/backdrop fechado usa `display: none`.
- O sinal conhecido `84c9983699ca5da56da4b77d8d9630a5` é resolvido pela migration.
- Se existir um problema real novo, o probe continua livre para registrar outro sinal.

### 7. Ícone da aba
- O bridge reforça o favicon da operação e observa mudanças feitas pelo Next no `<head>`.
- Versão de cache alterada para `45.39.0`.
- Bank = `cb.png`, Fitness = `cf.png`, Suplementos = `cs.png`, Central/Nexus = `cce.png`, Company = `cc.png`.

## Arquivos do pacote

- `supabase/migrations/20260822193000_erp_pending_fixes_v1.sql`
- `src/components/erp-pending-fixes-bridge.tsx`
- `src/lib/supabase/client.ts`
- `src/app/v45-39-erp-pending-fixes.css`
- `src/app/layout.tsx`
- `docs/arquivo-historico/README_V45_39_PENDENCIAS_ERP.md`

## Como aplicar

1. Confirme no GitHub Desktop que está na `main` e sem alterações locais importantes.
2. Extraia o ZIP **dentro da raiz do repositório**, permitindo mesclar pastas e substituir os dois arquivos existentes (`layout.tsx` e `client.ts`).
3. Confira no GitHub Desktop os arquivos alterados.
4. Commit sugerido: `V45.39 fix ERP pending operations`
5. Push para `main` pelo fluxo que você já usa.
6. Depois do deploy, faça um refresh completo do navegador (`Ctrl+F5`).

## Teste rápido depois do deploy

- Estoque > Transferir: confirmar `TT · CT Top Traning` como destino e registrar as 3 creatinas.
- Nova venda: escolher um `Entregue por`, confirmar e abrir a venda.
- Corrigir venda: testar troca de estoque em uma venda de teste com saldo disponível no novo local.
- Bank: abrir uma Notinha/Empréstimo e usar `Atualizar saldo do dia`.
- Mensalidades: conferir `Adiar` nas semanas da psicóloga.
- Produtos no celular: abrir/fechar menu e depois conferir Nexus UX Doctor.
- Trocar entre Suplementos e Bank e observar o ícone da aba.

## WhatsApp / visualização única

Não há alteração de WhatsApp neste ZIP. O envio do ERP usa integração oficial Meta/Cloud API; remover telefone do cadastro do ERP não é a mesma coisa que desconectar a integração/coexistência do número. Tratar isso como uma decisão separada evita quebrar o Inbox do ERP por acidente.
