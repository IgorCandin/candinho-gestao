# V45.15 · Comercial mais fluido

Pacote para aplicar sobre a V45.14.3.

## Deploy anterior

A V45.14.3 foi verificada antes deste pacote:
- produção READY;
- `candinho.duckdns.org` apontando para o deploy;
- nenhum erro/fatal de runtime nos 30 minutos consultados.

## Suplementos · Novo orçamento

### Antes
A página já perguntava:
- Apenas orçamento
- Orçamento confirmado

e a mesma decisão também existia no modal de salvar.

### Agora

A página fica focada em montar a proposta:
1. cliente;
2. produtos;
3. ajustes/brinde;
4. observações;
5. subtotal/total;
6. Salvar orçamento.

Não aparece escolha de estado da negociação antes do clique em salvar.

### Depois de Salvar orçamento

Etapa 1:
- Apenas orçamento
- Orçamento confirmado

#### Apenas orçamento
Salva a proposta e abre o popup:
- Abrir PDF
- Continuar sem PDF

#### Orçamento confirmado
NÃO confirma imediatamente.

Abre uma segunda etapa com:
- Pagamento
  - A receber
  - Pago
  - Pagamento combinado
  - Pagamento dividido
  - forma de pagamento / datas / parcelas conforme a opção
- Entrega
  - já entregue
  - data da entrega ou entrega prevista
- Pós-venda
  - Data automática
  - Agendar pós-venda
- Parceria (preservada como opção complementar)
- Subtotal
- Total final
- Quantidade de itens

Rodapé:
- Voltar
- Confirmar venda

Depois de confirmar a venda, o fluxo vai direto para a venda criada.
O popup de PDF fica no caminho "Apenas orçamento", conforme solicitado.

### Segurança da mudança
A V45.15 reaproveita os mesmos inputs React e as mesmas funções/RPCs já
existentes. Ela reorganiza quando esses controles aparecem, sem duplicar
regra de estoque, pagamento ou pós-venda.

O antigo `BudgetSaveDedupUX` continua no repositório por histórico, porém
deixa de ser montado no ERP.

## Fitness · Nova venda

### Cliente
O seletor próprio do Fitness foi trocado visualmente pelo mesmo padrão de
combobox usado no comercial de Suplementos:
- busca por nome;
- cidade;
- telefone;
- lista compacta;
- cliente selecionado claramente;
- opção Novo cliente dentro da própria busca.

Quando um cliente existente é selecionado, Nome/Telefone/Instagram/Cidade/
Origem continuam preenchidos por trás, mas deixam de ocupar a tela.
Fica visível apenas a seleção do cliente e a data da venda.

Se escolher Novo cliente, os campos voltam a aparecer para cadastro.

### Produtos
A seção passa de "Itens" para "Produtos" e recebe linguagem mais próxima
do fluxo de Suplementos.

A lógica de tamanho/cor/variante e disponibilidade não foi alterada.

### Pagamento
O dropdown "Situação" deixa de ser a ação principal visual e vira cartões:
- A receber
- Pago
- Pagamento combinado

O select original permanece como fonte de verdade por trás, então o RPC e
as regras atuais do Fitness continuam intactos.

## Banco

Nenhuma migration nova.

## Commit sugerido

`V45.15 - simplifica venda Fitness e corrige fluxo de confirmacao do orcamento`
