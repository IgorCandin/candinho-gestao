# Candinho Company · V25 — Mega Operacional

## O que esta versão resolve

### 1. Fitness — Consignação / Prova

Novo fluxo:

**Gerar prova**
→ selecionar cliente
→ selecionar peças, tamanho, cor e quantidade
→ as peças ficam marcadas como `Em prova`
→ deixam de aparecer como disponíveis para outra venda
→ abrir o acerto
→ informar `Ficou com a cliente`
→ o restante vira devolução automaticamente
→ se alguma peça ficou, uma venda Fitness é criada

Termos usados na interface:

- `Consignações / Provas`
- `Nova prova de peças`
- `Acerto da prova`
- `Ficou com a cliente`
- `Devolver`

Isso resolve o caso em que uma peça estava com uma cliente ou já tinha sido escolhida,
mas ainda parecia disponível para outra pessoa.

### 2. Fitness — Orçamento

Novo fluxo:

**Novo orçamento**
→ cliente
→ produtos / tamanhos / cores
→ validade
→ desconto
→ PDF
→ `Converter em venda`

O orçamento não segura estoque.
A disponibilidade é confirmada na conversão.

O desconto do orçamento agora é preservado na venda e no cálculo do lucro.

### 3. Fitness — PDFs

Nova área:

`/fitness/pdfs`

Opções:

- PDF automático;
- incluir produtos a caminho;
- selecionar somente algumas variações;
- gerar PDF com a seleção.

O orçamento também possui PDF individual.

### 4. Pós-venda consolidado

Nova área:

`/pos-venda`

Compras próximas do mesmo cliente são agrupadas em um acompanhamento.

A regra usa uma janela de 14 dias baseada na primeira data de pós-venda daquele lote.

Em produção, no momento da implantação:

- 43 vendas tinham pós-venda aberto;
- elas viraram 34 compromissos de pós-venda na Agenda.

As 43 vendas continuam rastreáveis individualmente.

### 5. Nexus IA no Pós-venda

Dentro do acompanhamento existe:

`Gerar mensagem`

O Nexus lê automaticamente:

- vendas atuais;
- produtos;
- histórico;
- leads;
- interações;
- observações;
- restrições e preferências do cliente.

Depois entrega:

- mensagem pronta;
- resumo do contexto;
- próxima ação sugerida;
- alertas.

Há botão para copiar e para abrir a mensagem no WhatsApp.

### 6. Estoque Fitness

A tela passa a mostrar:

- Físico
- Reservado
- **Em prova**
- Disponível
- A caminho

Uma peça em prova continua fisicamente pertencendo à empresa, mas não pode ser prometida
para outra cliente.

## Backend

Já aplicado diretamente no Supabase de produção:

- schema de consignações;
- schema de orçamentos Fitness;
- disponibilidade descontando consignação;
- guards de venda/estoque/conversão;
- desconto da venda Fitness;
- batches de pós-venda;
- consolidação da Agenda;
- ações da Agenda compatíveis com batches.

Também já foi implantada a Edge Function:

`post-sale-nexus-suggest`

Status confirmado: ACTIVE / JWT obrigatório.

## Importante

O backend V25 já está em produção.

O frontend deste ZIP ainda não estará disponível no site até este pacote ser extraído
sobre o repositório, commitado e o deployment correspondente ficar READY na Vercel.

Não há alteração nas Edge Functions da Meta:

- `central-meta-send`
- `central-meta-webhook`

## Validação estática do pacote

Foi executada checagem sintática TypeScript/TSX nos arquivos gerados.

Resultado no momento do empacotamento:

- arquivos TS/TSX verificados: 20;
- erros sintáticos: 0;
- escritas diretas `.insert/.update/.delete/.upsert` nos novos arquivos `src`: 0.

As mutações novas do frontend usam RPCs.

A chamada autenticada ponta a ponta do Nexus pelo navegador só pode ser validada
depois do frontend V25 estar publicado e houver uma sessão real de usuário.

## Navegação

As novas áreas foram adicionadas como atalhos nas Homes das operações:

- Home Fitness: Consignações / Orçamentos / PDFs;
- Home Suplementos: Pós-venda com Nexus.

O AppShell global foi mantido intacto para não arriscar regressão em toda a navegação.

## Commit sugerido

`V25 · Mega Operacional — Consignação Fitness, PDFs e Pós-venda Nexus`
