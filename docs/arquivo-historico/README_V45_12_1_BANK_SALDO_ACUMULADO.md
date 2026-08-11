# V45.12.1 · Bank — saldo acumulado por vencimento

Hotfix da projeção diária do Bank.

## Correção
Antes, cada grupo de vencimento era comparado isoladamente com o saldo atual.

Agora o saldo é carregado de um grupo para o próximo:

Saldo atual
→ menos vencimentos de 10/08
→ saldo projetado para 15/08
→ menos vencimentos de 15/08
→ saldo projetado para o próximo dia

Exemplo:
- Saldo atual: R$ 1.200
- 10/08: R$ 360 → sobra R$ 840
- 15/08: parte de R$ 840, não de R$ 1.200

## Escopo
A projeção acumulada é aplicada somente ao painel de vencimentos com data fixa.
Pendências sem dia fixo não são descontadas silenciosamente da linha do tempo.
