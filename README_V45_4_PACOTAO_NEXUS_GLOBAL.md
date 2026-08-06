# Candinho V45.4 · Nexus Global

## Status anterior
V45.3 foi verificado na Vercel:
- Production: READY
- Runtime errors na última hora: 0

## Backend
A migration deste pacote JÁ foi aplicada no Supabase oficial.

Migration:
`20260806213127_nexus_unified_queue_v1.sql`

Não rode SQL manualmente.

## 1. Fila Única
Nova rota:
`/nexus/fila`

A fila NÃO copia nem duplica registros.

Ela lê e ordena fontes oficiais:

### Suplementos
- nexus_signals
- operational_tasks

### Fitness
- vendas a receber
- entregas pendentes
- pós-venda vencido/próximo
- operational_tasks de Fitness

### Bank
- cobranças
- faturas
- parcelas de empréstimos

### Central / Marketing
- operational_tasks

Cada item continua sendo resolvido no módulo dono do dado.

## 2. Ranking
Exemplo de ordem:
- cobrança Bank vencida
- recebível Fitness vencido
- sinal Nexus urgente
- tarefa atrasada
- fatura próxima
- pós-venda Fitness
- tarefa normal próxima

Não muda o dado original.
Só calcula prioridade.

## 3. Nexus Command
Disponível globalmente para usuários internos.

Atalho:
`Ctrl + K`

Também existe um pequeno botão "Comando".

Exemplos:
- abrir entradas
- onde vejo as faturas?
- nova venda fitness
- o que faço agora?
- criar tarefa amanhã 10h conferir estoque
- criar tarefa sexta 16h revisar campanha

## 4. Linguagem natural + segurança
O Nexus Command pode:
- sugerir navegação
- responder pergunta operacional curta
- preparar tarefa oficial

Ele NÃO pode:
- dar baixa em estoque
- criar venda
- marcar pagamento
- pagar fatura
- excluir registro
- mexer em empréstimo

Tarefa passa pelo Preview Seguro do V45.3.

## 5. Busca normal não foi substituída
A busca existente de:
- ferramentas
- produtos

continua igual.

Ctrl+K é COMANDO, não uma segunda busca de produtos.

## 6. Fila no Nexus flutuante
O dock passa a mostrar:
- total da fila global
- urgentes globais
- atalho Fila Única
- atalho Comando rápido
- atalhos aprendidos da tela

## 7. Fluxo repetido reduz clique
Quando a telemetria percebe:
A → B → C

e essa sequência já ocorreu pelo menos 3 vezes,
o Nexus pode mostrar na tela A:

`Ir direto para C`

Ele só pula navegação.
Não pula uma operação ou confirmação de negócio.

## 8. Cores por operação
A Fila Única diferencia visualmente:
- Suplementos
- Fitness
- Bank
- Central / Marketing

## 9. Mobile
- Ctrl+K continua para teclado
- botão Comando permanece disponível
- modal é responsivo
- Fila Única vira 2 KPIs por linha
- ações descem para uma linha separada

## Teste recomendado
Depois do deploy:

1. Abra `/nexus/fila`
2. Confira se aparecem itens das operações às quais seu usuário tem acesso
3. Filtre Bank
4. Filtre Fitness
5. Aperte Ctrl+K
6. Digite `abrir entradas`
7. Digite `o que faço agora?`
8. Digite `criar tarefa amanhã 10h conferir estoque`
9. Clique `Revisar e criar tarefa`
10. Cancele o preview
11. Repita e confirme se quiser validar a execução

## Commit sugerido
`V45.4 - Nexus global com fila unica e comandos rapidos`
