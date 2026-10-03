# Candinho Company — roteiro único atualizado

Atualizado em 03/10/2026. O roteiro de 17/09 é histórico: seus itens “publicados” não comprovam testes atuais. Não desligar módulos antigos por um indicador 10/10.

## 1. Corrigido no banco; conferir agora

- Cancelamento de venda: corrigido o contato automático de reposição que continuava ativo. Foram encontrados 3 casos, incluindo Edirlei; eles foram cancelados sem apagar tarefas, vínculos ou histórico, com registro de auditoria. Uma rotina automática trata futuros cancelamentos. A consulta pós-correção confirmou zero contatos/reminders ativos de vendas canceladas. Caminho: [Gestão/calendário](https://candinho.duckdns.org/company/gestao) e [Atender e acompanhar](https://candinho.duckdns.org/company/acompanhar). O contato do Edirlei não deve estar na fila ativa; o histórico cancelado permanece.
- Segurança: políticas do Doctor e revisão de parceiros, 10 funções auxiliares protegidas e execução direta de 6 funções internas bloqueada. Aplicado no banco e testes SQL aprovados; o responsável confirmou os testes anteriores. Isso não significa que todos os avisos de segurança foram corrigidos.

## 2. Preparado no código; publicação pendente

- Cadastro rápido de cliente em Nova venda Suplementos: janela fora dos contêineres da página, com altura dinâmica e rolagem. Testar no iPhone com teclado aberto/fechado depois de publicar: [Nova venda](https://candinho.duckdns.org/company/vendas/nova/suplementos). Não marcar o sinal do Doctor resolvido antes desse teste.
- Mapa Fitness: adicionados blocos de venda/orçamento, conclusão, produtos/fotos/variações, estoque/histórico, compras, CRM, consignações e resultados, com contagem separada. Nenhum bloco foi marcado OK automaticamente. Testar persistência de OK/Falta após atualizar: [Mapa](https://candinho.duckdns.org/company/mapa).
- Arquivos SQL das correções de segurança e cancelamento, testes e documentação precisam ser enviados ao GitHub. O envio pelo terminal não consegue conectar; a escrita pelo conector foi bloqueada pela política deste ambiente. Não anunciar publicação dessas telas até liberar o envio e confirmar a implantação.

## 3. Doctor: corrigir causas, não apagar sinais

Consulta ao banco em 03/10 encontrou 8 sinais ativos:

| Rota | Sinal | Última ocorrência | Próximo trabalho |
| --- | --- | --- | --- |
| /company/resultados | React 419 | 29/09 | Reproduzir falha de renderização no servidor e conferir logs |
| /company/vendas/nova/suplementos | React 418, desktop | 29/09 | Reproduzir divergência de HTML entre servidor e navegador |
| /company/vendas/nova/suplementos | React 418, mobile | 29/09 | Reproduzir no celular, sem ocultar o erro |
| /company/vendas/nova/suplementos | janela de cadastro cortada | 29/09 | Publicar correção preparada e testar teclado/rolagem |
| /atletas | menu Physique cortado | 11/09 | Reproduzir na dimensão registrada e testar navegação |
| /atletas | menu Company cortado | 10/09 | Conferir cabeçalho/área visível |
| /suplementos/hoje | erro de componente no servidor | 03/09 | Conferir rota antiga e logs atuais |
| /suplementos/estoque | rodapé cortado | 30/08 | Reproduzir no celular |

Nenhum desses 8 registros foi apagado ou encerrado nesta rodada. Data antiga não prova correção. Após correção + reprodução aprovada, atualizar para resolvido com evidência, preservando ocorrências e histórico. React 418 indica divergência de hidratação; React 419 indica falha do servidor dentro de uma área Suspense, não necessariamente a mesma causa.

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
2. Após publicação, testar no iPhone só a janela de cadastro e rolagem; enviar rota + print se cortar.
3. Enviar o PDF original quando formos validar a importação, e escolher um exemplo de consignação/prova que usa no dia a dia.
4. Para cada falha: rota, cliente/produto, esperado e ocorrido. Não precisa reenviar toda a história.

Ordem: cancelamento validado → publicar lote preparado → Doctor → operação/consignações → Bank/Atletas/Vitrine → homologação → desligamento. Este documento concentra o que falta; nenhum item foi declarado concluído só por existir no código.
