# V45.13.2 · Orçamento sem confirmação duplicada

## Problema
No orçamento novo a decisão já era feita no final da página:
- Apenas orçamento
- Orçamento confirmado

Depois, ao clicar em Salvar orçamento, o modal nativo perguntava a mesma
coisa novamente.

## Correção
Para orçamento novo:
- a escolha feita na página é a fonte de verdade;
- clicar em Salvar orçamento executa diretamente essa escolha;
- o modal redundante não aparece.

Para orçamento já salvo/revisão:
- como não existe o seletor da negociação, o modal nativo continua
  disponível como fallback.

O popup posterior de sucesso/PDF continua existindo porque é uma etapa
diferente e útil.

## Radar
Também inclui a migration da V45.13.1 já aplicada em produção, apenas
para manter o repositório sincronizado com o Supabase.

## Commit sugerido
`V45.13.2 - remove confirmacao duplicada do orcamento e registra fix do Radar`
