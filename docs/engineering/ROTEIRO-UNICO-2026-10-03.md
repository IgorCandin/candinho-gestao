# Candinho Company — roteiro único atualizado

Atualizado em 06/10/2026. O roteiro de 17/09 é histórico: seus itens “publicados” não comprovam testes atuais. Não desligar módulos antigos por um indicador 10/10.

## Avanço de 06/10 — sem depender de testes do responsável

- Mapa de migração: corrigida online a falta de permissão para ler e salvar. Leitura, inclusão e atualização validadas com usuário autorizado em transação desfeita; nenhum OK fictício, venda ou estoque alterado. Migration 20261006162033 preserva RLS e bloqueia exclusão/acesso anônimo. Teste posterior opcional: [Mapa](https://candinho.duckdns.org/company/mapa), marcar uma linha e atualizar para conferir persistência.
- Doctor consultado novamente: 7 sinais ativos; React 418 da Nova venda teve nova ocorrência em 06/10 (22 desktop, 5 mobile). Não é apenas erro antigo; segue aberto. Nenhum sinal apagado ou encerrado manualmente nesta rodada.
- A abertura pelo navegador de teste excedeu o tempo de resposta do domínio; a correção do banco foi validada diretamente, mas não equivale a homologação visual.
- Segurança: verificação após a migration não apontou ERROR; avisos anteriores sobre funções privilegiadas, extensão e senha vazada permanecem.
- Ordem restante: React 418 e telas cortadas → regressão de vendas/estoque/consignações → Bank, PDF e Vitrine → homologação final. O responsável não precisa testar agora; quando puder, concentrar em mapa, Nova venda e janela no iPhone.

## 1. Corrigido no banco; conferir agora

- Cancelamento de venda: corrigido o contato automático de reposição que continuava ativo. Foram encontrados 3 casos, incluindo Edirlei; eles foram cancelados sem apagar tarefas, vínculos ou histórico, com registro de auditoria. Uma rotina automática trata futuros cancelamentos. A consulta pós-correção confirmou zero contatos/reminders ativos de vendas canceladas. Caminho: [Gestão/calendário](https://candinho.duckdns.org/company/gestao) e [Atender e acompanhar](https://candinho.duckdns.org/company/acompanhar). O contato do Edirlei não deve estar na fila ativa; o histórico cancelado permanece.
- Segurança: políticas do Doctor e revisão de parceiros, 10 funções auxiliares protegidas e execução direta de 6 funções internas bloqueada. Aplicado no banco e testes SQL aprovados; o responsável confirmou os testes anteriores. Isso não significa que todos os avisos de segurança foram corrigidos.

## 2. Publicado em 03/10; conferência parcial

- Cadastro rápido de cliente em Nova venda Suplementos: janela fora dos contêineres da página, com altura dinâmica e rolagem. Em produção, abriu como filha direta do BODY e inteiramente dentro da área visível observada (559×572). A tentativa de simular 414×848 não mudou a área efetiva do navegador; isso NÃO comprova teste no iPhone. Conferir com teclado aberto/fechado: [Nova venda](https://candinho.duckdns.org/company/vendas/nova/suplementos).
- Mapa Fitness: adicionados blocos de venda/orçamento, conclusão, produtos/fotos/variações, estoque/histórico, compras, CRM, consignações e resultados, com contagem separada. Nenhum bloco foi marcado OK automaticamente. Testar persistência de OK/Falta após atualizar: [Mapa](https://candinho.duckdns.org/company/mapa).
- GitHub liberado: commits 7b0a8dd, 62102a7 e ab4b121 enviados à main. Vercel confirmou produção READY para ab4b121 (dpl_6uhTGR7RkH7jxdx1HaqHZ35QMJPw). A proteção contra melhorias visuais alterarem o formulário antes da hidratação foi publicada no commit 859ca73, também READY (dpl_E771N1LRm4qFcuyfM9undEAVcfJw), mas o erro React 418 ainda reapareceu: não considerar essa causa encerrada.
- Conferências online sem mutações: Resultados carregou o gráfico e os valores; Despesa/baixa abriu para Suplementos e Fitness. Isso comprova carregamento, não baixa real nem exatidão contábil completa.
- Mapa: correção complementar para preservar marcações locais de outras operações ao salvar/sincronizar uma linha; não apagar todo o cache. Nenhum estado OK foi criado artificialmente.

## 3. Doctor: corrigir causas, não apagar sinais

Consulta ao banco em 03/10 encontrou 8 sinais ativos:

| Rota | Sinal | Última ocorrência | Próximo trabalho |
| --- | --- | --- | --- |
| /company/resultados | React 419 | 29/09 | Gráfico carregou em 03/10; erro não reapareceu nessa navegação, mas falta reprodução suficiente antes de encerrar |
| /company/vendas/nova/suplementos | React 418, desktop | 03/10 | Erro reproduzido em produção antes e depois de 859ca73; investigar divergência de HTML restante |
| /company/vendas/nova/suplementos | React 418, mobile | 29/09 | Reproduzir no celular, sem ocultar o erro |
| /company/vendas/nova/suplementos | janela de cadastro cortada | 29/09 | Publicar correção preparada e testar teclado/rolagem |
| /atletas | menu Physique cortado | 11/09 | Reproduzir na dimensão registrada e testar navegação |
| /atletas | menu Company cortado | 10/09 | Conferir cabeçalho/área visível |
| /suplementos/hoje | erro de componente no servidor | 03/09 | Conferir rota antiga e logs atuais |
| /suplementos/estoque | rodapé cortado | 30/08 | Reproduzir no celular |

Nenhum registro foi apagado nem encerrado manualmente nesta rodada. A contagem inicial de 8 não é um total final: novos testes podem gerar novos sinais. Data antiga não prova correção. Após correção + reprodução aprovada, atualizar para resolvido com evidência, preservando ocorrências e histórico. React 418 indica divergência de hidratação; React 419 indica falha do servidor dentro de uma área Suspense, não necessariamente a mesma causa. O navegador negou acesso ao teste local; o arquivo temporário foi removido e o servidor parado, sem tentar contornar a restrição.

## 4. Operação: conferir por lote, sem refazer tudo

Há implementação no código para os caminhos abaixo, mas não foi feita homologação completa nesta rodada. Testes antigos do usuário não foram atribuídos a cada item sem identificação.

- [Produtos](https://candinho.duckdns.org/company/produtos): saldo por local, fotos/download/troca, imagem de cada variação, parceiros/Pâmella, combos e promoções. Padronização dos banners continua pendente de escolha visual e levantamento de imagens; não substituir fotos automaticamente.
- [Nova venda](https://candinho.duckdns.org/company/vendas/nova) e [Concluir](https://candinho.duckdns.org/company/concluir): Fitness igual ao fluxo Suplementos, orçamento simples/confirmado, pagamento e entrega independentes, pagamento agrupado entre operações, parcial/desconto/juros, lucro discreto e mercadoria a caminho com reservas anteriores. Conferir um caso real de cada diferença, não criar movimentos fictícios em produção.
- [Orçamentos](https://candinho.duckdns.org/company/orcamentos): edição, PDF, adicional a prazo, venda vinculada e cancelamento. Novos orçamentos devem usar Nova venda; conferir os atalhos.
- [Estoque](https://candinho.duckdns.org/company/estoque): consulta diferente de Produtos, contagem, correção, baixa, transferência em lote, reconciliação e estorno pelo histórico. [Despesa/baixa](https://candinho.duckdns.org/company/estoque/despesa) deve abrir para as duas operações. A presença de rota não comprova a equivalência de todas as funções antigas.
- [Compras](https://candinho.duckdns.org/company/compras): pedido único, cadastro temporário por janela, categoria selecionável, cobertura por tamanho, fornecedor, chegada e reservas na frente. Pedido comprado/a caminho não deve voltar indevidamente à prioridade de compra.
- [CRM](https://candinho.duckdns.org/company/acompanhar), [Vender](https://candinho.duckdns.org/company/vender) e [Clientes](https://candinho.duckdns.org/company/clientes): uma pessoa com vários produtos, identidade entre operações, histórico clicável, converter lead, retorno combinado e conclusão de compromisso.
- [Rotas](https://candinho.duckdns.org/company/rotas), [Resultados](https://candinho.duckdns.org/company/resultados), [Gestão](https://candinho.duckdns.org/company/gestao) e [Atalhos](https://candinho.duckdns.org/company/atalhos): ações persistentes, gráficos, alertas coerentes, atalhos sem sair para ERP antigo e remoção sincronizada.
- Consignação/prova de peças: falta comparação completa com o antigo e identificação de cada função sem equivalente. Os blocos novos do mapa são roteiro de conferência, não migração dessas funções.

## 5. Demais frentes ainda abertas

- [Bank Mobile](https://candinho.duckdns.org/bank/mobile): o código já separa mês atual/próximo e projeta o saldo de abertura do próximo mês a partir do resultado do atual. Conferir valores reais, recebíveis das operações, contas, pagamentos/adiamento e janelas. [Bank completo](https://candinho.duckdns.org/bank): metas, objetivos, caixa, cobranças e faturas ainda precisam de rodada funcional.
- [Atletas/Fichas](https://candinho.duckdns.org/atletas/fichas): falta testar o PDF Ficha_Treino_4x_Peito_Biceps.pdf com Igor até Revisar leitura; preservar seleção após erro. Também auditar dossiê, fotos/evolução e histórico de troca de treino.
- [Vitrine](https://candinho.duckdns.org/catalogo): catálogo público, preços, promoções, disponibilidade, interesse/cupom/WhatsApp e Avatar Chip no local correto. Conferência visual geral e mobile permanece aberta.
- Central/Nexus: definir equivalentes Company de agenda, prioridades, busca, alertas, fotos e relatórios, evitando duas filas comerciais concorrentes.
- Velocidade e regressão: medir início, vender, concluir, produtos, gestão e resultados; testar desktop, Android, iPhone, tablet/paisagem. Não remover funções para melhorar desempenho.
- Comunicação por e-mail/Twilio: aguarda decisão de canal, gatilho, destinatário, consentimento e prevenção de duplicidade. Não ativar envio real nesta auditoria.
- Segurança restante: revisão individual de funções privilegiadas, proteção antiabuso das rotas públicas e configurações GitHub/hospedagem. Proteção de senha vazada no Supabase depende de plano pago; nenhum upgrade autorizado ou feito.
- Desligamento dos antigos: somente após equivalência funcional e homologação, preservando consulta histórica.

## Como o responsável ajuda sem perder tempo

1. Conferir se Edirlei saiu da fila ativa e informar se o mesmo contato ainda aparece no Google Calendar (caso use a sincronização).
2. Testar no iPhone só a janela de cadastro e rolagem, já publicada; enviar rota + print se cortar.
3. Enviar o PDF original quando formos validar a importação, e escolher um exemplo de consignação/prova que usa no dia a dia.
4. Para cada falha: rota, cliente/produto, esperado e ocorrido. Não precisa reenviar toda a história.

Ordem: conferir cancelamento → Doctor (React 418 primeiro) → operação/consignações → Bank/Atletas/Vitrine → homologação → desligamento. Publicação foi desbloqueada. Este documento concentra o que falta; nenhum item foi declarado concluído só por existir no código.
