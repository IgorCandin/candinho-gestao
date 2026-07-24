# Candinho Company · V38
## Gestão Executiva + Homologação Operacional

Base esperada:

`48220e8d2be517193a5686c8a0452040b26a98f7`

Commit:

`V37.1 · Corrige typecheck do histórico de parceiros`

---

# 1. Sala do Dono

Nova rota:

`/central/executivo`

Acesso:

somente usuários com `canManageUsers`.

Objetivo:

transformar os dados já existentes em uma leitura executiva da Candinho Company.

A tela é somente leitura.

Não cria venda.

Não altera estoque.

Não altera Bank.

Não altera parceiros.

Não altera Marketing.

---

# 2. Acesso rápido

A Sala do Dono aparece:

- na tela de seleção de operações;
- na home da Central.

Nenhuma alteração foi feita no menu mobile.

---

# 3. Indicadores principais

A Sala do Dono mostra:

- faturamento do mês;
- quantidade de vendas;
- lucro bruto das vendas;
- margem bruta observada;
- caixa disponível;
- capital alocado.

---

# 4. Resultado comercial gerencial

A V38 NÃO chama o resultado de lucro líquido.

Cálculo exibido:

`Receita bruta das vendas`
`- Custo dos produtos vendidos`
`= Lucro bruto das vendas`

Também mostra separadamente:

- recebido no mês;
- investido em compras no mês.

Existe aviso explícito:

despesas gerais, impostos, taxas e retiradas ainda não compõem uma DRE contábil completa.

---

# 5. Caixa e patrimônio

Usa os dados consolidados já existentes no Candinho Bank:

- caixa;
- valores a receber;
- estoque a custo;
- dívidas;
- posição líquida gerencial;
- capital alocado.

Nenhum valor financeiro novo é criado pela V38.

---

# 6. Previsão de caixa

Quatro horizontes:

## Próximos 7 dias

Usa somente:

- cobranças datadas;
- recebíveis datados.

## 1 ciclo mensal

Usa o primeiro mês disponível da projeção anual do Bank.

## 2 ciclos mensais

Soma os dois primeiros meses disponíveis.

## 3 ciclos mensais

Soma os três primeiros meses disponíveis.

As projeções são marcadas como projeções cadastradas e não como saldo garantido.

---

# 7. Operações

Cards executivos para:

- Suplementos;
- Fitness;
- Rede de Parceiros;
- Marketing.

Cada card usa dados já registrados no sistema.

---

# 8. Pendências operacionais

A Sala do Dono consolida:

- pós-venda aberto;
- trocas/devoluções;
- estoque zerado;
- estoque baixo.

---

# 9. Homologação operacional

Checklist vivo:

- integridade de sabores;
- pós-vendas atrasados;
- consignações atrasadas;
- erros de processamento em Marketing.

O checklist não altera dados.

Ele apenas mostra o estado atual.

---

# 10. Alertas executivos

Os alertas são ordenados por criticidade.

Fontes:

- estoque zerado;
- estoque baixo;
- pós-venda atrasado;
- consignação atrasada;
- trocas/devoluções abertas;
- acertos de parceiros;
- erros de Marketing;
- integridade de sabores;
- alertas de revisão já existentes no Bank.

---

# 11. Dados observados durante a validação

Fotografia dinâmica no momento da validação:

- 20 vendas de Suplementos no mês;
- 2 vendas Fitness no mês;
- 24 pós-vendas em aberto;
- 0 trocas/devoluções abertas;
- 0 consignações abertas;
- 3 projetos de Marketing;
- 0 divergências de integridade de sabores.

Esses números mudam conforme a operação.

---

# 12. Validação V37.1 antes da V38

A V37.1 foi confirmada em produção:

- commit na `main`;
- deployment Vercel em `READY`;
- nenhum erro de runtime encontrado na janela de 30 minutos verificada.

---

# 13. TypeScript

Arquivos TS/TSX do pacote:

4

Validação sintática via TypeScript `transpileModule`:

`0 erros`

O build completo deve ser confirmado na Vercel após o commit.

---

# 14. Escopo preservado

A V38 não altera:

- Meta;
- `central-meta-send`;
- `central-meta-webhook`;
- Inbox pausado;
- Edge Product Nexus;
- Pós-venda Nexus;
- sabores;
- consignações;
- trocas/devoluções;
- PDFs;
- Bank;
- Marketing.

---

# Commit sugerido

`V38 · Gestão Executiva — Sala do Dono e homologação final`
