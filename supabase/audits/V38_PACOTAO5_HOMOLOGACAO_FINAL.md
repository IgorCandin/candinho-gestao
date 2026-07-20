# V38 · Pacotão 5 · Homologação final

## UX da sidebar
- UX original preservado.
- Nenhum item do menu é escondido ou compactado.
- Em janelas baixas, a sidebar inteira passa a rolar.
- O nav deixa de criar uma segunda rolagem interna.
- Botão de reabrir fica no rodapé da faixa lateral quando o menu está fechado.
- Botão de recolher permanece ao lado de Sair quando aberto.

## Bank e Sala do Dono
A projeção de lucro de Suplementos foi alinhada à base comercial oficial.

Regra antiga:
- vendas brutas por `quoted_at`;
- podia divergir do conceito oficial de venda entregue;
- podia incorporar registros internos como Brinde/Igor em algumas leituras de recebíveis.

Regra nova:
- `commercial_sales`;
- lucro por mês de `delivered_at`;
- exclusão consistente de `Igor Candinho` e `Brinde`;
- calendário `America/Sao_Paulo`.

Fotografia validada na homologação:
- Abril/2026: R$ 805,81 de lucro comercial entregue.
- Maio/2026: R$ 1.767,26.
- Junho/2026: R$ 1.207,02.
- Média mensal: R$ 1.260,03.
- Fator de projeção: 70%.
- Nova projeção mensal: R$ 882,02.

A regra anterior produziria aproximadamente R$ 916,20/mês.

## Integridade
Nova varredura confirmou 0 ocorrências em:
- estoque negativo Suplementos;
- reserva Suplementos acima do físico;
- estoque negativo Fitness;
- reserva Fitness acima do físico;
- venda ativa Suplementos sem itens;
- venda ativa Fitness sem itens;
- venda cancelada com reserva ativa;
- venda entregue com reserva ativa;
- consignação Fitness com quantidade liquidada acima da enviada;
- devolução com quantidade reestocada acima da recebida;
- saldo de sabor negativo;
- cobrança Bank marcada como paga com valor inconsistente;
- recebível Bank marcado como recebido com valor inconsistente.

## Produção
Na janela verificada antes da geração do pacote:
- nenhum erro de runtime novo foi encontrado na Vercel.

## Banco
Migration aplicada diretamente no Supabase:
`20260720222750_v38_homologacao_bank_projecoes_base_comercial.sql`

O arquivo está neste pacote para manter o repositório sincronizado.
