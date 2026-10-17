# Escritório — cobertura em 17/10/2026

## Implementado nesta revisão

Casa com todas as salas autorizadas simultâneas, avisos junto aos personagens por hover/foco, clique/toque para fixar, Escape/fechamento com retorno do foco e rolagem interna. Sem painel lateral, dados de exemplo ou resolução simulada. Conforme pedido posterior de padronização global (OBS-017), o cursor decorativo também permanece nesta rota; sua animação agora encerra ao alcançar o ponteiro e reinicia somente com movimento, eliminando o loop contínuo em repouso.

Indicadores novos, somente leitura, com contagem exata e sem limite de amostra:
- Suplementos: recebimentos e entregas de `pending_orders`, canceladas excluídas, estados `receivable` / `to_deliver`.
- Fitness: recebimentos e entregas de `fitness_sales_operational`, canceladas excluídas, mesmos estados operacionais.
- Ambos: pós-vendas `planned` das views de Acompanhar. Incluem futuros, explicitamente identificados.

Indicadores preservados: telefones ausentes, Doctor, reposição/demanda sem estoque, oportunidades Fitness (amostra), compromissos Bank do mês. Erro permanece `null`, nunca zero. Os cartões de Doctor são sinais históricos a conferir em Qualidade, não prova de um erro ainda reproduzível.

Fontes cruzadas: `src/app/(app)/company/[sector]/page.tsx` (Concluir e Acompanhar), `src/lib/data.ts` (Fitness), `src/lib/bank-home-data-v2.ts`, migrations de `pending_orders` e `fitness_sales_operational`.

## Lacunas ainda abertas, visíveis na própria página

| Área | Sem monitoramento nesta casa | Fonte/fluxo existente para próxima integração |
|---|---|---|
| Clientes/comercial | Leads, orçamentos e retornos combinados | Vender/Orçamentos; Acompanhar já consulta CRM e feedback, com deduplicação por cliente |
| Gestão | Agenda operacional, tarefas manuais e contatos | Gestão combina agenda, fila comercial e reservas; reaproveitar filtros para evitar avisos duplicados |
| Suplementos | Fornecedores aguardando recebimento, lotes/validade/quarentena e parceiros | Compras; estoque/lotes; parceiros. Recebimento de compra não equivale à demanda por reposição |
| Fitness | Consignações/acertos, compras e reservas por variante | Rotas Company de consignações, compras e estoque; definir limiares antes de marcar urgência |
| Bank | Outros meses, conciliação, entradas, reservas/previsões | Planejamento; indicador atual representa apenas os compromissos do mês consultado |
| Central/Marketing/Physique | Nenhuma fila integrada na casa | Ferramentas de Gestão/Central e Atletas; não inferir cobertura porque a sala não existe |

As lacunas acima são ausência de integração no escritório, não contagens de problemas reais. Não houve auditoria completa dos registros de produção nem alterações em dados ou schema. Não somar contagens entre filas: a mesma venda pode aguardar pagamento e entrega.

## Resolução

Os avisos abrem as filas existentes para executar a ação com as permissões e validações atuais. Depois de voltar, Atualizar pendências consulta novamente. Resolver dentro da casa permanece uma extensão futura: exige trazer o registro concreto e a ação autorizada, sem inventar sucesso por clique.

## Validação registrada

23 testes Company aprovados; tipos e lint dos módulos alterados aprovados. Teste isolado no navegador em 1440×900 e 390×900: quatro salas simultâneas, casa no enquadramento, sem overflow horizontal, clique/toque para fixar/fechar, rolagem e Escape, sem erros JavaScript. Dados de teste não entram no produto.

Build local: compilação/tipos aprovados, prerender público de `/catalogo` bloqueado por variáveis Supabase ausentes. Publicação exige build remoto aprovado. O lint global apresenta falhas fora do escopo; auditoria das dependências existentes aponta Next/sharp, sem atualização de pacotes nesta revisão. Homologação do responsável e ações reais não executadas.
