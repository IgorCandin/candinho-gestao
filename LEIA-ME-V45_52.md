# V45.52 · Importador de Foto 03 em lote

Base esperada: V45.51 já commitada.

## O que entra

- novo card **Subir pacote de Foto 03** em Central → Marketing → Produtos → Nutrição;
- aceita várias imagens + `manifest.json`;
- também reconhece imagens sem manifesto se o arquivo for `SKU.png`, `SKU__nome.png` ou `product-id.png`;
- usa o endpoint de upload que o ERP já possui para Foto 03, portanto não cria storage paralelo;
- envia **um produto por vez**, evitando pico de CPU/memória;
- produtos já com Foto 03 ficam bloqueados por padrão;
- existe opção explícita para permitir substituição;
- após upload, o produto fica em `review`, nunca aprovado automaticamente;
- source_name/source_url/notes do manifest são gravados quando fornecidos;
- nenhum saldo de OpenAI é necessário para importar lotes.

## Como usaremos sem saldo na API

1. No ChatGPT/Work, produzimos 10 produtos.
2. O lote vem com 10 PNGs + `manifest.json`.
3. Você extrai o ZIP do lote.
4. Arrasta os 11 arquivos para o importador.
5. Confere os vínculos.
6. Clica em **Aplicar lote como Foto 03**.
7. Depois revisa/aprova normalmente no ERP.

## Lote 01

O pacote já inclui:
- `docs/foto03/FOTO03_LOTE_01_LISTA.md`
- `docs/foto03/FOTO03_LOTE_01_manifest.json`

Eles definem os primeiros 10 produtos que vamos produzir.

## Banco

Sem migration.
Sem alteração automática em produção.
