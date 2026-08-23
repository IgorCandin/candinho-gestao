# V45.44 — Favicon e preview de compartilhamento

Objetivo: eliminar o fallback visual antigo do Next/Vercel e deixar links públicos com identidade Candinho.

## Alterações

- substitui `src/app/favicon.ico` por fallback Candinho Company;
- adiciona `metadataBase` para URLs absolutas de Open Graph;
- adiciona Open Graph/Twitter padrão da Candinho Company;
- `/catalogo` recebe preview da Candinho Company;
- `/catalogo/suplementos` recebe preview/ícone Candinho Suplementos;
- `/catalogo/fitness` recebe preview/ícone Candinho Fitness;
- corrige a identidade da aba para os subcatálogos;
- completa o manifest PWA com os ícones oficiais da Company;
- sobe a versão de cache dos favicons para `45.44.0`.

## Observação sobre WhatsApp

O WhatsApp e outras redes podem manter cache do preview de uma URL já compartilhada. Depois do deploy, novos compartilhamentos tendem a atualizar; se a miniatura antiga aparecer imediatamente, não significa que o deploy falhou.

## Commit sugerido

`V45.44 corrige favicon e preview de compartilhamento do catálogo`
