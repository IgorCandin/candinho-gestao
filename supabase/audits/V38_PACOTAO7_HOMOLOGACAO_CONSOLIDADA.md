# V38 · Pacotão 7 · Homologação consolidada

## Objetivo
Fechar inconsistências reais encontradas após os Pacotões 5 e 6 sem abrir uma nova versão funcional.

---

## 1. Central · Agenda e Marketing — CORRIGIDO

### Bug encontrado
A interface e o menu de Marketing já apontavam para:

`/central/agenda?scope=marketing`

e a criação de tarefas aceitava `marketing`.

Porém a RPC `central_agenda_snapshot` aceitava somente:
- company
- supplements
- fitness

Um filtro de Marketing podia retornar `Operação inválida`, e um usuário somente de Marketing podia ter acesso à Central mas ser recusado pela Agenda.

### Correção
- Agenda aceita `marketing`.
- Acesso considera Marketing no contrato da Central.
- `due_date` usa `America/Sao_Paulo`.
- Hoje, atrasadas, próximos 7 dias e filtros usam o mesmo calendário do Brasil.

### Permissões validadas
- `authenticated` EXECUTE `central_agenda_snapshot`: SIM
- `anon` EXECUTE: NÃO

---

## 2. Central · Inbox pausado — CONSISTÊNCIA PRESERVADA

A implementação da RPC foi alinhada para conhecer o escopo Marketing.

O Inbox continua pausado e não teve permissões reabertas.
Na validação, `authenticated` permanece sem EXECUTE direto nessa RPC.

---

## 3. Parceiros · vendas feitas no ponto sem partner_id — CORRIGIDO

### Divergência encontrada antes da correção
Existiam vendas registradas em locais vinculados a parceiros sem `partner_id`.

Casos observados:
- C.T.S. Pâmella Nunes: 1 venda de R$ 69,90 vinculada apenas pelo local.
- Mini Mercearia do Batista: 1 venda de R$ 64,90 vinculada apenas pelo local.

O Portal considerava o local vinculado, enquanto o painel gerencial dependia do `partner_id`.
Isso fazia os dois lados divergirem.

### Correção
- Backfill associa vendas históricas sem `partner_id` quando o local pertence a exatamente um parceiro ativo.
- Trigger faz a mesma associação automaticamente em novas vendas.
- Parceiro explícito continua tendo prioridade.
- Não há locais ativos compartilhados por mais de um parceiro no estado atual.

### Validação após correção
- vendas restantes em local parceiro sem `partner_id`: 0
- C.T.S. passa a ter 79 vendas no histórico total do painel gerencial.
- Mini Mercearia passa a ter 1 venda no histórico total.

---

## 4. Parceiros · calendário de relacionamento — CORRIGIDO

`partner_network_overview` usava `CURRENT_DATE`, que pode virar o dia em UTC antes da meia-noite no Brasil.

Agora:
- vencido;
- vence em até 7 dias;
- relacionamento sem atualização;

usam o dia de `America/Sao_Paulo`.

---

## 5. Bank · fatura R$ 0 escondendo mensalidades — CORRIGIDO

### Bug encontrado
A projeção anual entende que uma fatura com `includes_recurring=true` já incorporou as assinaturas daquele cartão.

Havia faturas-placeholder de R$ 0,00 marcadas com `includes_recurring=true`.

Resultado:
a fatura somava R$ 0,00 e, ao mesmo tempo, escondia as assinaturas estimadas.

### Fotografia encontrada
Assinaturas de cartão que voltaram a ser consideradas no mês atual:
- total estimado: R$ 434,40

### Correção
- fatura com valor <= 0 passa a ter `includes_recurring=false`;
- trigger mantém essa regra em novos placeholders;
- faturas positivas continuam sendo a fonte autoritativa;
- a correção do Pacotão 6 para compromissos já pagos continua preservada.

### Validação
- faturas zeradas ainda marcadas como recorrentes: 0
- estimativa atual de assinaturas de cartão novamente visível à projeção: R$ 434,40

---

## 6. Central · rota Integrações pausada — CORRIGIDO

A rota continua pausada, mas agora:
- administrador / gestor → Governança
- usuário sem gestão → Central

Isso evita mandar usuário comum para uma tela de Governança sem permissão.

---

## 7. Segurança e integridade

Confirmado após as migrations:
- Agenda: authenticated autorizado, anon bloqueado.
- Portal mensal: authenticated autorizado, anon bloqueado.
- Views da Agenda e Parceiros seguem disponíveis para authenticated conforme políticas existentes.
- Inbox não foi reativado.
- Não existem dois parceiros ativos compartilhando o mesmo linked_location_id.
- Não restaram vendas em ponto parceiro único sem partner_id.
- Não restaram faturas zeradas marcadas como incluindo recorrências.

---

## 8. Produção

No recorte recente consultado na Vercel:
- nenhum log `error` ou `fatal` foi encontrado.

Observação:
o conector GitHub/Vercel ainda mostrava o Pacotão 5 como último commit/deploy remoto no momento desta auditoria.
Os Pacotões 6 e 7 podem ainda estar somente no fluxo local/GitHub Desktop até o push/deploy terminar.

---

## Migrations aplicadas diretamente no Supabase

- `20260720232215_v38_pacotao7_central_agenda_marketing_timezone.sql`
- `20260720232302_v38_pacotao7_parceiros_atribuicao_local_e_data_brasil.sql`
- `20260720232319_v38_pacotao7_bank_faturas_zero_nao_ocultam_assinaturas.sql`

Não executar manualmente novamente.
