# Fechamento mobile — 19/10/2026

## Limite da entrega

Fechar o acabamento dos fluxos existentes, sem transformar o roteiro inteiro de evolução em requisito mobile. Não remover funções, rotas antigas ou histórico; não alterar negócios ou dados reais.

O mapa agora prioriza dez conferências já existentes, em cinco grupos: menus/janelas; novas vendas Suplementos/Fitness; conclusão; estoque/consignações; Bank. Os identificadores, notas e aprovações são reutilizados. O roteiro completo permanece em uma seção recolhida; itens aprovados continuam acessíveis pelo histórico. Falha ao carregar aprovações aparece explicitamente, sem simular perda de progresso.

## Correção deste lote

Menus de conta Company/Bank/Atletas usam `company-account-menu`, mas não participavam do guard de fechamento externo. O seletor agora inclui esses menus: primeiro toque externo fecha sem acionar o que está atrás; Escape devolve o foco ao summary do menu que continha o foco. Escape já tratado por outro controle é preservado. Sem alteração de links ou logout.

## O que ainda impede afirmar homologação total

- Safari físico: teclado, último controle após rolagem, zoom, fechamento/volta, nos cinco grupos. Conferências já aprovadas não precisam recomeçar sem regressão.
- Ações de escrita: somente em operação real desejada pelo responsável ou base isolada. As prévias também usam banco real; não criar operações fictícias.
- Doctor: 418/Load failed antigos sem reprodução conclusiva; contexto adicional entregue no PR #62. Não apagar sinais nem chamar ausência de reprodução de correção. Investigar nova ocorrência com contexto; falha efetiva de fluxo permanece bloqueadora.
- Consignação histórica de Francyelle: depende da confirmação das peças vendidas antes de qualquer correção de dados; não é ajuste de layout.

## Fora do fechamento mobile

Desativar ERPs antigos, ampliar prontuário Atletas, Twilio/e-mail, metas futuras, orçamento financeiro além do horizonte disponível, notas compartilhadas e refatoração de duplicidades. Continuam no roteiro; não foram cancelados nem considerados concluídos.

## Validação

Testes adicionados: fechamento externo/Escape/foco/limpeza do guard; dez chaves únicas reaproveitadas; notas/aprovações intactas; roteiro completo preservado; erro explícito de carregamento. Executados: 119 testes na suíte e seis adicionais do verificador; quatro skills com fontes fixadas verificadas. Fixture do mapa/guard reais em 320x568, 390x844, 844x390 e 1366x600 sem overflow recolhido/expandido, sem erros JS, com Escape/foco/toque externo conferidos. Não houve acesso ao banco real. Lint e build/TypeScript são gates separados antes da publicação; não presumir aprovação por este relatório.
