# V45.49 · Foto 03 + Favicon oficial

Este pacote é cumulativo: contém o V45.48 anterior e acrescenta somente duas correções de frontend.

## 1. Foto 03 · Nutrição IA

- abre por padrão em **Faltam**;
- `Faltam`: somente produtos sem `secondary_image_url`;
- `Já possuem`: produtos que já têm Foto 03, para revisar, refazer ou remover usando as ações já existentes;
- `Todos`: visão completa;
- remove da tela principal a duplicação de KPIs/filtro de status que deixava o topo poluído;
- reorganiza busca, cards, espaçamento e comportamento mobile;
- não muda pesquisa IA, aprovação, salvamento nem dados nutricionais.

## 2. Favicon

O `RouteTabIdentity` passa a usar os arquivos oficiais sem sufixo `-v44`:

- Company: `/favicons/cc.png`
- Central: `/favicons/cce.png`
- Suplementos: `/favicons/cs.png`
- Fitness: `/favicons/cf.png`
- Bank: `/favicons/cb.png`

Também:
- atualiza `icon` e `shortcut icon`;
- aplica cache-busting V45.49;
- reaplica o favicon quando o Next.js altera o `<head>`, ao voltar para a aba e no `pageshow`;
- evita que outro navegador continue pegando o ícone antigo por um link concorrente.

## Segurança

Nenhuma migration adicional de banco foi criada na V45.49.
Nenhuma mudança foi executada diretamente em produção.
