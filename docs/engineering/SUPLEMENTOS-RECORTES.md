# Recortes dos suplementos — 17/10/2026

O responsável autorizou recorte técnico de todas as fotos restantes, preservando os produtos e rótulos, em vez de redesenho por IA.

- 31 fotos originais de 1000–1254px foram usadas, não as miniaturas. Os dois recortes anteriores e os 21 Fitness continuam preservados.
- Extração técnica com máscara de primeiro plano e alpha. Oito contornos foram refinados manualmente para recuperar embalagem branca e remover piso/sombra opaca: Ashwagandha, Cafeína Growth, Core Growth, HMB Growth, Ioimbina, Multivitamínico Growth, Psyllium e Uxi Amarelo.
- O RGB dos mestres vem da foto original, sem redesenho de texto/marca. Mestres WebP lossless: aproximadamente 12,6 MB no conjunto. Versões de exibição com até 768px e qualidade 95: aproximadamente 1,8 MB no conjunto. Alpha preservado em ambas.
- Arquivos: `public/discovery-products/supplement-<id>-v1.webp` (mestre) e `supplement-<id>-display-v1.webp` (exibição).
- Manifesto consumido: `src/lib/storefront-supplement-cutouts.json`. Associação por ID e nome da foto fonte; troca da foto no catálogo invalida o recorte anterior.
- A abertura e os cartões usam a versão de exibição. Os detalhes mantêm a foto original e as variantes do catálogo, como nas revisões anteriores.
- Inspeção conjunta sobre fundo bege detectou apagamento de embalagens brancas na primeira passagem; os contornos foram corrigidos antes da integração. Alpha 0–255 conferido nos 31 mestres. Testes verificam arquivos e impedem reaproveitamento de recorte de uma foto antiga.

Nenhuma dependência da aplicação, dados de estoque, preços ou regras de compra foi alterada para produzir os recortes.
