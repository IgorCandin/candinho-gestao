# CANDINHO V45.3 · PACOTÃO NEXUS DAILY

## Status do pacote anterior
O deploy V45.2 foi verificado na Vercel e está READY em produção.

## Supabase
A migration deste pacote JÁ foi aplicada no projeto oficial.
Não rode SQL manualmente.

## O que muda

### 1. Nexus Daily
Na Home de Suplementos aparece um bloco novo:
- Próxima ação
- Abrir ação
- Agendar retorno amanhã com preview
- Adiar sinal por 3 dias com preview
- Atalhos aprendidos especificamente para a tela atual
- Aviso de fluxo repetido detectado

### 2. Atalhos contextuais que aprendem
O Nexus olha apenas:
- rota/página
- transição entre páginas
- quantidade de vezes
- dias distintos
- tempo técnico de tela

Exemplo real já observado antes deste pacote:
- Dashboard → Suplementos: 92x
- Produto → Página pública: 76x
- Suplementos → Agenda: 22x
- Suplementos → Produtos: 17x
- Suplementos → Vendas: 15x
- Bank → Entradas: 13x

Ele NÃO lê texto digitado ou conteúdo de formulário.

### 3. Detecção de workflow repetido
Detecta sequências de 3 páginas:
A → B → C

Quando a mesma sequência acontece mais de uma vez, entra em:
`/suplementos/nexus/habitos`

### 4. Tempo de tela
A telemetria passa a registrar `route_exit` com duração técnica.
Limite de 30 minutos por evento para evitar aba esquecida distorcer dado.

### 5. Cliques explicitamente marcados
Componentes podem usar:
`data-nexus-action`
`data-nexus-component`
`data-nexus-form`

Nenhum texto de input é enviado.

### 6. Execução segura do Nexus
Fluxo obrigatório:

1. usuário clica
2. Nexus prepara ação
3. mostra preview
4. nenhuma alteração aconteceu ainda
5. plano expira em 20 minutos
6. usuário confirma
7. RPC oficial executa
8. audit_events registra

### 7. Ações permitidas nesta versão
- Concluir sinal do Nexus
- Adiar sinal
- Ignorar sinal
- Agendar retorno de cliente
- Criar tarefa operacional (backend pronto)

Ações destrutivas/financeiras continuam fora.

### 8. Nexus Signal Card
Os cards deixam de alterar o sinal direto.
Agora:
- Abrir
- Retorno amanhã
- Concluir sinal
- Adiar 3 dias
- Ignorar

Toda mudança passa por preview.

### 9. Página de hábitos
Nova rota:
`/suplementos/nexus/habitos`

Mostra:
- eventos dos últimos 30 dias
- dias ativos
- rotas aprendidas
- fluxos repetidos
- páginas mais usadas
- tempo médio
- histórico de ações realmente executadas pelo Nexus

### 10. Copilot lateral
O botão flutuante do Nexus passa a mostrar:
- sinais
- atalhos aprendidos para a tela onde você está
- link para a página de hábitos

## Commit sugerido
`V45.3 - Nexus Daily aprende rotina e executa com preview`

## Depois
Aguardar Vercel.
Se der READY, testar:
1. `/suplementos`
2. bloco `Próxima ação`
3. botão `Adiar 3d`
4. conferir preview
5. cancelar sem executar
6. repetir e confirmar
7. `/suplementos/nexus/habitos`

## Correção de normalização
A rota numérica foi validada antes da entrega final.
Exemplos confirmados:
- `/vendas/123` -> `/vendas/:id`
- `/vendas/123/editar` -> `/vendas/:id/editar`
- UUIDs -> `/:id`

Migration corretiva já aplicada no Supabase:
`20260806193607_fix_nexus_numeric_route_normalization_v1.sql`
