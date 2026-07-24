# Candinho Company · V35
## CRM Company 360º + menu lateral recolhível + painel de estoque baixo/zerado

Base esperada:

`7c93178495ae38f099da33675d814d0b03f68f6d`

Mensagem:

`V34.1 · Corrige typecheck do pós-venda`

---

# 1. Menu lateral recolhível no desktop

Foi criado um controle semelhante ao comportamento do ChatGPT Desktop.

No computador:

- botão na borda do menu lateral;
- `Fechar menu lateral`;
- quando fechado, a área principal ocupa toda a largura;
- aparece um botão no canto esquerdo para `Abrir menu lateral`;
- o estado fica salvo no navegador;
- ao navegar entre telas, a preferência continua ativa.

No telefone:

- nada muda;
- o botão desktop fica completamente oculto;
- o menu móvel existente continua sendo a única navegação lateral.

A rota `/dashboard` de escolha de operação não mostra o botão de recolher.

Arquivos:

- `src/components/desktop-sidebar-controller.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/v35-ux.css`
- `src/app/globals.css`

Nenhuma alteração foi necessária no fluxo mobile existente.

---

# 2. Painel gerencial de produtos

A página:

`/produtos`

ganhou duas áreas gerenciais acima do catálogo.

## Estoque baixo

Critério:

- saldo disponível maior que zero;
- estoque mínimo configurado maior que zero;
- saldo disponível menor ou igual ao estoque mínimo.

Mostra:

- quantidade de produtos em atenção;
- produto;
- disponível;
- mínimo;
- acesso direto ao detalhe de estoque.

## Estoque zerado

Critério:

- saldo disponível menor ou igual a zero.

Mostra:

- quantidade de produtos zerados;
- produtos sem reposição;
- produtos zerados que já possuem unidades a caminho;
- acesso direto ao detalhe.

A lógica usa `available_quantity`.

Isso significa saldo realmente livre para nova venda, não apenas quantidade física bruta.

Fotografia do banco durante a implantação:

- 72 produtos monitorados
- 7 com estoque baixo
- 29 com estoque disponível zerado

Esses números são dinâmicos.

Usuário com perfil `sales` continua vendo apenas a consulta comercial e não recebe o painel gerencial.

Arquivos:

- `src/components/product-stock-health-panel.tsx`
- `src/app/(app)/produtos/page.tsx`

---

# 3. CRM Company 360º

A ficha:

`/clientes/[id]`

agora possui uma camada corporativa acima do CRM operacional existente.

Ela não substitui:

- ficha do cliente;
- Radar;
- interações;
- leads;
- vendas;
- pós-venda;
- consignações;
- trocas/devoluções.

Ela consolida tudo.

## Resumo Company

Mostra:

- valor histórico comprado na Company;
- ticket médio histórico observado;
- compras em Suplementos;
- valor comprado em Suplementos;
- compras em Fitness;
- valor comprado em Fitness;
- interações;
- leads.

## Acompanhamentos

Mostra:

- pós-vendas em aberto;
- total histórico de pós-vendas;
- trocas/devoluções em aberto;
- histórico de ocorrências;
- consignações em aberto;
- histórico de consignações;
- última compra Company.

## Linha do tempo

Consolida cronologicamente:

- vendas de Suplementos;
- leads de Suplementos;
- interações do CRM;
- pós-vendas;
- vendas Fitness;
- consignações Fitness;
- trocas;
- devoluções;
- garantias.

Cada evento mantém sua operação de origem.

Quando existe uma rota de detalhe, o item é clicável.

---

# 4. Identidade entre Suplementos e Fitness

A V35 NÃO mescla pessoas apenas pelo nome.

O vínculo entre cadastro de Suplementos e Fitness é somente de leitura e usa:

- telefone normalizado;
- mínimo de 8 dígitos.

Quando encontra correspondência, a ficha informa:

`Vínculo Fitness identificado`

O cadastro original de cada operação continua preservado.

Nenhuma tabela de clientes foi fundida.

Nenhum ID foi alterado.

---

# 5. Permissões

Nova RPC:

`customer_company_360_snapshot(uuid)`

Regras:

- exige acesso a Suplementos;
- informações Fitness só entram quando o usuário também possui acesso à Fitness;
- SECURITY DEFINER;
- `search_path=public`;
- authenticated EXECUTE=true;
- service_role EXECUTE=true;
- anon EXECUTE=false.

Migration aplicada diretamente no Supabase:

`20260720151723_v35_customer_company_360.sql`

---

# 6. Validação real da RPC

Foi testada com um cliente de Suplementos sem correspondência Fitness.

Resultado validado:

- 1 compra Suplementos
- R$ 64,90 em compras
- 3 leads
- 1 interação
- 1 pós-venda histórico
- 6 eventos na timeline

Também foi testada com uma identidade existente nas duas operações.

Resultado validado:

- 3 compras Suplementos
- 1 compra Fitness
- R$ 169,70 em Suplementos
- R$ 14,90 em Fitness
- R$ 184,60 consolidado
- 1 identidade Fitness encontrada
- 4 eventos na timeline

Os testes apenas leram os dados.

Nenhum histórico foi alterado.

---

# 7. Segurança e escopo

Não foram alterados:

- `central-meta-send`
- `central-meta-webhook`
- Marketing
- Inbox pausado
- Bank
- fluxo de consignação
- fluxo de trocas/devoluções
- fluxo de pós-venda Nexus
- estoque
- vendas

A V35 adiciona leitura gerencial e UX.

---

# 8. Validação TypeScript

Arquivos TS/TSX novos ou substituídos no pacote:

6

Validação executada com TypeScript `transpileModule`.

Erros sintáticos:

`0`

O build completo da aplicação deve ser confirmado pelo deployment Vercel após o commit.

---

# Commit sugerido

`V35 · CRM Company 360, menu recolhível e alertas de estoque`
