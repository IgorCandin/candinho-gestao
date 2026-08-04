CANDINHO BANK V39.3 — NOTINHAS FORA DA PROJEÇÃO

COMO APLICAR
1. Extraia este ZIP diretamente na raiz do projeto candinho-gestao.
2. Aceite substituir os arquivos.
3. Abra o GitHub Desktop.
4. Commit sugerido:
   V39.3 - separa notinhas da projeção do Bank
5. Push origin.

NÃO PRECISA
- Supabase SQL
- db push
- terminal
- migration

O QUE MUDA
- Notinhas deixam de entrar em:
  * Projeção confirmada até o fim do mês
  * A pagar até o fim do mês
  * Vencimentos/pendências obrigatórias do Home
- Empréstimos normais continuam entrando normalmente.
- Surge um novo balão "Notinhas pendentes" com o saldo total aberto.
- O balão deixa claro que as notinhas ficam fora da projeção e são pagas quando houver sobra.
- Mantém junto as correções V39.2 de menu mobile uniforme + reload global.
