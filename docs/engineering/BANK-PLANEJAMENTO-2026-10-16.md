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
- TypeScript e lint direcionado aprovados. Build local compilou e terminou TypeScript, depois parou no prerender de /catalogo por falta da configuração Supabase neste ambiente. Nenhuma credencial privilegiada foi utilizada.
- Branch codex/bank-month-planner, commit de implementação 6976f80. PR #26 aberto como rascunho: https://github.com/IgorCandin/candinho-gestao/pull/26 . Preview READY confirmado para esse commit: https://candinho-gestao-h9p6xx3u4-candinho.vercel.app/bank/mobile . Produção não alterada.
- Homologação visual/mobile/desktop bloqueada: o navegador de teste não conseguiu anexar a aba da prévia em duas tentativas. Não confundir build READY com navegação real validada. Pagamento/adiamento real não executado.

## Roteiro de homologação

### Conferência e refinamento após login

- Logos enviadas pelo responsável: BB, BRB, Caixa (anexo duplicado usado uma vez), Mercado Pago, Neon, Nubank e Sicoob copiadas sem modificar para public/bank-*-user.png. Shopee segue com iniciais porque não foi enviada logo correspondente. Paleta secundária em bank-card-brand.ts, em fundos escuros para manter legibilidade.
- Efeito dos cartões inspirado diretamente em CompanyActionGrid e company-v2.css: expansão 1.035, inclinação por posição do mouse, brilho radial e arco expansível. Não atua durante arraste/toque; prefers-reduced-motion desativa transformações/transições. Nenhuma alteração de cálculo ou banco nesta etapa.

- Prévia 7156a2c navegada com autenticação: outubro/novembro, simulador 500, filtros Sicoob CPF/CNPJ/Giulia, Todos, setas e detalhes/fechar/Escape conferidos. Dimensões 390x844 e 1366x768 sem overflow horizontal da página; nenhum erro de console observado. Sem testar pagamentos/adiamentos mutantes.
- Totais efetivos: outubro 2.231,58 e novembro 7.819,41. Diferença de 200/400 em relação à tabela corresponde às semanas da psicóloga já cadastradas, preservadas.
- Refinamento solicitado: Planejamento substitui Nexus no cabeçalho/rodapé Bank; rota Nexus continua existente. Cards com arraste por mouse (limiar de movimento evita selecionar após arrastar), toque nativo e setas por largura de cartão. Logos em moldura uniforme, sem distorção e sem arraste da imagem. Estas mudanças ficam no mesmo PR, não em produção.

1. Abrir planejamento em desktop e celular, alternar meses. Conferir saldos atuais e reserva exclusivamente no mês de destino.
2. Expandir entradas: depósito ainda pendente, salários antecipados não repetidos e diferenças explicitamente a conferir.
3. Selecionar cada Sicoob: lista deve conter só a fatura daquele ID/titular; Todas as contas restaura cronologia completa. Testar setas/toque.
4. Informar 500 e 1.200,50 no simulador; atualizar página não deve criar lançamento nem guardar simulação.
5. Abrir detalhes, fechar com Escape e no botão, conferir rolagem. Seguir edição/adiar sem salvar na prévia ligada ao banco real.
6. Pagar/adiar e conferir recálculo apenas em ambiente isolado ou no compromisso real escolhido pelo responsável. Prévia pode usar o banco de produção: não é sandbox financeiro.
