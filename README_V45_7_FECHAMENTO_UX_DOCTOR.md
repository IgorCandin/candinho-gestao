# Candinho V45.7 · Fechamento — UX Doctor

Esta versão fecha o ciclo iniciado no V45:
- simplificação da Company;
- vínculos;
- logística não-venda;
- Radar comercial;
- Nexus Daily;
- Fila Única;
- Ctrl+K;
- Meu Dia;
- atalhos persistentes;
- Rotinas Nexus;
- agora, Qualidade global.

## Nova área global
`/nexus/qualidade`

A antiga rota:
`/suplementos/nexus/ux`

continua funcionando, mas redireciona para a nova área global.

## UX Doctor
Cruza duas fontes:

### 1. Relatos manuais
São os registros feitos no botão `Quebra`.

Nada antigo foi apagado.

### 2. Sinais automáticos
O ERP passa a observar, de forma leve:
- overflow horizontal real da página;
- elemento fixed/sticky saindo do viewport;
- erros JavaScript no cliente;
- promises rejeitadas sem tratamento.

Não captura screenshot.
Não captura conteúdo digitado.
Não executa correção automática.
Não bloqueia navegação.

## Deduplicação
O navegador registra cada tipo de sinal no máximo uma vez por sessão/rota/contexto.

No banco:
- sinais iguais são agrupados;
- `occurrence_count` aumenta;
- `last_seen_at` é atualizado;
- o painel trabalha com os últimos 14 dias.

Assim o banco não vira uma enxurrada de eventos.

## Saúde da UX
O painel cria um score de 0–100 baseado em:
- relatos manuais pendentes;
- relatos de alta prioridade;
- sinais automáticos ativos;
- sinais automáticos de alta prioridade.

O score é um indicador operacional, não uma nota de performance do código.

## Rotas com mais atrito
O UX Doctor agrupa:
- relatos manuais;
- overflow;
- elementos cortados;
- erros de cliente.

Isso permite responder:
"qual tela eu deveria corrigir primeiro?"

## Copiar diagnóstico
Na nova tela existe `Copiar diagnóstico`.

Ele gera um texto com:
- score;
- pendências;
- sinais automáticos;
- rotas críticas;
- problemas repetidos;
- relatos manuais.

É o botão ideal para copiar tudo e mandar para análise sem precisar lembrar de cada erro.

## Responsividade da própria fila de UX
A antiga lista tinha um grid rígido de filtros.

V45.7 troca por layout responsivo:
- desktop: busca + filtros lado a lado;
- mobile: tudo em uma coluna;
- cards quebram textos longos;
- botões se reorganizam;
- inputs respeitam largura da tela.

## Resiliência global segura
Foi incluído apenas polimento que não esconde problemas:
- `min-width: 0` em containers comuns;
- inputs/selects/textarea não ultrapassam container;
- textos longos quebram;
- wrappers de tabela conhecidos recebem scroll horizontal próprio.

IMPORTANTE:
não foi colocado `overflow-x: hidden` global.
O UX Doctor precisa enxergar overflow real para apontar onde corrigir.

## Segurança
- sinais pertencem ao usuário;
- RLS ativa;
- escrita somente por RPC controlada;
- rota precisa ser interna;
- payload técnico limitado pelo endpoint;
- usuário precisa estar ativo;
- ações críticas do ERP não participam desse mecanismo.

## Backend
A migration abaixo JÁ foi aplicada no Supabase oficial:

`20260806233618_nexus_ux_doctor_global_quality_v1.sql`

Não rode SQL manualmente.

## Teste depois do deploy
1. Abra `/nexus/qualidade`.
2. Confirme o score.
3. Use o ERP normalmente.
4. Abra uma tela que costuma cortar no desktop.
5. Volte ao UX Doctor e clique `Atualizar`.
6. Confira se surgiu `Overflow horizontal` se o documento realmente estourou.
7. Use o botão `Quebra` e registre um relato manual.
8. Confira se ele aparece na mesma central.
9. Teste `Copiar diagnóstico`.
10. Teste a central no telefone.

## Commit sugerido
`V45.7 - fecha ciclo com UX Doctor e qualidade global`
