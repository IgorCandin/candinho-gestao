# V45.14 · Home de Operações Premium

Pacote cumulativo para aplicar sobre V45.13.
Também carrega a V45.13.2 (orçamento sem confirmação duplicada + migration
de permissão do Radar), caso ela ainda não tenha sido subida.

## Nova Home `/dashboard`

A antiga grade de ícones é substituída por um seletor visual de operações.

### Desktop
- banners horizontais em carrossel estilo streaming;
- slide central em foco e próximos banners parcialmente visíveis;
- autoplay a cada 2,5 segundos;
- hover/foco pausa o autoplay;
- hover cria glow da cor da operação e brilho de passagem;
- setas laterais;
- dots e posição atual;
- barra fina de progresso do autoplay;
- teclado: setas esquerda/direita;
- trackpad continua podendo rolar horizontalmente;
- respeita `prefers-reduced-motion`.

### Mobile
- artes verticais;
- swipe nativo com o dedo;
- `scroll-snap` para encaixar exatamente uma operação;
- dots de posição;
- sem autoplay forçado no telefone;
- toque no banner abre a operação.

## Permissões preservadas

O usuário só vê no carrossel operações que ele já possui permissão para
acessar.

Rotas:
- Suplementos → `/suplementos`
- Fitness → `/fitness`
- Bank → `/bank`
- Marketing → `/marketing`
- Central → `/central`

## Acesso rápido

Abaixo do carrossel:
- Meu Dia → `/nexus/foco`
- Vitrine → `/catalogo`
- Physique → `/physique` (mantém permissão atual)
- Perfil → `/configuracoes` (mantém permissão atual)
- Sair → logout

## Artes

As imagens enviadas foram convertidas para WebP em alta qualidade para
reduzir o peso da Home.

Pasta:
`public/operation-banners/`

Existe arte horizontal e mobile para:
- Suplementos
- Bank
- Marketing
- Central

Para Fitness foi enviada somente a arte vertical. No desktop a V45.14 não
estica nem corta a imagem: usa a arte vertical centralizada sobre uma
ambientação rosa derivada da própria arte. Quando houver um banner horizontal,
basta substituir `desktopImage` em `dashboard/page.tsx`.

## V45.13.2 incluída

O pacote também inclui:
- remoção do modal duplicado ao salvar orçamento novo;
- migration já aplicada em produção:
  `grant select on public.customer_sales_opportunities_v1 to authenticated;`

## Banco

Nenhuma migration nova da V45.14.
A migration carregada no pacote é somente o registro do fix do Radar já
aplicado anteriormente.

## Commit sugerido

`V45.14 - cria home premium de operacoes com carousel e swipe`
