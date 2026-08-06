# Candinho V45.6 · Rotinas Nexus

## Objetivo
Transformar caminhos repetidos em sequências guiadas, reduzindo menu e cliques sem automatizar ações críticas.

## Nova área
`/nexus/rotinas`

Nela é possível:
- ver fluxos que o Nexus detectou pela telemetria;
- transformar um fluxo aprendido em rotina;
- montar uma rotina usando atalhos fixados;
- iniciar uma rotina;
- encerrar/excluir;
- ver execuções recentes.

## Como funciona a execução
Ao iniciar uma rotina, surge uma barra global do Nexus.

Ela mostra:
- nome da rotina;
- etapa atual;
- progresso;
- próxima tela;
- botão "Abrir próxima";
- Pular;
- Encerrar;
- Gerenciar.

Quando o usuário chega na rota esperada, a etapa é concluída automaticamente.

Exemplo:
Radar → Clientes → Pedidos pendentes → Pós-venda

O Nexus NÃO executa a ação dentro da página.
Ele apenas conduz a sequência.

## Segurança
Rotinas V1 aceitam somente passos do tipo `route`.

Não entram na rotina automática:
- confirmar venda;
- baixar estoque;
- pagar cobrança;
- alterar saldo;
- excluir registros;
- confirmar pedido;
- ações financeiras;
- qualquer write crítico.

Essas ações continuam no fluxo oficial e, quando aplicável, no Preview Seguro do Nexus.

O backend também:
- valida que a rota pertence a uma operação que o usuário pode acessar;
- bloqueia rota dinâmica com `:id`;
- limita a rotina a 2–8 etapas;
- mantém somente 1 rotina ativa por usuário;
- aplica RLS nos dados de rotina.

## Rotinas aprendidas
O Nexus procura sequências A → B → C repetidas nos últimos 30 dias.

Só sugere quando:
- ocorreu pelo menos 2 vezes;
- as rotas são estáveis;
- o usuário tem permissão nas operações;
- ainda não existe uma rotina criada daquele fluxo.

O Nexus sugere. O usuário decide criar.

## Rotina manual
A tela usa os atalhos persistentes do V45.5.

Fluxo:
1. Fixe telas úteis em Meu Dia ou Ctrl+K.
2. Abra Rotinas.
3. Escolha 2–8 atalhos na ordem.
4. Dê um nome.
5. Salve.
6. Inicie quando quiser.

## Integração
V45.6 conecta:
- telemetria V45.3;
- Fila/Command V45.4;
- atalhos persistentes V45.5;
- rotinas guiadas V45.6.

## Backend
A migration abaixo JÁ foi aplicada no Supabase oficial:

`20260806225408_nexus_guided_routines_v1.sql`

Não rode SQL manualmente.

## Teste recomendado
1. Abra `/nexus/rotinas`.
2. Crie uma rotina com 2 ou 3 atalhos.
3. Clique "Iniciar rotina".
4. Confirme que a barra aparece globalmente.
5. Clique "Abrir próxima".
6. Ao chegar na tela, confirme que a etapa avança sozinha.
7. Complete a rotina.
8. Teste "Pular".
9. Teste "Encerrar".
10. Abra Ctrl+K e pesquise "rotinas".
11. Confira desktop e mobile.

## Commit sugerido
`V45.6 - adiciona Rotinas Nexus guiadas`
