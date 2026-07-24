# Candinho Company · V34
## Bank mensal + Nexus pós-venda + limpeza operacional da Central

A V34 é um pacotão focado em três frentes:

1. **Candinho Bank**
2. **Pós-venda com Nexus IA**
3. **Candinho Central**

A operação Marketing não foi alterada.

As Edge Functions da Meta também não foram alteradas:

- `central-meta-send`
- `central-meta-webhook`

---

# 1. Candinho Bank — compromissos sem dia fixo

Foi criado o conceito:

- `fixed_day`
- `month_only`

Isso resolve compromissos que pertencem ao mês, mas não possuem um vencimento real em um dia específico.

## Psicóloga da Giulia

Valor:

`R$ 400,00 por mês`

Agora:

- continua sendo uma pendência mensal;
- não possui `billing_day`;
- aparece como `Sem dia fixo`;
- não vira atrasada apenas porque passou um dia arbitrário do mês;
- pode ser marcada como paga no mês.

## Notinha na loja da Graça

Agora:

- funciona como pendência mensal sem dia fixo;
- a data interna `01/MM/AAAA` serve apenas para identificar o mês;
- o usuário não vê essa data como vencimento;
- não vira atraso no meio do mês por causa de um dia inventado.

---

# 2. Pagamentos de julho confirmados pelo usuário

Durante a revisão V34 o usuário confirmou explicitamente:

- CNPJ de julho já pago;
- Água de julho já paga antecipadamente;
- os dois compromissos que apareciam em `20/07` totalizando `R$ 185,00` já estavam pagos.

A auditoria identificou os R$ 185,00 como:

- CNPJ: R$ 85,00
- Notinha da Graça: R$ 100,00

Foram registrados como resolvidos em julho.

A Água de R$ 70,00 também foi marcada como resolvida em julho.

## Notinha da Graça

Como a parcela mensal de julho é conhecida e foi explicitamente confirmada:

- `total_paid` passou de R$ 0,00 para R$ 100,00;
- a próxima referência passou para agosto;
- permanece sem dia fixo.

Foi criado um evento de ajuste histórico.

Nenhuma data falsa de pagamento foi inventada.

---

# 3. Empréstimo Ian e Sicoob

O usuário informou que existem parcelas antigas já pagas, mas não informou o valor acumulado exato.

Por isso a V34 NÃO inventou histórico.

Foram preservados:

- Empréstimo Ian: `total_paid = 0`
- Sicoob CNPJ: `total_paid = 0`

Agora cada dívida possui:

`Ajustar histórico`

Esse fluxo permite informar uma única vez:

- quanto já foi pago;
- qual é a próxima data real;
- ou qual é o próximo mês de referência quando não existe dia fixo.

Depois disso o fluxo normal continua com:

`Paguei`

A RPC impede reduzir o valor já pago por engano.

---

# 4. Bank Home

A Home foi reorganizada.

Agora separa:

## Atenção hoje

Somente compromissos com data fixa que realmente vencem hoje.

## Atrasados

Somente compromissos com data fixa vencida.

## Pendências do mês · sem data fixa

Exemplos:

- Psicóloga
- Notinha mensal sem vencimento específico

Esses itens continuam pendentes durante o mês, mas não aparecem como atrasados por uma data inventada.

## Vencimentos do mês

Somente itens com dia real.

Cada item possui:

`Paguei`

A ação correta é escolhida conforme o tipo:

- cobrança → `bank_mark_charge_paid`
- fatura → `bank_mark_invoice_paid`
- dívida → `bank_pay_debt_installment`
- mensalidade → `bank_mark_commitment_paid`

Isso corrige o comportamento antigo em que alguns itens apenas sumiam visualmente sem atualizar a fonte financeira correta.

---

# 5. Atualização rápida

A tela continua focada em:

- saldo das contas;
- faturas do mês atual.

Mudança importante:

faturas já:

- pagas;
- canceladas;

não aparecem novamente na rotina rápida.

Quando todas estiverem resolvidas, aparece um estado positivo de tela vazia.

---

# 6. Faturas

A tela foi reorganizada por mês.

Agora cada mês vira um bloco.

Dentro do bloco aparecem todas as faturas dos cartões daquele mês.

Cada fatura mostra:

- cartão;
- titular/instituição;
- valor;
- vencimento;
- status.

Faturas ainda abertas possuem botão:

`Paguei`

Faturas pagas ficam preservadas no histórico.

Durante a atualização de 12 meses, faturas já pagas ficam bloqueadas e fora do payload de edição para evitar sobrescrita acidental.

---

# 7. Pagamentos e cobranças

A antiga tela de Cobranças podia estar vazia mesmo existindo contas no mês porque ela mostrava apenas `bank_charges`.

A V34 deixa isso explícito.

Agora a tela possui:

## Pendências do mês

Consolida:

- mensalidades;
- faturas;
- dívidas;
- cobranças.

## Cobranças avulsas

Mantém a tabela específica de `bank_charges`.

Assim uma lista vazia de cobranças avulsas não passa mais a sensação de que o Bank perdeu as contas do mês.

---

# 8. Fechamento mensal

A V34 NÃO alterou o fluxo de fechamento mensal.

O conceito atual é preservar uma fotografia do mês encerrado, incluindo resultado/patrimônio do período, para comparação histórica.

Essa área deve ser revisada separadamente depois da conciliação dos dados financeiros atuais.

---

# 9. Pós-venda Nexus — causa raiz do erro

Erro percebido pelo usuário:

`Edge Functions returned a non-2xx status code`

A auditoria encontrou dois problemas reais no backend antigo:

1. A Edge Function tentava ler tabelas endurecidas diretamente e recebia:
   `permission denied for table customers`

2. O contexto consultava uma coluna inexistente:
   `customer_interactions.contact_on`

A coluna real é:

`occurred_at`

O erro acontecia antes de a OpenAI ser chamada.

Portanto não era uma falha do modelo de IA.

---

# 10. Pós-venda Nexus V2

Foi implantada diretamente no Supabase:

`post-sale-nexus-suggest`

Versão:

`2`

Status:

`ACTIVE`

JWT:

`true`

O novo fluxo:

1. valida usuário;
2. valida `can_write()`;
3. busca o contexto por RPC interna segura;
4. usa compras agrupadas;
5. usa histórico recente;
6. usa leads;
7. usa interações reais;
8. respeita sensibilidades e restrições do CRM;
9. chama OpenAI;
10. salva a mensagem por RPC interna.

O frontend também foi melhorado para mostrar o erro real retornado pela Edge, em vez do texto genérico de non-2xx.

A página de pós-venda foi reorganizada visualmente.

---

# 11. Central · Clientes

A antiga lista era baseada em contatos da Central/WhatsApp e podia exibir:

- números sem nome;
- telefone repetido;
- contatos que nunca compraram.

A V34 cria uma visão comercial.

Agora `/central/clientes` mostra somente pessoas com compra registrada em:

- Candinho Suplementos;
- Candinho Fitness.

Quando existe telefone válido, clientes das duas operações são unificados pela identidade normalizada.

A tela mostra:

- nome;
- telefone;
- cidade;
- operação;
- quantidade de compras;
- total comprado;
- última compra.

Contatos aleatórios do WhatsApp não entram nessa lista.

Nenhum cliente é mesclado apenas pelo nome.

---

# 12. Central · Mídia

Foi implantada diretamente:

`central-media-delete`

Versão:

`1`

Status:

`ACTIVE`

JWT:

`true`

A tela de detalhe da mídia ganhou:

`Excluir mídia`

O fluxo:

1. confirma a exclusão;
2. valida usuário e acesso à operação;
3. remove o arquivo do bucket privado `central-media`;
4. remove o registro da biblioteca.

Relacionamentos existentes usam as regras do banco:

- tags: cascade;
- projeto de Marketing: vínculo da mídia vira `NULL`;
- projeto não é apagado.

---

# 13. Central · Agenda e Pendências

A UX de tela vazia foi revisada.

Agenda:

`Agenda livre neste filtro`

Pendências:

`Tudo em dia por aqui`

A tela deixa explícito que uma lista vazia pode ser um estado positivo, e não necessariamente erro de carregamento.

---

# 14. Central · Inbox / Integrações / Ativação

Continuam fora da rotina ativa.

Links ocultados:

- Inbox
- Integrações
- Ativação V1

Rotas:

- `/central/integracoes`
- `/central/ativacao`

redirecionam para:

`/central`

Nenhuma função externa da Meta foi alterada.

---

# 15. Respostas rápidas

Não foram removidas nesta versão.

Elas permaneceram preservadas no banco e na estrutura existente para evitar alteração destrutiva.

Como o Inbox está pausado, a utilidade dessa área será avaliada depois.

---

# 16. Segurança

Novas RPCs:

- `bank_mark_invoice_paid`
- `bank_adjust_debt_history`
- `post_sale_nexus_context`
- `post_sale_nexus_save_result`
- `central_customer_directory_snapshot`

Validação executada:

## Bank

`bank_mark_invoice_paid`

- SECURITY DEFINER: true
- `search_path=public`
- authenticated execute: true
- anon execute: false

`bank_adjust_debt_history`

- SECURITY DEFINER: true
- `search_path=public`
- authenticated execute: true
- anon execute: false

## Nexus interno

`post_sale_nexus_context`

- SECURITY DEFINER: true
- service_role: true
- authenticated: false
- anon: false

`post_sale_nexus_save_result`

- SECURITY DEFINER: true
- service_role: true
- authenticated: false
- anon: false

## Central Clientes

`central_customer_directory_snapshot`

- SECURITY DEFINER: true
- `search_path=public`
- authenticated execute: true
- anon execute: false

A view `bank_debts_overview` foi corrigida para:

`security_invoker=true`

Isso removeu a regressão detectada pelo Security Advisor durante a própria auditoria V34.

---

# 17. Migrations aplicadas diretamente

- `20260720140903_v34_bank_monthly_commitments_and_history.sql`
- `20260720140958_v34_post_sale_nexus_and_customer_directory.sql`
- `20260720143039_v34_fix_bank_debts_overview_security_invoker.sql`
- `20260720143329_v34_fix_central_customer_directory.sql`
- `20260720143816_v34_sync_invoice_charge_payment_state.sql`

As três migrations finais são correções e endurecimentos encontrados durante a validação antes da entrega do pacote.

---

# 18. Validação antes da entrega

- Migrações aplicadas no Supabase.
- Edge `post-sale-nexus-suggest` v2 ACTIVE.
- Edge `central-media-delete` v1 ACTIVE.
- Contexto de pós-venda testado com batch real.
- Consulta base do diretório comercial testada: 170 identidades compradoras na fotografia atual.
- Security Advisor revisado.
- Novo alerta de `bank_debts_overview` corrigido antes da entrega.
- 21 arquivos TS/TSX passaram por parser/transpilação TypeScript sem erro sintático.
- Meta não alterada.

O frontend V34 ainda depende do commit/push do pacote para entrar na Vercel.

---

# Commit sugerido

`V34 · Bank mensal, Nexus pós-venda e limpeza operacional da Central`
