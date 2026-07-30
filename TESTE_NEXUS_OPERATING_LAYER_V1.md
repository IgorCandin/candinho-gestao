# Teste rápido — Nexus Operating Layer V1

## A. Tela Hoje

1. Abrir `/suplementos`.
2. Confirmar bloco **Nexus · Copiloto operacional / Comece por aqui**.
3. Conferir se aparecem prioridades coerentes.
4. Clicar em `Já tratei` em uma prioridade de teste.
5. Confirmar que ela some da fila sem apagar o registro original.

## B. Nexus

1. Abrir `/suplementos/nexus`.
2. Conferir Inbox do Nexus.
3. Testar filtros.
4. Perguntar: `O que eu deveria fazer agora?`
5. Perguntar: `O que está passando despercebido na operação?`
6. Conferir se respostas usam fatos do ERP e não inventam dados.
7. Depois de cadastrar um vínculo de parceria, perguntar algo como `quem está vinculado a este parceiro?` e conferir o grafo real.

## C. Leads

1. Abrir `/leads`.
2. Conferir fila **Nexus · quem vale retomar** acima do histórico.
3. Usar `Já tratei` em um Lead antigo.
4. Confirmar que o histórico de Leads continua intacto abaixo.

## D. Rede do cliente

1. Abrir qualquer `/clientes/[id]`.
2. Localizar **Rede do cliente**.
3. Adicionar um vínculo com outro cliente.
4. Adicionar outro vínculo diferente para o mesmo cliente se quiser testar múltiplas relações.
5. Abrir a outra pessoa e confirmar que a relação aparece no sentido inverso.
6. Abrir `/clientes/relacionamentos` e conferir a rede consolidada.

## E. Aluno(a) de parceiro

1. Abrir cliente de teste.
2. Em Parcerias vinculadas, selecionar um parceiro.
3. Tipo: `Aluno(a)`.
4. Manter `Atribuir vendas automaticamente` ligado.
5. Salvar.

## F. Venda sem checkbox de parceria

1. Criar Novo Orçamento.
2. Selecionar o cliente vinculado acima.
3. Confirmar aviso `Parceria automática: ...` abaixo do cliente.
4. Confirmar que o bloco manual de Parceria não ocupa mais a tela na nova proposta.
5. Salvar/confirmar a venda.
6. Abrir a venda e conferir parceiro contabilizado.
7. Abrir `/clientes/relacionamentos` e conferir o cliente dentro da rede daquele parceiro.

## G. Novo cliente

1. Abrir `/clientes/novo`.
2. Antes de salvar, adicionar:
   - um relacionamento com cliente existente;
   - uma parceria.
3. Salvar.
4. Abrir o cliente criado e conferir a rede.

## H. Aprendizado de navegação

1. Navegar normalmente por Vendas, Pendências, Agenda, Leads, Clientes e Estoque.
2. Voltar ao Nexus depois de algumas sessões.
3. Conferir `Rotina aprendida`.
4. Os dados esperados são frequência de rotas; nenhum texto digitado deve aparecer ali.

## I. Mobile

1. Abrir o ERP no iPhone.
2. Conferir botão flutuante do Nexus acima da navegação inferior.
3. Abrir e fechar o dock.
4. Fazer uma pergunta rápida.
5. Conferir Rede do cliente, Novo cliente e Inbox sem overflow horizontal.
