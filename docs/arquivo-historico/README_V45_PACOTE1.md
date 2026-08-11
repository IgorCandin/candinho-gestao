# V45 · Pacote 1 — Vínculos + Quebra UX

Este pacote foi preparado para o repositório `IgorCandin/candinho-gestao`.

## O que entra

### 1. Vínculos unificados
- `/clientes/relacionamentos` passa a se chamar **Vínculos**.
- Abas internas:
  - Pendentes
  - Parcerias
  - Relacionados
- A fila de pendentes nasce de evidência real:
  - houve venda atribuída a um parceiro;
  - ainda não existe vínculo formal cliente ↔ parceiro.
- A sugestão nunca define o tipo do vínculo sozinha.
- Ações:
  - Confirmar vínculo
  - Não é vínculo
  - Rever em 30 dias

### 2. Remove a duplicidade de “Aluno”
- **Aluno(a)** fica apenas em **Parceria**.
- Relações entre pessoas não oferecem mais Aluno/Professor no cadastro novo.
- Relações antigas com `student`/`trainer` continuam visíveis como legado; nenhum dado histórico é apagado.
- Na ficha do cliente, os dois blocos antigos viram um único bloco **Vínculos do cliente**, com alternância:
  - Parceria
  - Relacionado

### 3. Quebra na UX / Função
- Novo botão flutuante **Quebra** ao lado do Nexus.
- Pode registrar:
  - layout/menu cortado;
  - botão/função quebrada;
  - informação errada;
  - fluxo confuso;
  - tela lenta;
  - integração;
  - outro.
- O usuário só precisa escrever o que aconteceu.
- O sistema anexa automaticamente:
  - rota;
  - viewport;
  - resolução;
  - largura interna/externa;
  - devicePixelRatio;
  - escala do visualViewport;
  - user-agent;
  - sessão do Nexus;
  - últimas 12 navegações da sessão;
  - último erro JavaScript capturado.

### 4. Central isolada
Nova rota:

`/suplementos/nexus/ux`

Permite:
- filtrar relatos;
- ver contexto técnico;
- marcar “Em correção”;
- marcar “Resolvido”;
- copiar todas as pendências para enviar ao assistente.

---

## Banco

As migrations abaixo **já foram aplicadas no Supabase de produção** durante a preparação do pacote:

- `20260806170046_unify_customer_links_and_pending_partner_evidence`
- `20260806171836_create_ux_issue_reporting_v1`
- `20260806172532_customer_partner_link_review_actions_v1`

Os arquivos SQL estão neste ZIP apenas para manter o GitHub e o histórico do projeto sincronizados com produção.

**Não rode SQL manualmente de novo no projeto de produção.**

Na validação feita antes do frontend, a fila detectou **16 vínculos pendentes**.

---

## Como aplicar

1. Faça backup/commit do estado atual no GitHub Desktop.
2. Extraia o conteúdo deste ZIP **na raiz do repositório**.
3. Aceite substituir os arquivos existentes.
4. Revise os arquivos alterados no GitHub Desktop.
5. Commit sugerido:

`V45 - unifica vínculos e adiciona reporter de UX`

6. Push para `main`.
7. Aguarde o deploy automático da Vercel.

Se o novo deploy falhar, a Vercel mantém a produção anterior ativa.

---

## Checklist depois do deploy

1. Em qualquer tela protegida, confirmar que aparece **Quebra** ao lado do Nexus.
2. Registrar:
   `Teste do reporter UX`
3. Abrir `/suplementos/nexus/ux` e confirmar que o relato apareceu.
4. Marcar o teste como Resolvido.
5. Abrir CRM → **Vínculos**.
6. Confirmar que aparecem as abas Pendentes / Parcerias / Relacionados.
7. Abrir uma ficha de cliente e conferir o bloco único **Vínculos do cliente**.
8. Abrir Novo Cliente e confirmar que **Aluno(a)** só aparece em Parceria.

---

## Ainda não entra neste pacote

Para não misturar mudanças sensíveis:

- Saída comercial não-venda (TopTraining / amostra / ativação / sorteio).
- ROI de parceria.
- Nexus Comercial “produto → melhores clientes”.
- análise automática de rotas e sugestões de simplificação.
- correções dos timeouts de `/bank` e `/suplementos`.

Esses itens ficam para os próximos pacotes depois que este estiver validado.
