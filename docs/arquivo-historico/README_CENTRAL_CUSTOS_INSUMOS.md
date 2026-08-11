# Hotfix — Custos e insumos passam para a Candinho Central

## O que muda

A área de etiquetas, sacolas, cartões e demais insumos deixa de ser tratada
visualmente como uma função exclusiva de Suplementos.

Nova rota principal:

`/central/custos-insumos`

Cadastro/edição:

`/central/custos-insumos/materiais`

## Por que

O próprio módulo já trabalha com:
- materiais compartilhados;
- materiais de Suplementos;
- materiais de Fitness;
- perfis de venda das duas operações.

Então a localização correta é a Candinho Central.

## Compatibilidade

As rotas antigas continuam funcionando, mas redirecionam automaticamente:

- `/estoque/custos` -> Central / Suplementos
- `/fitness/estoque/custos` -> Central / Fitness
- `/estoque/custos/materiais` -> Central / Materiais

Isso evita quebrar botões, favoritos ou links antigos.

## Menu

O ZIP adiciona um atalho “Custos e insumos” ao menu da Central, logo após
Rupturas, em desktop e mobile.

## Como aplicar

Extraia este ZIP na raiz do projeto e confirme a substituição dos arquivos.

Depois:

1. GitHub Desktop
2. Commit
3. Push origin

Commit sugerido:

`fix: move custos e insumos compartilhados para a Central`
