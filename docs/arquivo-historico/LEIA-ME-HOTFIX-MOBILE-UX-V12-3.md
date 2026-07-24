# Hotfix Mobile UX V12.3

## Problema
No celular, a sidebar desktop voltou a aparecer junto com o cabeçalho/menu móvel.

## Causa
`AppShell` passou a aplicar `display: flex` diretamente no atributo `style` da sidebar.
No CSS responsivo já existia `.sidebar { display: none; }`, mas o estilo inline ganhou prioridade e manteve a sidebar visível no telefone.

## Correção
Adiciona uma regra mobile explícita:

`.app-shell > .sidebar { display: none !important; }`

Assim:
- desktop continua com a sidebar rolável;
- celular volta a mostrar apenas o cabeçalho compacto;
- botão Menu abre o painel móvel normalmente;
- barra inferior de ações continua disponível.

## Aplicação
Extraia este ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça commit + push.

Commit sugerido:
`Hotfix Mobile UX V12.3 · Oculta sidebar desktop no celular`
