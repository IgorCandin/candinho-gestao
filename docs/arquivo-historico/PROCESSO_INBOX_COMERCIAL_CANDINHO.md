# Candinho Company — Processo da Inbox Comercial

Versão: V1  
Data: 03/08/2026

## Objetivo

A Inbox Comercial existe para eliminar uma falha operacional importante: um cliente demonstrava interesse pela vitrine pública, mas esse interesse ficava em uma fila paralela (`catalog_public_leads`) e em um sinal do Nexus, sem entrar de verdade no fluxo normal de Leads.

A partir desta versão, o caminho oficial passa a ser:

**Vitrine pública → registro bruto → cliente → lead comercial → Inbox → atendimento → orçamento/venda → histórico**

A Inbox não substitui Leads. Ela é a fila de trabalho do que ainda precisa de ação. A tela de Leads continua sendo o histórico comercial completo.

---

## 1. O que acontece quando o cliente clica em “Quero comprar”

A página pública envia:

- nome;
- telefone;
- produto;
- origem;
- contexto da conversa/pedido.

A API `/api/catalogo/interesse` chama `public_create_catalog_lead_v2`.

### Regra de segurança contra duplicação

Antes de criar algo novo, o banco verifica:

1. mesmo telefone;
2. mesmo produto;
3. interesse criado nas últimas 24 horas;
4. item ainda não convertido/encerrado.

Se encontrar, o sistema reaproveita o registro existente.

---

## 2. Registro bruto: `catalog_public_leads`

Essa tabela continua existindo de propósito.

Ela funciona como a “caixa-preta” da entrada pública. Mesmo que alguma automação comercial falhe, ainda sabemos exatamente:

- quem enviou;
- telefone;
- produto;
- contexto;
- origem;
- quando entrou.

Novos campos adicionados:

- `customer_id` — identidade central do cliente;
- `sales_lead_id` — lead comercial normal vinculado;
- `inbox_status` — etapa operacional da Inbox;
- `inbox_kind` — tipo do pedido/interesse;
- `contacted_at`;
- `converted_at`;
- `closed_at`;
- `last_action_at`.

---

## 3. Cliente: não duplicar pessoa

O telefone é normalizado e usado como principal chave prática de identificação.

Quando chega um pedido:

### Se o telefone já existe em `customers`

O sistema reutiliza aquele cliente.

Exemplo:

**Isaías já compra Suplementos → entra na vitrine → pede Creatina → o interesse é ligado ao mesmo Isaías.**

Não existe “Isaías 2”.

### Se o telefone ainda não existe

O sistema cria um cliente novo automaticamente com:

- nome;
- telefone;
- ativo = verdadeiro.

Os demais dados podem ser enriquecidos depois no CRM.

---

## 4. Lead comercial normal

Depois de resolver o cliente, o sistema procura um lead aberto recente para:

- mesmo cliente;
- mesmo produto;
- ainda não convertido;
- não cancelado.

### Se já existe um lead compatível

Ele é reaproveitado e o novo contexto é anexado às observações.

### Se não existe

É criado um registro normal em `sales` com:

- `record_type = lead`;
- estoque/origem central CS;
- status `Perguntou sobre`;
- cliente real;
- telefone/cidade do cliente;
- produto em `sale_items`;
- observação contendo origem e contexto da vitrine.

Isso é importante porque o pedido público passa a usar **toda a estrutura que já existe para Leads**:

- detalhe do lead;
- Nexus gerador de mensagem;
- edição;
- orçamento;
- conversão em venda;
- histórico do cliente;
- auditoria.

Não criamos um segundo CRM.

---

## 5. A Inbox Comercial

A Inbox fica no topo da tela `/leads`.

Ela mostra somente itens que ainda precisam de ação.

Estados:

### Novo

O cliente deixou contato, mas ninguém assumiu o atendimento ainda.

Ação sugerida:

**Assumir atendimento** ou abrir WhatsApp.

### Em atendimento

O contato já foi assumido.

Ação sugerida:

**Já chamei**.

### Aguardando cliente

A mensagem já foi enviada e agora depende da resposta do cliente.

Esse estado é essencial para não deixar a pessoa aparecendo todos os dias como se ainda faltasse o primeiro contato.

Ação sugerida:

**Pronto para fechar** quando o cliente confirmar intenção.

### Pronto para fechar

O cliente já está em fase de decisão/fechamento.

Ação:

**Abrir fechamento** → entra no lead normal → Converter em venda.

### Convertido

Quando o lead é finalizado/convertido no fluxo normal, a Inbox recebe a atualização automaticamente e o item sai da fila ativa.

### Encerrado

Usado quando o interesse não deve mais ocupar a fila, mas precisa permanecer no histórico/auditoria.

---

## 6. WhatsApp

O botão WhatsApp usa o telefone que já foi resolvido para o cliente.

Se o item ainda estiver como `Novo`, abrir o WhatsApp também move o pedido para `Em atendimento`.

Depois de realmente enviar a mensagem, o operador pode marcar `Já chamei`, mudando para `Aguardando cliente`.

Isso diferencia duas situações que antes se misturavam:

- “eu ainda preciso chamar”;
- “eu já chamei e agora estou esperando”.

---

## 7. Nexus

Cada pedido ligado à operação gera um sinal com:

- cliente;
- produto;
- contexto;
- lead real;
- link direto para `/leads/[id]`.

No card da Inbox existe **Nexus / mensagem**.

Ele abre o lead normal, onde já existe o gerador de mensagem com:

- histórico real do cliente;
- produto de interesse;
- observações do lead;
- campo de contexto adicional.

Portanto não criamos outro gerador de mensagem dentro da Inbox. A Inbox decide **o que fazer**; a ficha do lead concentra **como atender**.

---

## 8. Conversão em venda

Quando o cliente decidir comprar:

1. Inbox → `Pronto para fechar`;
2. abrir o lead;
3. `Converter em venda`;
4. o sistema prepara orçamento com produto e preço vigente;
5. confirmar venda normalmente;
6. trigger do banco detecta o lead convertido;
7. Inbox muda para `Convertido`;
8. sinal do Nexus é resolvido;
9. item desaparece da fila ativa, mas continua no histórico.

---

## 9. Relação com a lista antiga de Leads

A tela passa a ter três camadas com funções diferentes:

### Inbox Comercial

**O que chegou da vitrine e ainda exige ação agora.**

### Nexus · quem vale retomar

**Leads antigos/abertos cujo padrão indica que vale fazer follow-up.**

### Histórico de Leads

**Todos os leads**, independentemente de origem ou prioridade atual.

Essa separação evita transformar Leads em uma lista infinita sem contexto.

---

## 10. Auditoria

As principais automações geram registros em `audit_events`:

- sincronização do pedido público para lead comercial;
- alteração de estado da Inbox.

O registro bruto também nunca precisa ser apagado para limpar a fila. Encerrar só muda o estado.

---

## 11. Proteções implementadas

- Não cria cliente duplicado quando encontra o mesmo telefone.
- Não cria outro pedido público igual dentro de 24h.
- Não cria outro lead para o mesmo cliente/produto quando já há um lead aberto recente.
- Produto público precisa estar ativo, permitido e não restrito.
- Itens convertidos/encerrados saem da fila ativa.
- Alterações manuais da Inbox exigem usuário com permissão de escrita.
- Conversão continua usando o fluxo oficial de orçamento/venda; a Inbox não cria venda silenciosamente.

---

## 12. Situação do teste que já existia

Na aplicação da migration, os interesses antigos ainda abertos são sincronizados automaticamente.

O interesse de teste que já estava em `catalog_public_leads` foi ligado a:

- um cliente central;
- um lead normal;
- o produto Abduzido;
- estado `Novo` da Inbox.

Portanto ele já serve para testar a nova tela assim que o deploy entrar.

---

## 13. Próximas evoluções recomendadas

### V2 — Vitrine Fitness → Inbox

A estrutura pública antiga de interesse referencia `products` de Suplementos. A próxima evolução deve permitir que uma peça Fitness envie:

- produto Fitness;
- tamanho;
- cor;
- preço/promocional;
- quantidade.

E criar automaticamente o atendimento na operação Fitness sem misturar estoque das duas operações.

### V3 — Hoje / Nexus

Mostrar apenas resumo:

- novos na Inbox;
- aguardando cliente;
- prontos para fechar.

Sem obrigar o operador a abrir Leads só para descobrir se existe algo novo.

### V4 — SLA e inteligência

O Nexus poderá aprender:

- tempo médio até primeiro contato;
- taxa de resposta;
- produtos com mais intenção e menos conversão;
- horários de maior entrada;
- leads parados além do padrão.

---

## 14. Regra operacional final

A lógica que deve ser mantida nas próximas versões é:

> **Evento não é lead. Interesse com contato é lead. Lead que precisa de ação entra na Inbox. Lead resolvido vira histórico. Venda continua sendo confirmada por humano.**

Essa regra impede que analytics, CRM, Nexus e comercial virem quatro sistemas separados.
