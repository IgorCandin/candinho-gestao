# V45.14.3 · Corrige banner central escuro

## Causa

O V45.14.2 usa três cópias físicas das operações para criar o loop infinito.

O índice lógico da operação já começava em `0` (Suplementos), então quando o
carrossel era reposicionado para a cópia central do Suplementos, o React não
precisava renderizar novamente.

Como a aparência clara/escura estava ligada ao slide físico marcado como
ativo, o banner podia ficar centralizado, mas continuar com o estilo visual
de slide lateral:

- opacity reduzida;
- brightness reduzido;
- saturação reduzida.

## Correção

Este hotfix observa qual slide está geometricamente no centro do carrossel e
marca essa cópia como ativa visualmente.

Funciona:
- já na abertura da Home;
- após swipe;
- após autoplay;
- depois do reposicionamento invisível do loop;
- após redimensionar a janela.

Nenhuma imagem é alterada.

## Commit sugerido

`V45.14.3 - corrige banner central escuro no carousel de operacoes`
