# Candinho V45.5 · Meu Dia + Atalhos Persistentes

## O que muda
Esta versão é focada em reduzir cliques e reduzir a sensação de estar perdido no ERP.

### 1. Meu Dia
Nova rota:
`/nexus/foco`

Ela reúne:
- as 5 próximas prioridades da Fila Única;
- seus atalhos fixados;
- sugestões que o Nexus aprendeu pelo uso real;
- telas recentes;
- acesso ao Ctrl+K.

Não existe uma nova agenda. Nenhuma tarefa é duplicada.

### 2. Atalhos persistentes
O usuário pode fixar e desafixar rotas.

Os atalhos ficam salvos por usuário em:
`nexus_user_shortcuts`

O Nexus sugere, mas NÃO fixa sozinho.

### 3. Atalhos de teclado
Os 4 primeiros atalhos do contexto atual:
- Alt+1
- Alt+2
- Alt+3
- Alt+4

Eles não disparam enquanto o usuário está digitando em input, textarea, select ou conteúdo editável.

### 4. Ctrl+K com favoritos
O Nexus Command agora:
- mostra os atalhos pessoais no topo;
- permite fixar/desafixar rotas;
- permite fixar a rota que a IA acabou de interpretar;
- abre Meu Dia.

### 5. Company Home
A tela principal continua concentrada nas operações.

Foi adicionado apenas um utilitário:
`Meu Dia`

junto de Vitrine, Physique, Perfil e Sair.

### 6. Aprendizado corrigido
A telemetria passa a classificar:
- `/dashboard` como Company;
- `/nexus/*` como Company;
- `/physique/*` como Physique.

Também foi corrigido o escopo das sugestões: a operação é calculada pelo destino do atalho.

### 7. Segurança
- RLS por usuário;
- backend valida acesso;
- rotas dinâmicas `:id` não podem ser fixadas;
- limite de 12 atalhos por contexto;
- atalhos apenas navegam;
- nenhuma venda, baixa, pagamento ou exclusão é executada por um atalho.

## Backend
JÁ aplicado no Supabase oficial:
- `20260806222019_nexus_personal_focus_shortcuts_v1.sql`
- `20260806222138_nexus_personal_shortcut_scope_fix_v1.sql`

Não rode SQL manualmente.

## Teste depois do deploy
1. `/dashboard` → Meu Dia
2. fixe 2 sugestões;
3. teste Alt+1 e Alt+2;
4. abra Ctrl+K;
5. confira os favoritos no topo;
6. fixe e desafixe uma rota;
7. confira mobile.

## Commit sugerido
`V45.5 - adiciona Meu Dia e atalhos persistentes do Nexus`
