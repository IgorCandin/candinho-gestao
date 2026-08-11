# V45.21 · Operação de compras + custos + Nexus útil + entrada Suplementos

## O que este pacote faz

### Produtos
- Produtos fica literalmente para catálogo/cadastro.
- Remove o botão "Área Gerencial".
- A URL antiga `/produtos/gerencial` redireciona para a gestão dentro de
  Estoque e compras.

### Estoque e compras
- Incorpora, sem duplicar lógica, a antiga área gerencial:
  - giro/categoria de vendas;
  - qualidade do cadastro;
  - fotos;
  - pendências úteis;
  - indicadores gerenciais.

### Custos
- O detalhe interno do produto volta a mostrar:
  - custo cadastrado;
  - último custo de compra;
  - data da última compra;
  - diferença;
  - margem bruta atual.
- Nova venda ganha "Último custo".
- Novo pedido ganha "Último custo" e comparação com o custo que está sendo
  digitado.
- A migration recupera custos reais dos pedidos antigos e mantém o campo
  atualizado nos pedidos futuros.

### Planejar pedido
A tela deixa de ser "fornecedor primeiro".

Nova ordem mental:
1. demanda;
2. giro;
3. ruptura/backlog;
4. produtos agrupados por marca;
5. comparar último custo;
6. selecionar o que faz sentido;
7. só então escolher fornecedor.

Busca por "DARK LAB", "Growth", categoria ou produto mostra os itens juntos.
A aba Fornecedores vira memória/histórico, não origem obrigatória do pedido.

### Nexus Agora
Faturas/cobranças Bank de valor zero deixam de ocupar as cinco próximas ações.
Dívida real com saldo positivo continua válida mesmo se não houver parcela fixa.

### Nexus Aprendizado
`page_view` deixa de significar uso.

Agora o ranking de uso conta interação significativa feita a partir da tela:
- `navigation_click`;
- `action_click`.

Homes/gateways automáticos são excluídos do ranking de uso.

### Entrada premium · Suplementos desktop
- `/suplementos` vira uma entrada visual no PC;
- sem menu lateral;
- logo central;
- todos os módulos no menu inferior;
- ao clicar, botões descem e logo esmaece;
- a tela seguinte entra com sidebar animada;
- o "Hoje" atual é preservado em `/suplementos/hoje`;
- no telefone, `/suplementos` redireciona direto para `/suplementos/hoje`.
  O mobile não é redesenhado nesta versão.

## Banco
Inclui uma migration corretiva.
**Não rode SQL manualmente.**
Depois do push, validar Vercel primeiro e só então aplicar a migration no
Supabase oficial.

## Auditoria
O arquivo `AUDITORIA_V45_21_ERP.md` contém os achados de dados/cadastro.

## Commit sugerido
`V45.21 - integra compras, custos e Nexus operacional`
