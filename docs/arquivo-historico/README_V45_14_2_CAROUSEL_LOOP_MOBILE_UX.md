# V45.14.2 · Carousel infinito + correções mobile

Hotfix cumulativo sobre V45.14. Inclui também o banner desktop correto
do Fitness da V45.14.1.

## 1. Loop infinito real

O carrossel usa três cópias lógicas das operações e trabalha sempre
na cópia central.

Resultado:
- no mobile, depois de Central você continua arrastando e volta para
  Suplementos sem precisar retornar de um em um;
- no desktop, autoplay e setas também percorrem o carrossel de forma
  circular;
- o reposicionamento para a cópia central é invisível.

## 2. Desktop

- autoplay: 2,5 segundos;
- mouse em cima: pausa;
- saiu com o mouse: continua;
- setas laterais continuam disponíveis;
- trackpad / scroll horizontal continua disponível;
- dots foram centralizados como no telefone;
- barra de progresso acompanha os 2,5 segundos.

`prefers-reduced-motion` continua sendo respeitado por acessibilidade.

## 3. Mobile

Removida a moldura/card CSS extra do banner.

A arte enviada já possui sua própria borda, portanto agora não existe
mais o efeito de "quadrado por fora do quadrado".

Também removemos escala externa do card para evitar corte/desalinhamento
da moldura original.

## 4. Texto "Suplementos selecionado"

Era um `aria-live` destinado a leitor de tela, mas a classe antiga
não estava escondendo o elemento em todas as situações.

Agora usa uma classe específica de screen-reader-only e nunca aparece
visualmente.

## 5. Acesso rápido

No mobile:
- Meu Dia
- Vitrine
- Physique
- Perfil
- Sair

passam a formar um dock único com 5 colunas iguais.

Assim não existe mais o layout 2 + 2 + 1 com o botão Sair sobrando.

## 6. Fitness Desktop

Inclui o banner horizontal correto enviado posteriormente.

## Commit sugerido

`V45.14.2 - corrige loop do carousel e refina UX mobile da home`
