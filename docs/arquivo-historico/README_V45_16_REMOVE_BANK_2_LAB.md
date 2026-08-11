# V45.16 · Aposenta Bank 2.0 Lab

Objetivo: parar a frente experimental do Bank sem desfazer o Bank oficial.

## O que muda

- `Bank 2.0 Lab` deixa de aparecer na navegação;
- acessar `/bank-lab` redireciona para `/bank`;
- as tabelas e a RPC isoladas do laboratório foram removidas do Supabase;
- nenhuma tabela oficial do Bank foi alterada por esta limpeza.

## Banco

Antes da remoção foi confirmado:
- 3 titulares de seed;
- 12 contas de seed;
- 0 imports;
- 0 movimentações.

Portanto não havia extrato real nem transação real armazenada no laboratório.

Migration:
`20260810160709_remove_bank_2_lab.sql`

Ela já foi aplicada no Supabase oficial.

## O que NÃO foi revertido

Mantivemos o Bank normal como está hoje:
- notinhas;
- empréstimos;
- vencimentos;
- projeções;
- compromissos;
- ajustes que já fazem parte da operação oficial.

A ideia é reduzir complexidade, não voltar funcionalidades úteis.

## Branch

A branch remota `codex/bank-2-laboratorio` pode ser apagada depois deste
cleanup. Isso não é necessário para o funcionamento do site, mas encerra o
laboratório de vez no GitHub.

## Commit sugerido

`V45.16 - aposenta Bank 2.0 Lab e mantém Bank oficial`
