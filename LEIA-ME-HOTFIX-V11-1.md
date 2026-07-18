# Candinho Company — Hotfix V11.1

Correções deste pacote:

1. Corrige o erro de build da V11 no catálogo selecionável.
   - Motivo: `pdf.save()` retorna `Uint8Array` e o `Response` do build atual não aceitou esse tipo diretamente.
   - Ajuste: o corpo do PDF agora usa `Buffer.from(bytes)`, igual ao gerador de catálogo automático já usado no projeto.

2. Remove o botão `PARCEIROS` da tela de escolha de operação.
   - Permanecem `PERFIL` e `INTEGRAÇÕES` para administradores.

## Como aplicar

Extraia este ZIP sobre a raiz do projeto `candinho-gestao` e substitua os arquivos existentes.
Depois revise no GitHub Desktop, faça commit e Push para `main`.

Commit sugerido:
`Hotfix V11.1 · Corrige build do catálogo e remove Parceiros da Home`
