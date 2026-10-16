# Escritório de operações — primeira versão

Rota: `/company/escritorio`; atalho no início da Company. Referência visual indicada pelo responsável: https://habblaude.com/pt/. Artes próprias construídas em CSS; nenhum código/arte do Habblaude copiado e nenhuma dependência/serviço novo.

Direção: planta de salas, fundo #151f29, paredes #35434c, texto #eef3f8, avisos #f0cd90; tipografia existente. Salas em duas colunas no desktop e uma no telefone. Personagens imóveis, sem ruído ou animação automática. Links e títulos continuam sendo a informação principal, acessível por teclado.

## Dados e segurança

- Validação de acesso antes das consultas; parceiros e inativos não acessam. Cada operação é consultada somente se autorizada. Cliente Supabase da sessão, sem chave administrativa.
- Company: contagem exata de cadastros Suplementos ativos e Fitness sem telefone nulo/vazio. Separados, pois vínculos entre operações poderiam duplicar pessoas. Não identifica números inválidos nem apenas espaços.
- Vendas: contagem exata por operação, excluindo canceladas; Suplementos apenas record_type=sale, status de entrega diferente de entregue. Contagem de vendas, não unidades ou reservas.
- Bank: usa o carregador existente V2 para vencidos/hoje/próximos do mês atual. Não é levantamento de toda dívida histórica.
- Falha = indisponível; não apresentar zero fictício. Nenhum nome, telefone, valor financeiro ou lista completa de clientes é transmitido pela nova tela.
- Somente leitura, sem migration ou alterações financeiras. Dados consultados ao abrir/atualizar, sem promessa de tempo real.

## Limites e próximos passos

Personagem representa fila, não IA em execução. Reposição e notas compartilhadas continuam pendentes; não armazenar notas apenas neste navegador como se fossem compartilhadas. Links abrem filas existentes, não filtro exato por telefone faltante. Uma próxima etapa pode detalhar a lista de cadastros com o filtro e permissão correspondentes.

## Teste

Conferir salas de acordo com permissão, comparar contadores com filas, abrir links, teclado e celular. Testar consulta falha (indisponível), fila vazia (zero) e ausência de uma operação. Nenhum pagamento/venda deve ser criado para testar a navegação. Verificações estáticas não substituem homologação visual e de contadores reais.
