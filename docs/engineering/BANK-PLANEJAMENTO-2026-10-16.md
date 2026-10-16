# Bank — planejamento mensal

## Escopo e fontes

- Rotas: `/bank/mobile` e `/bank/planejamento`; acesso pela Home Bank, cartão Planejamento do mês. Visão completa permanece em `/bank`.
- Estado relido em 16/10/2026 no Supabase ilboydbakpcfoaexpnhw. Auditoria 3373 / confirmed_table_2026_10_15 confirmada. Nenhuma importação ou mutação financeira executada.
- Implementação anterior /workspace/candinho-gestao, commit f5d9e4d e prévia HTML não disponíveis neste ambiente Windows. Implementação feita a partir da especificação, sobre origin/main 0ba17e4.
- Compromissos vêm de getBankMonthHomeDataV2: preserva ajustes mensais, exclusões de pagos, recorrências, empréstimos com data real e deduplicação de cobranças/faturas. Não repetir as despesas de cartão já incluídas na fatura.

## Regras de cálculo

- Valores em centavos; simulador puro, sem chamada de gravação.
- Disponível atual = saldos cadastrados menos reservas futuras que estejam nesses saldos, mais reservas externas destinadas ao mês atual.
- Próximo mês = reserva destinada ao próprio mês. Não há transporte automático de sobra projetada.
- Reserva existente 9c617ae2-23e6-468a-b8ba-51a5f070bed2 está explicitamente fora dos saldos conforme reconciliação. Seu valor e status são relidos do banco, não fixados em R$ 2.900 no cálculo.
- Metadados da auditoria: em novembro/2026, R$ 1.800 de Salário Giulia e R$ 1.100 de Salário Igor já foram adiantados. Não são lançados de novo; são abatidos apenas das previsões das fontes existentes. Estes identificadores são vínculos da reconciliação, não novos recebimentos. Alterações posteriores dessa distribuição exigem nova conferência; diferença de R$ 80 não entra na conta.
- Recebimentos registrados são exibidos informativamente, nunca adicionados ao saldo novamente. Entradas pendentes, inclusive transferência de R$ 500, ficam a conferir e entram apenas no cenário projetado.
- Recebíveis Suplementos usam cronograma de parcelas e saldo restante; sem data explícita ou vencidos permanecem no mês atual, sem duplicação no próximo. Fitness usa vendas pendentes e sua data de vencimento; não altera regra de recebimento existente.
- Reservas futuras novas são consideradas dentro das contas por padrão conservador; reservas externas adicionais precisam de classificação explícita, não inferência de texto livre.
- Resumo/simulador são globais; seleção de cartão filtra só a lista. Cartão é identificado pelo ID, nunca apenas pelo banco, mantendo titular e CPF/CNPJ no nome existente.

## Ações e visual

- Reutiliza BankPaidForm e ações existentes; após pagar em mobile retorna ao mês informado. Detalhes em dialog nativo (Escape/foco), rolagem limitada à altura visível. Abrir/editar/adiar mantém telas existentes.
- Carrossel com scroll nativo por toque e setas. Sem cadastro de bancos ou alteração de titularidade.
- Logo Sicoob obtido do próprio site oficial em 16/10/2026: https://www.sicoob.com.br/documents/20128/1144635/LOGO-SICOOB-Pura-pos.png/855a0660-db5b-bc04-5602-893b90a87365?t=1576538144644 . Asset local public/bank-sicoob.png. Demais bancos: iniciais, sem serviços externos de logo nem divulgação de dados financeiros.

## Verificação

- Nove testes automatizados de cálculo e montagem aprovados (`node --test tests/bank-planning*.test.cjs`). Incluem isolamento de reservas, adiantamentos, transferência pendente, pureza, identidade dos cartões, permissão e erro de banco.
- Não testar pagar/adiar com dados reais: conferir telas sem salvar; mutações reais ficam para homologação autorizada em caso identificado.
- Build, tipos, lint e prévia: registrar resultado final no PR. Build local sem variáveis Supabase pode parar no prerender de /catalogo; não usar credencial privilegiada para contornar.

## Roteiro de homologação

1. Abrir planejamento em desktop e celular, alternar meses. Conferir saldos atuais e reserva exclusivamente no mês de destino.
2. Expandir entradas: depósito ainda pendente, salários antecipados não repetidos e diferenças explicitamente a conferir.
3. Selecionar cada Sicoob: lista deve conter só a fatura daquele ID/titular; Todas as contas restaura cronologia completa. Testar setas/toque.
4. Informar 500 e 1.200,50 no simulador; atualizar página não deve criar lançamento nem guardar simulação.
5. Abrir detalhes, fechar com Escape e no botão, conferir rolagem. Seguir edição/adiar sem salvar na prévia ligada ao banco real.
6. Pagar/adiar e conferir recálculo apenas em ambiente isolado ou no compromisso real escolhido pelo responsável. Prévia pode usar o banco de produção: não é sandbox financeiro.
