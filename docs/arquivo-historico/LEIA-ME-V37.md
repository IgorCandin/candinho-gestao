# Candinho Company · V37
## Mega Finalização Operacional

Pacote cumulativo sobre a V35.

Inclui integralmente a V36 ainda pendente de commit e acrescenta a V37.

---

## 1. Pâmella e rede de parceiros

Inclui:

- correção da ficha `C.T.S. Pâmella Nunes`;
- histórico legado por RPC segura;
- exclusão do falso `Marco zero teste`;
- tratamento das duplicidades do legado;
- gestão da Rede Candinho;
- parceiros sem movimento;
- cadastros incompletos;
- estoque nos pontos parceiros;
- indicadores do ciclo.

---

## 2. Botão do menu lateral

O comportamento da V35 é preservado.

Correção:

- botão fica totalmente dentro da sidebar;
- não atravessa mais a divisória visual;
- botão de abrir permanece no canto esquerdo quando o menu está fechado;
- preferência continua salva no navegador;
- celular continua sem esse botão.

---

## 3. Nexus · Completar informações

Disponível no mesmo formulário usado por:

- Adicionar produto
- Editar produto

Botão:

`Completar informações`

Fluxo:

1. Digite o nome do produto.
2. Clique em `Completar informações`.
3. O Nexus pesquisa a internet.
4. Mostra confiança e fontes consultadas.
5. Clique em `Aplicar nos campos vazios`.
6. O formulário é preenchido.
7. Nada é salvo automaticamente.
8. Revise e use o botão normal de salvar.

---

## 4. O que pode ser preenchido

Somente campos vazios:

- Marca
- Categoria
- Descrição
- Objetivo
- Perfil ideal
- Duração / doses
- Informativo
- Mensagem rápida
- Palavras-chave
- Nível

Nunca preenche automaticamente:

- Custo
- Preço de venda
- Preço a prazo
- Estoque mínimo
- Estoque ideal
- Fornecedor
- SKU
- Categoria ABC de vendas

Campos já preenchidos são preservados.

---

## 5. Edge Function

Nova Edge:

`product-nexus-enrich`

Já implantada diretamente no Supabase:

- version 1
- ACTIVE
- verify_jwt=true

A pesquisa só acontece quando o usuário solicita.

A Edge retorna `saved=false`.

Não cria nem edita produto no banco.

---

## 6. Sabores e Fitness

A V37 preserva as estruturas que já estavam no sistema:

### Sabores

- adicionar sabores;
- estoque por sabor;
- vendas por sabor;
- histórico antigo;
- pedidos/recebimentos por sabor.

O Nexus não ativa sabores automaticamente.

### Fitness

- consignações/provas;
- acerto;
- devolução do restante;
- conversão em venda;
- orçamento;
- PDF;
- catálogo selecionado.

Essas áreas já existiam nas V25/V26 e não foram duplicadas.

---

## 7. Meta e Marketing

Intocados.

Nenhuma alteração em:

- `central-meta-send`
- `central-meta-webhook`
- Marketing

---

## Commit sugerido

`V37 · Mega finalização operacional — Parceiros, Nexus Produto e UX`
