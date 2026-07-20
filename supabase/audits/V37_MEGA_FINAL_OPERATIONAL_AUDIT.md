# V37 · Auditoria técnica

## Base observada

Último commit confirmado antes da montagem:

`25d92321aa7a8f709a0b56f81ae25de74af8989e`

`V35 · CRM Company 360, menu recolhível e alertas de estoque`

A V36 ainda não aparecia na main.

Por isso a V37 inclui V36 + V37.

---

## Product Nexus

Edge:

`product-nexus-enrich`

Status:

ACTIVE

Versão:

1

JWT:

true

Ferramenta externa:

OpenAI Responses API com `web_search`.

Persistência da resposta:

`store=false`

Persistência no produto:

nenhuma.

O frontend aplica sugestões apenas no estado local do formulário.

O salvamento continua exclusivamente pelos fluxos existentes:

- `create_product_record_v2`
- `update_product_record_v2`

---

## Campos protegidos

Nunca enviados para preenchimento automático:

- preços;
- estoque;
- fornecedor;
- SKU;
- sales_category.

Campos existentes não são sobrescritos.

---

## Sidebar

V35:

`left: 232px`

V37:

`left: 202px`

Botão:

34px

Objetivo:

manter o controle totalmente dentro da sidebar de 252px e longe da barra/divisória.

---

## Parceiros

A V37 contém o pacote cumulativo da V36:

- `partner_legacy_history_snapshot`
- leitura segura do histórico legado;
- painel gerencial da rede;
- correção da ficha Pâmella.

---

## Escopo preservado

- Meta
- Marketing
- Bank
- CRM 360
- Sabores
- Consignações Fitness
- PDFs Fitness
- Pós-venda Nexus
