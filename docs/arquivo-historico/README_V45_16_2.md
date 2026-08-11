# V45.16.2 — Reparo da limpeza Bank 2.0 Lab

Use este pacote porque a V45.16.1 parou no passo de remover o card
`Bank 2.0 — laboratório` de `/bank/organizar`.

## Importante

Sua pasta está parcialmente alterada pela tentativa anterior.
**Não reverta e não faça commit antes de rodar este reparo.**

## Como usar

1. Extraia este ZIP na raiz do projeto.
2. Dê dois cliques em `APLICAR_V45_16_2.bat`.
3. O script continua de onde a tentativa anterior parou.
4. No final precisa aparecer:

`OK - Bank 2.0 Lab removido do codigo ativo.`

5. Volte ao GitHub Desktop.
6. Mande um print da aba Changes antes de commitar.

## O que ele faz

- remove referência residual no AppShell;
- remove o card do Bank Lab em `/bank/organizar`;
- remove o CSS temporário da V45.16;
- remove a rota `/bank-lab`;
- remove o README temporário antigo;
- valida que não sobrou `/bank-lab` em nenhum arquivo de `src`.

Não mexe no Bank oficial e não apaga migrations antigas.
