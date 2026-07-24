# Candinho Company · V26 — Controle de Sabores

## Objetivo

Adicionar controle opcional de sabores aos produtos da Candinho Suplementos sem
transformar cada sabor em um produto diferente e sem quebrar o histórico antigo.

Exemplo:

**Pré-treino T**

- Estoque físico total: 2
- Maçã Verde: 1
- Ice: 1

O produto continua sendo um único produto para:

- faturamento;
- margem;
- ranking;
- catálogo;
- relatórios;
- reposição geral.

O sabor funciona como uma subdivisão operacional do estoque.

---

## 1. Produtos sem sabor

Produtos que não usam sabor continuam exatamente como antes.

Exemplos:

- creatina sem sabor;
- cápsulas;
- vitaminas;
- acessórios.

Nenhum produto existente foi ativado automaticamente durante a implantação da
V26.

Estado validado em produção no momento da implantação:

- produtos com controle por sabor ativo: **0**
- sabores cadastrados automaticamente: **0**

---

## 2. Adicionar sabores no cadastro do produto

O formulário de novo produto e o formulário de edição ganharam:

**Adicionar sabores**

Ao ativar a opção, é possível cadastrar nomes como:

- Maçã Verde
- Ice
- Frutas Vermelhas
- Morango
- Baunilha
- Chocolate

O cadastro do produto e a configuração dos sabores são salvos na mesma
transação.

Portanto:

- se tudo der certo, produto + sabores são salvos;
- se alguma validação falhar, nada fica salvo pela metade.

---

## 3. Ativação em produto que já possui estoque

Ao ativar sabores em um produto existente, o sistema exige a distribuição do
estoque físico atual por local.

Exemplo:

CS — físico total: 2

- Maçã Verde: 1
- Ice: 1

Distribuído: 2 de 2 ✅

O sistema não permite:

- distribuir 1 de 2;
- distribuir 3 de 2;
- ativar sem informar a composição completa.

A soma dos sabores precisa continuar igual ao estoque físico agregado.

---

## 4. Proteção de pendências antigas

A ativação é bloqueada quando o produto possui:

- venda pendente/reserva antiga sem sabor;
- pedido de fornecedor pendente criado antes do controle por sabor.

Esses compromissos precisam ser resolvidos antes da ativação.

Vendas antigas já concluídas não impedem a ativação.

---

## 5. Histórico antigo sem sabor

Nova área:

`/produtos/sabores/historico`

Quando um produto existente passa a usar sabores, as vendas antigas continuam
válidas.

Elas aparecem para classificação histórica.

Exemplo:

Venda antiga:

Pré-treino T — 2 unidades

Pode ser classificada como:

- Maçã Verde: 1
- Ice: 1

A classificação precisa somar exatamente a quantidade vendida.

Importante:

**classificar o histórico não movimenta estoque novamente.**

A venda já movimentou estoque no passado. A ferramenta apenas reconstrói o
dado de qual sabor foi vendido.

---

## 6. Cancelamento de venda histórica

Se uma venda antiga já baixou estoque e o produto agora usa sabores, o sistema
não inventa para qual sabor a unidade deve voltar.

Antes do cancelamento, a venda precisa estar classificada.

Depois:

- Maçã Verde volta para Maçã Verde;
- Ice volta para Ice.

Isso evita criar estoque de sabor incorreto.

---

## 7. Vendas e orçamentos novos

Produtos sem sabores:

- fluxo permanece igual.

Produtos com sabores:

- o campo **Sabor** aparece automaticamente;
- o sabor é obrigatório antes de salvar o orçamento/venda;
- a disponibilidade exibida passa a ser a disponibilidade daquele sabor.

É permitido ter no mesmo orçamento:

- Pré-treino T · Maçã Verde
- Pré-treino T · Ice

O produto é o mesmo, mas os sabores são itens operacionais diferentes.

O fluxo V26 usa:

- `save_budget_quote_v2`
- `confirm_budget_quote_v2`

Ao confirmar:

- o sabor escolhido é preservado na venda;
- a reserva é criada para aquele sabor;
- se entregue imediatamente, baixa aquele sabor.

---

## 8. Entrega posterior

Uma venda reservada com sabor mantém esse sabor até a entrega.

Exemplo:

Venda:

Pré-treino T · Ice · 1

Reserva:

Ice · 1

Na entrega:

- baixa 1 Ice;
- não baixa Maçã Verde;
- não escolhe um sabor aleatoriamente.

---

## 9. Leads

Lead representa intenção comercial e não reserva estoque.

Por isso o sabor é opcional.

Exemplo:

Cliente interessado em Whey X:

- sabor ainda não decidido → permitido;
- sabor Chocolate → também pode ser registrado.

Ao transformar o atendimento em orçamento/venda, o sabor passa a ser
obrigatório.

---

## 10. Pedidos de fornecedor

Produtos com sabores passam a ser comprados por sabor.

Exemplo:

- Pré-treino T · Maçã Verde · 6
- Pré-treino T · Ice · 6

No resumo agregado:

Pré-treino T — 12 a caminho

Na composição:

- Maçã Verde — 6 a caminho
- Ice — 6 a caminho

O recebimento de cada item atualiza:

1. o estoque total do produto;
2. o estoque do sabor correspondente.

---

## 11. Ajuste, contagem e transferência

Produtos com sabores exigem o sabor nas operações:

- contagem física;
- ajuste manual;
- transferência entre locais.

Exemplo de transferência:

CS:
- Ice: 3

Transferir 1 Ice para INGRID:

CS:
- Ice: 2

INGRID:
- Ice: 1

O total agregado do produto continua consistente.

---

## 12. Visualização de estoque

A visão principal continua rápida:

**Pré-treino T**

- Físico: 2
- Reservado: 0
- Disponível: 2
- A caminho: 0

Quando o produto usa sabores, aparece a composição:

- Maçã Verde — físico 1 · disponível 1
- Ice — físico 1 · disponível 1

Na página completa de estoque também aparece a composição por:

- sabor;
- local;
- físico;
- reservado;
- disponível;
- a caminho.

Movimentações e reservas passam a exibir o sabor quando houver.

---

## 13. Venda e histórico visual

A ficha da venda mostra o sabor.

Venda nova:

`Pré-treino T · Sabor Ice`

Venda histórica classificada:

`Pré-treino T · Maçã Verde ×1, Ice ×1`

O PDF do orçamento também mostra o sabor escolhido.

---

## 14. Brindes

Produto com controle por sabor não pode ser escolhido pelo campo automático de
brinde.

Motivo:

o campo de brinde antigo não possui seletor de sabor.

Para dar um produto com sabor como cortesia, ele deve ser adicionado como item
normal no orçamento para o sabor ser explicitamente escolhido.

Isso evita saída de estoque sem saber qual sabor foi entregue.

---

## 15. Segurança

As novas tabelas:

- `product_flavors`
- `product_flavor_stock_balances`
- `sale_item_flavor_allocations`

mantêm:

- leitura autorizada via RLS;
- INSERT direto bloqueado para `authenticated`;
- UPDATE direto bloqueado para `authenticated`;
- DELETE direto bloqueado para `authenticated`.

As mutações usam RPCs protegidas.

As principais RPCs V26 foram validadas com:

- `SECURITY DEFINER = true`
- `search_path = public`
- EXECUTE para `authenticated`
- sem EXECUTE para `anon`

---

## 16. Compatibilidade

O backend V26 é aditivo.

Como nenhum produto existente foi ativado automaticamente, o frontend V25
continua operando para todos os produtos enquanto o V26 ainda não tiver sido
publicado.

Depois do V26:

- somente produtos explicitamente ativados passam a exigir sabor;
- os demais continuam no fluxo antigo.

A RPC antiga `create_budget` permanece no banco por compatibilidade.

O frontend V26 usa as novas RPCs modulares.

As travas de banco impedem que uma tela antiga grave silenciosamente uma venda
de produto com sabor sem informar o sabor.

---

## 17. Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

O trabalho da Meta permanece isolado.

---

## Backend

A estrutura V26 já foi aplicada diretamente no Supabase de produção.

O frontend deste pacote ainda depende de:

1. extrair o ZIP sobre a raiz do repositório;
2. commitar;
3. aguardar o deployment correspondente ficar READY na Vercel.

Somente depois disso os novos controles aparecerão na interface.

---

## Commit sugerido

`V26 · Controle de sabores — Estoque, vendas e histórico`


---

## Validação final do pacote

Antes do empacotamento final:

- arquivos TypeScript/TSX verificados sintaticamente: **16**
- erros sintáticos encontrados: **0**
- escritas diretas `.insert/.update/.delete/.upsert` nos novos arquivos de frontend: **0**

Validação final no Supabase:

- produtos ativados automaticamente para sabores: **0**
- sabores criados automaticamente: **0**
- saldos por sabor criados automaticamente: **0**
- classificações históricas criadas automaticamente: **0**

As tabelas novas permanecem:

- SELECT para `authenticated`: permitido
- INSERT direto: bloqueado
- UPDATE direto: bloqueado
- DELETE direto: bloqueado

As 12 RPCs críticas verificadas permaneceram com:

- `SECURITY DEFINER`
- `search_path=public`
- EXECUTE para `authenticated`
- sem EXECUTE para `anon`

A validação realizada foi sintática/estrutural e de banco. O build completo do
Next.js será validado pelo deployment da Vercel depois do commit.
