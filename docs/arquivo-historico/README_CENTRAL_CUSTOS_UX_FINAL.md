# Hotfix — Custos e insumos somente na Central

## Ajustes

### 1. Remove o atalho de dentro das operações
Na tela de Estoque de Suplementos/Fitness, a barra antiga com:

- Estoque de produtos
- Custos e insumos

deixa de aparecer.

Também é escondido qualquer botão interno das operações que leve para
Custos e insumos.

A ferramenta continua disponível somente em:

`Central -> Custos e insumos`

### 2. Corrige a identidade visual
O módulo de Custos e insumos ainda possuía cores douradas fixas do antigo
contexto de Suplementos.

Agora estados ativos, botões principais, foco de campos e blocos explicativos
herdam o accent da Candinho Central.

Estados semânticos continuam preservados:
- verde = sucesso/saudável
- vermelho = erro/negativo
- accent da Central = navegação/ação ativa

## Como aplicar

Extrair na raiz do projeto, substituir os arquivos e:

GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: centraliza custos e corrige identidade visual da Central`

Sem banco e sem migration.
