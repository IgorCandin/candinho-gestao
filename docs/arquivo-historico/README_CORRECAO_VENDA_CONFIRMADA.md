# Correção de venda já confirmada

Nova rota: `/vendas/[id]/corrigir`

Na tela da venda aparece **Corrigir venda**.

Permite adicionar um produto esquecido sem cancelar a venda:
- busca em ordem alfabética;
- produto com estoque aparece em verde;
- zerado continua visível em cinza;
- escolhe sabor, quantidade e preço;
- preço promocional ativo é usado como padrão;
- registra motivo da correção.

Se a venda já foi entregue, o novo item baixa o estoque imediatamente.
Se ainda não foi entregue, cria reserva/aguarda reposição.

A correção também:
- recalcula faturamento, custo e lucro;
- aumenta automaticamente o saldo a receber;
- sincroniza o orçamento confirmado;
- atualiza o PDF;
- registra auditoria.

Proteções:
- não altera venda cancelada;
- não altera se já existe pagamento recebido;
- não altera se existe parcelamento explícito nesta primeira versão.

A migration já foi aplicada no Supabase de produção.

Aplicação:
Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:
`feat: permite corrigir venda confirmada adicionando produto esquecido`
