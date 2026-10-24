# Company — cadastrar cliente sem abandonar lead, 24/10/2026

## Menor ajuste independente

Na criação de lead Company, `Cadastrar cliente em outra aba` abre a rota Company existente com `target=_blank` e `rel=noopener noreferrer`. A aba original permanece com o rascunho em memória. Depois de cadastrar, o responsável volta à aba original e usa `Atualizar lista de clientes`; a ação é `type=button` e chama somente `router.refresh()`.

O seletor usa as opções atualizadas do mesmo servidor e a escolha continua manual. Não há autoassociação por telefone, nova API, popup com acesso ao opener, BroadcastChannel, storage, salvamento antecipado de lead ou alteração da criação do cliente. Cadastro legado mantém seu link/destino e não recebe estes controles.

O contrato do Next preserva estado cliente não afetado ao mesclar o payload atualizado: [useRouter / refresh](https://nextjs.org/docs/app/api-reference/functions/use-router). Nesta aplicação, `CompanyNewLeadPage` compõe o mesmo formulário sem key, a consulta de opções não declara cache persistente e o efeito de sabores/combos não reinicia os campos ao mudar as props de clientes.

## Verificação

- Três testes reproduziram ausência do link em nova aba e do refresh antes da correção; passam após. Cobrem Company/legado, atributos de segurança, botão sem submit e preservação dos estados de produto/sabor ou combo/sabores, cliente, status, observações e data após novas props.
- Componente real hidratado e CSS completo em Chromium 320/390/1366 px, nos modos produto e combo: atualização simulada de props adiciona nova opção sem perder os campos; seleção não muda automaticamente. Zero erros JS/hidratação e nenhum overflow horizontal.
- TypeScript incremental, lint direcionado e diff-check aprovados. Build e suíte completa por SHA final devem ser registrados no PR/Trello antes da publicação.
- Sem cadastro/lead ou outro registro real gravado. A fixture não simula o transporte RSC completo de um servidor Next; a publicação ainda exige seu build e smoke técnico oficial.

## Limite explícito na interface

A aba original precisa continuar aberta. Fechar ou recarregar descarta o rascunho; não foi criada persistência durável. Retorno é feito pela troca de abas do navegador, não por redirect automático. Isso fecha apenas o abandono acidental durante cadastro, não toda a paridade de leads nem recuperação após encerramento do navegador.

Rollback: reverter o PR de interface. Nenhuma migration, permissão, regra comercial, credencial ou dado existente é alterado.
