# Candinho Company — Pacote Consolidado V9

## Objetivo

Este pacote evolui o V8 com foco em produtividade diária da Candinho Central e fechamento do fluxo operacional de atendimento e parceiros.

## Principais entregas

### Central — Prioridades do dia
Nova rota `/central/prioridades` com uma fila única de atenção para:
- tarefas vencidas, do dia e dos próximos 7 dias;
- conversas não lidas ou pendentes;
- oportunidades prioritárias do Radar comercial;
- reconciliações de estoque;
- portais de parceiros que exigem atenção;
- integrações com problema ou pendência.

### Inbox V3
Dentro do atendimento agora é possível:
- atribuir uma conversa a um membro da equipe com acesso à operação;
- agendar retorno diretamente da conversa;
- criar a tarefa correspondente na Agenda;
- marcar a conversa como pendente ao criar o retorno;
- usar respostas rápidas no compositor;
- continuar usando o Nexus para preencher uma sugestão antes do envio.

### Respostas rápidas
Nova rota `/central/respostas` para gerenciar textos reutilizáveis por escopo:
- Company;
- Suplementos;
- Fitness;
- Marketing.

Nada é enviado automaticamente. A resposta apenas preenche o compositor para revisão humana.

### Portal Parceiro — Segurança
Nova rota `/parceiro/seguranca` para o próprio parceiro trocar a senha de acesso.
O Portal continua isolado das operações internas.

### Portal Parceiro — Diagnóstico
O diagnóstico criado no V8 continua ativo e identifica:
- login inexistente;
- acesso pausado;
- perfil ausente ou inativo;
- papel incorreto;
- vazamento de permissão interna;
- acesso pronto.

No momento da geração do V9, CTS e ITAPHARMA estavam com `health_status = ready` no backend.

### Hardening seguro
Foram revogados acessos diretos de cliente a funções internas usadas apenas por triggers, sem remover as RPCs operacionais normais do sistema.

## Supabase
As migrations novas deste pacote já foram aplicadas ao projeto de produção e estão incluídas no repositório para manter o Git sincronizado.

A função `central-meta-webhook` permanece na versão publicada anteriormente. Uma tentativa de publicar uma evolução adicional de pausa de canal foi bloqueada pelo conector e, portanto, essa publicação não deve ser considerada concluída.

## Integrações externas
A infraestrutura técnica de Meta e OpenAI existe, mas o funcionamento ponta a ponta ainda depende da configuração real das credenciais e contas externas. Não há tokens ou segredos versionados neste pacote.

## Validação local
- ESLint: exit code 0
- TypeScript: exit code 0
- Next.js build de produção: exit code 0

Os avisos não bloqueantes conhecidos sobre `<img>` na biblioteca de mídia permanecem.
