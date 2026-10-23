# Gestão — navegação por tarefa

Cartão: https://trello.com/c/enKmbXUn . Base main1546f82; branch independente de #66 e #67. Nenhuma regra, consulta, RPC, dado ou permissão alterada. Não desativar ERP antigo.

## Antes / depois

Antes: filtro inicial Dia a dia escondia Resultados; funções repartidas por operação em vários cartões grandes, repetindo o cabeçalho. Depois: Resultados / Lucro mensal e Agenda são os primeiros acessos; todas as categorias começam disponíveis, sem filtro inicial ocultando ferramentas. Diretório compacto por tarefa; duplicatas do cabeçalho em disclosure, abertas automaticamente quando a busca as encontra. Filtro de categoria opcional e recolhido. Não foi criado outro gráfico: o destino é `/company/resultados`, com contexto de operação quando selecionado.

Paleta e tipografia preservam a Company: fundos #080d12/#0d1822, destaque sóbrio #14212b, texto #edf5fa, secundário #b3c7d4 e foco #a1dcff. Listas compactas em duas colunas no computador, uma no celular; sem animação adicional, fontes externas ou dependências. A revisão visual reduziu a grade de cartões repetidos a grupos de links, mantendo identificação de Suplementos/Fitness.

## Inventário preservado

14 destinos compartilhados e seis por operação, mais dois exclusivos Fitness, antes dos gates. A organização abaixo não muda os endereços nem a autorização existente.

| Grupo | Destinos |
| --- | --- |
| Principal | `#agenda-gestao`; `/company/resultados` e variantes `?operacao=suplementos` / `fitness` |
| Atendimento e organização | `/company/escritorio`, `/company/rotas`, `/company/ferramentas`; Fitness: `/company/fitness/consignacoes`, `/company/fitness/oportunidades` |
| Cadastros e estoque | `/company/fornecedores`, `/company/gestao/etiquetas`, `/company/orcamentos`, `/company/estoque?operacao=supplements` / `fitness` |
| Finanças e parceiros | `/company/parceiros/gerencial`, `/company/central`, `/bank`, `/bank/planejamento`, `/company/custos-insumos?operacao=supplements` / `fitness` |
| Sistema e qualidade | `/company/atalhos`, `/company/mapa`, `/company/qualidade` |
| Já no cabeçalho, acesso compacto | `/company/concluir`, `/company/acompanhar`, `/company/produtos`, cada qual com `?operacao=Suplementos` / `Fitness` |

Cada rota segue disponível em até duas interações, respeitando o escopo. Banco condicionado a canAccessBank; custos condicionados à escrita da operação; parceiros Suplementos condicionados ao acesso Suplementos. Resultados usam operações acessíveis e o mesmo gate servidor já existente; não foi criado privilégio financeiro novo. Sem operação acessível, o destaque de resultados não é exibido. Agenda/Google Calendar/arrastar compromissos e permissões continuam nos mesmos filhos do servidor. Investimento mensal mantém o filtro/contexto original. O cabeçalho global não foi alterado.

## Evidências

- Dois novos testes falharam antes: ausência do destino canônico e rotas escondidas pelo filtro inicial. Após mudança, seis testes do módulo aprovados, incluindo escopo, Bank, escrita, investimento, busca e limpeza. O teste anterior de limpar para Dia a dia foi atualizado para o novo default explícito Tudo; demais comportamentos preservados.
- ESLint do componente sem diagnósticos; git diff check limpo. Não equivale a lint global limpo.
- Componente real hidratado com CSS do projeto e dados fictícios, Chromium isolado 320x568, 390x844, 414x896 e 1366x768: destino de lucro, Tab/foco, seleção Fitness, busca que expande atalhos, limpeza, vazio e âncora agenda aprovados. Sem overflow horizontal, erro JS ou erro recuperável de hidratação. Requisições externas bloqueadas. Screenshots revisadas em 390 e 1366.
- Fixture não certifica Safari físico nem página Next autenticada completa: investimento e agenda foram substituídos por conteúdo fictício; navegação confere href/âncora, não executa ações financeiras. Produção permanece inalterada. Build/TypeScript remoto e link do preview devem ser registrados pelo SHA no Trello antes de declarar publicação.

## Teste do responsável (curto, quando disponível)

No preview, entrar em `/company/gestao`; Resultados / Lucro mensal deve abrir o gráfico em um clique. Voltar, conferir Agenda e buscar fornecedor/estoque. Selecionar Fitness/Suplementos e expandir acessos do cabeçalho se necessário. No iPhone verificar teclado, rolagem e toque. Não cadastrar, pagar, arrastar compromissos ou editar registros reais para homologar esta navegação. Homologação e autorização de integração são pendências separadas; PR não é produção.

## Checkpoint da sessão sob demanda

Sessão Work real consultou Trello/GitHub, confirmou #66/#67 inalterados, estacionou login do #66 e executou este objetivo independente com código, testes e progresso versionado. Não é controlador que inicia outras execuções. Diagnóstico do #67 atualizado no cartão existente https://trello.com/c/GCR0HEnM : canário sandbox read-only direto funcionou sem modelo; --ignore-user-config descarta configuração Windows elevada existente, mas streams antigos não preservados impedem provar causa exata da recusa. Nenhum novo codex exec custoso, bypass ou serviço pago.

Cloud: `codex cloud list --limit 1 --json` retornou fila vazia. Isso não comprova ambiente ERP configurado ou disponibilidade de conectores. Alternativa nativa oficial: Work in > Cloud > Select environment; criar ambiente para IgorCandin/candinho-gestao se necessário, revisar setup e publicar. Requer ação/configuração do titular nessa superfície; não criar nova assinatura/API/VPS. Fonte: https://learn.chatgpt.com/docs/environments/cloud-environments . Sessão local não continua com PC desligado; não afirmar agente em segundo plano ativo.
