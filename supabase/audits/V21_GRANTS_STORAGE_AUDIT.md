# V21 · Auditoria de Grants e Storage

## 1. Acesso anônimo às tabelas de negócio

A auditoria de grants não encontrou privilégios diretos do role `anon` nas
tabelas de negócio do schema `public`.

Os grants encontrados para `anon` estavam no schema interno `storage`, que é
gerenciado pelo serviço de Storage e protegido por RLS. Eles não foram
revogados em massa para não quebrar o funcionamento do serviço.

## 2. Storage

Buckets encontrados:

### central-media

- privado;
- limite de 50 MB;
- tipos permitidos: JPEG, PNG, WebP, HEIC, HEIF, MP4, QuickTime e PDF;
- leitura protegida por `central_can_access_scope(...)`;
- insert/update/delete protegidos por `central_can_write_scope(...)`.

Pastas de primeiro nível encontradas na auditoria:

- `company`
- `marketing`
- `supplements`

Não foram encontrados objetos legados em `outbox` ou caminhos fora desses
escopos no momento da auditoria.

### product-images

- público, intencionalmente, para exibição das imagens no catálogo;
- limite de 10 MB;
- JPEG, PNG e WebP;
- upload/update/delete exigem `can_write()`.

Não foi encontrada policy anônima de escrita.

## 3. Policies públicas amplas

Não foi encontrada policy sensível de negócio com `USING (true)` liberando
dados de clientes, vendas, estoque ou financeiro.

A policy literal `true` identificada foi a leitura de `ui_feature_flags`,
tabela que contém apenas flags de recursos da interface.

## 4. Grants Fitness

A migration original de Fitness concedia:

`SELECT, INSERT, UPDATE, DELETE`

para todas as tabelas principais.

O código atual usa leitura direta para montar as telas, enquanto as mutações
de negócio são realizadas por RPCs como:

- `save_fitness_product_v2`
- `save_fitness_customer`
- `save_fitness_supplier`
- `adjust_fitness_stock`
- `convert_fitness_stock`
- `create_fitness_sale_v2`
- `mark_fitness_sale_paid`
- `mark_fitness_sale_delivered`
- `cancel_fitness_sale`
- `create_fitness_purchase_order_v2`
- `receive_fitness_purchase_item`
- `receive_fitness_purchase_order`

A V21 removeu INSERT/UPDATE/DELETE direto de `authenticated` nas tabelas base
Fitness.

## 5. Grants Test Lab

O mesmo padrão foi aplicado ao Test Lab.

O role `authenticated` mantém leitura direta sujeita a RLS, mas não pode
alterar diretamente as tabelas.

Mutações permanecem pelas RPCs restritas por `can_use_test_lab()`.

## 6. Validação pós-migration

Após a aplicação da V21, todas as 22 tabelas auditadas de Fitness + Test Lab
retornaram:

- SELECT: permitido para `authenticated`
- INSERT: negado
- UPDATE: negado
- DELETE: negado

As RPCs críticas verificadas continuam:

- `SECURITY DEFINER = true`
- owner = `postgres`
- EXECUTE para `authenticated = true`

## 7. Próxima camada recomendada

Auditar os grants diretos das tabelas de Suplementos e Bank para aplicar o
mesmo princípio onde for seguro:

- leitura direta quando necessária;
- escrita por RPC para operações que precisam preservar invariantes.
