# Pacote Analytics + Speed Insights

Este pacote adiciona instrumentação oficial da Vercel ao Candinho Company.

## Web Analytics

- Registra visualizações e navegação entre as rotas do aplicativo.
- Permite entender quais áreas são mais utilizadas no uso real.
- Não adiciona eventos personalizados com nomes de clientes, valores financeiros ou outros dados de negócio.

## Speed Insights

- Mede a experiência real de carregamento e estabilidade visual no navegador.
- É especialmente útil para acompanhar o uso mobile/PWA no iPhone.

## Implementação

Pacotes adicionados:

- `@vercel/analytics`
- `@vercel/speed-insights`

Componentes adicionados no layout raiz:

- `<Analytics />`
- `<SpeedInsights />`

A instrumentação fica presente em Suplementos, Fitness e Bank sem alterar as regras de negócio ou o banco de dados.

## Depois do deploy

Acesse o aplicativo em produção normalmente para começar a gerar tráfego real. Os painéis da Vercel passam a receber dados conforme as páginas são visitadas.
