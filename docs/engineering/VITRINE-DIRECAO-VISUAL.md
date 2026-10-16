# Vitrine — direção visual revisada

O responsável rejeitou a primeira versão de descoberta: organização melhor, mas aparência de catálogo genérico. A revisão fica em `/catalogo/descobrir`.

## Referências examinadas

- Skiper UI: título de grande escala, composição que ocupa a tela, profundidade entre imagens e resposta às interações. Inspiração de comportamento; sem copiar componentes premium.
- MotionSites: exemplos de campanhas onde imagem e tipografia formam uma composição única; alternância de cenas em vez de um longo conjunto de cartões iguais. Pré-visualizações parcialmente indisponíveis; não presumir acesso aos prompts pagos.
- Cult UI: peças que revelam informação no contato do usuário; adotar abertura rápida e feedback em favoritos, com alternativa por toque/teclado.
- Refero Styles e Unsection: consistência de tipografia e ritmo entre seções. Galerias são referências, não bibliotecas instaladas.

## Sistema visual

- Prata `#e9ecef`, carvão `#181b20`, branco `#ffffff`, ocre Suplementos `#d7ad61`, rosa Fitness `#c52b70`, cinza secundário `#626971`.
- Barlow Condensed 800 para títulos de campanha; Manrope 400/600 para leitura e controles. Fontes locais com licenças OFL, sem requisições externas em execução.
- Abertura: título monumental + composição de produtos reais em profundidade + escolha entre cenas de Suplementos e Fitness.
- Continuação: duas coleções de composições diferentes, filtro compacto e galeria com um produto de escala maior. Evitar uma repetição uniforme de caixas.
- Movimento responde à escolha de cena, aproximação de foto e seleção; sem rolagem sequestrada, autoplay ou animação infinita. Respeitar movimento reduzido.
- Manter preço/estoque reais, navegação de compra, diálogo, favoritos e estados vazios. Não apresentar produto indisponível como disponível ou inventar ranking, promoção, depoimento ou urgência.

Revisão crítica antes de implementar: apenas mudar fundo e fontes ainda pareceria a mesma página. Por isso a abertura passa a usar composição sobreposta e cena alternável, e a galeria recebe hierarquia de tamanho. Fotos do ERP permanecem as fontes do produto e suas opções; imagens editoriais existentes não definem disponibilidade nem criam oferta de combo.

## Adaptação após aprovação visual

O responsável aprovou a direção e pediu transparência, nitidez e mais interação na rolagem. Manter prata/carvão/ocre/rosa e as fontes; substituir molduras claras por produtos soltos, sem refazer a identidade aprovada. Referências revisitadas: [Skiper](https://skiper-ui.com/) (revelação de imagens e profundidade), [MotionSites](https://motionsites.ai/) (composição de campanha). Implementação própria, sem componentes premium copiados.

Revisão do plano: aplicar a mesma entrada de opacidade em todos os cartões seria repetitivo. Em vez disso, a abertura espalha suas camadas com a rolagem e responde discretamente ao ponteiro; coleções têm deslocamentos diferentes; uma faixa tipográfica atravessa a passagem para a galeria; as fotos têm revelação/escala ligada à posição na tela. Sem autoplay ou controle artificial da rolagem.

- Duas imagens editoriais derivadas dos originais públicos de 1200px, por ferramenta imagegen integrada, com alpha verdadeiro: `public/discovery-products/creatina-candinho-v1.webp` e `abduzido-v1.webp` (1254px). Prompt-base: remover somente fundo/piso, preservar produto, rótulo, cores e proporções; sem objetos, molduras ou sombra incorporada. Prompts completos em `VITRINE-RECORTES-PROMPTS.md`.
- A tentativa de recorte Fitness foi recusada pela ferramenta. Sua foto original foi preservada; integração visual por composição/mistura com o fundo. Não afirmar que todas as fotos do catálogo têm alpha.
- Os detalhes usam a foto original em tamanho maior. Os recortes só substituem a fonte editorial conhecida: trocar a foto no catálogo invalida automaticamente o recorte anterior. Não há atualização de cadastro ou storage.
- Imagens entregues pelo otimizador Next.js, com tamanhos responsivos e carregamento tardio fora da abertura; host de storage público explicitamente permitido.
- Recuperação em falha de otimização: original direto, miniatura de catálogo e indicação textual se nenhuma fonte estiver disponível. Mudar a cena/foto reinicia a tentativa para a nova fonte.
- Movimento sem dependências: IntersectionObserver limita o conjunto visível, requestAnimationFrame agrupa leituras/escritas, sem render React por evento de scroll. MutationObserver acompanha filtros e expansão. Listeners/observers são removidos no unmount. Preferência de movimento reduzido funciona antes do JS e ao mudar durante a visita; conteúdo permanece visível sem JS.
