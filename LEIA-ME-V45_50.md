# V45.50 · HOTFIX leve

Este pacote substitui o V45.49 e é cumulativo com o V45.48.

## Motivo do hotfix

A V45.49 ficou agressiva demais no controle do favicon:
ela observava alterações no `<head>` continuamente. Em navegadores/PCs em que
o Next.js também atualizava o `<head>`, isso podia virar uma disputa de
atualizações e elevar muito o uso do navegador.

A tela Foto 03 também ainda podia montar dezenas de cards/imagens de uma vez.

## Correções

### Favicon / desempenho global
- remove totalmente o `MutationObserver` do favicon;
- não existe loop, polling ou observação contínua do `<head>`;
- usa apenas um `useEffect` quando a rota muda;
- mantém um bootstrap minúsculo de execução única antes da hidratação;
- restaura `icon` + `shortcut icon` da Candinho;
- usa os favicons PNG otimizados já existentes em `/public/favicons`;
- cache-busting `45.50.0`;
- mantém o `src/app/favicon.ico` existente como fallback do Next.js.

### Foto 03 · Nutrição IA
- continua abrindo em **Faltam**;
- mantém **Já possuem** e **Todos**;
- remove o `MutationObserver` do workspace;
- carrega somente **12 produtos por vez**;
- botão **Carregar mais** em lotes de 12;
- busca própria antes da paginação;
- evita montar 70–80 imagens/cards simultaneamente;
- oculta os controles duplicados do componente interno.

## Importante

Não há migration nova de banco nesta V45.50.
O backend V45.48 continua intacto.
