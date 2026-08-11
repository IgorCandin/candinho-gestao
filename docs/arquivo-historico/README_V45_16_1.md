# V45.16.1 · Limpeza física final do Bank 2.0 Lab

Este pacote **não adiciona funcionalidade**. Ele apenas remove código morto do laboratório já aposentado.

## O que remove

- item `Bank 2.0 Lab` do menu lateral;
- import `FlaskConical` que existia só para esse item no AppShell;
- card `Bank 2.0 — laboratório` em `/bank/organizar`;
- rota inteira `src/app/(app)/bank-lab`;
- CSS temporário `v45-16-remove-bank-lab.css`;
- import desse CSS em `globals.css`;
- README temporário da V45.16.

## O que NÃO remove

- `/bank` oficial;
- qualquer tela oficial do Bank;
- notinhas, empréstimos, faturas, contas, projeções ou compromissos;
- migrations antigas do Bank Lab.

As migrations antigas permanecem no Git porque registram o histórico do banco.
A migration posterior de remoção já é a responsável por desfazer aquelas estruturas.

## Como aplicar

1. Confirme no GitHub Desktop:
   - branch `main`;
   - `0 changed files`.
2. Extraia este ZIP na raiz do repositório.
3. Dê duplo clique em:
   `APLICAR_V45_16_1.bat`
4. A janela precisa terminar com:
   `OK - Bank 2.0 Lab removido do codigo ativo.`
5. Volte ao GitHub Desktop.
6. Confira as alterações e deleções.
7. Os dois arquivos `APLICAR_V45_16_1.*` e este README são apenas ferramentas de aplicação:
   você pode apagá-los antes do commit para não entrarem no repositório.

Commit sugerido:

`V45.16.1 - remove codigo morto do Bank 2.0 Lab`

## Branch antiga de importação

`agent/prepara-importacao-appsheet` não possui commits exclusivos em relação à main.
Ela pode ser excluída no GitHub Desktop depois da limpeza.
