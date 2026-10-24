# P0 — rotinas Company: PR preparado, sem implantação

## Autorização vigente

Em 24/10/2026 o responsável escolheu **Preparar PR, sem aplicar migration**. Não aplicar SQL, integrar este lote ou publicar a aplicação que depende dele. Produção continua no #78 até outra entrega independente autorizada. Cartão único P0: https://trello.com/c/Fftoz6V9 . Não criar controlador, refazer OAuth ou abrir rotinas reais como teste.

## Causa e solução preparada

Definições atuais de `nexus_active_routine_v1`, `nexus_advance_routine_v1` e `nexus_cancel_routine_v1` foram consultadas somente para leitura. A RPC de avanço compara literalmente o caminho persistido, sob proprietário e lock. Trocar só href não permite chegada Company; conferir a etapa apenas no servidor Next sem rechecagem transacional não impede corrida.

- `company-routine-navigation.ts` compartilha o mapeador existente, limitado a detalhes e superfícies com identidade migrada comprovada. Mantém ID/query/hash; não converte lead em venda, listas reagrupadas ou caminhos desconhecidos.
- Dock e gestão compartilhada usam destinos Company; passos salvos, atalhos, sugestões e rotinas não são regravados. `/company/nexus/rotinas` compõe o servidor/cliente já existente.
- Novos pedidos incluem `expected_step`. API mantém seu gate ativo/não parceiro, lê a rotina do usuário, valida identidade/etapa/alias e chama o adaptador transacional. Clientes antigos sem esse campo continuam na RPC original; erro do novo adaptador **não** faz fallback para mutação antiga.
- SQL preparado em `prepared/nexus_routine_step_compat.sql`: novo adaptador obtém lock da execução ativa do proprietário, rejeita etapa antiga e chama o motor `nexus_advance_routine_v1` sem duplicar suas regras. A URL Company observada fica em `observed_href` somente na entrada nova de histórico; o href do motor permanece o persistido. Não há backfill, edição de passos antigos, RLS ou permissão ampliada.
- Cancelamento usa a função existente. Erros de chegada/skip/cancel ficam visíveis, sem declarar conclusão quando a mutação falha. Atualizar rotina faz leitura; não existe loop de retry automático de mutação.

## Verificação e limites

- Três testes vermelhos de navegação/API/dock antes do ajuste; cinco novos testes Node após, incluindo duplicação local, payload/CAS, rotas divergentes, guards e componente compartilhado sem regravar passos.
- `node scripts/test-routine-compat-sql.cjs` carrega o motor original em PostgreSQL/PGlite isolado. Reproduz a divergência; verifica chegada, repetição mesmo com passos consecutivos iguais, caminho errado, proprietário/sessão, ACL anon/authenticated, skip, cancelamento repetido, conclusão e preservação da auditoria.
- PGlite usa uma conexão: a presença/ordem do lock foi revisada e o CAS exercitado, mas **não é teste de contenção simultânea entre conexões**. Esse ensaio deve ocorrer em PostgreSQL descartável antes de autorizar implantação.
- Suíte202/202; lint direcionado sem novos diagnósticos. Dock tem um diagnóstico React de efeito já existente na main, comparado com o lote (1 antes/1 depois). Não declarar lint global limpo. TypeScript/build por SHA do PR exigem evidência no cartão.
- Nenhuma execução/CRUD de rotina real foi chamada. Única consulta real foi às definições das três funções; não houve leitura de conteúdo de rotinas particulares.

## Implantação futura, somente com aprovação específica

1. Conferir main, definições/ACL atuais e hash do SQL preparado; reexecutar testes se houver mudanças.
2. Validar contenção em PostgreSQL com conexões independentes; não usar a produção como fixture.
3. Criar migration formal pelo CLI Supabase e revisar o SQL preparado. CLI não estava disponível nesta sessão; por isso o SQL está em docs/prepared, não em migrations com timestamp inventado.
4. Após aprovação, aplicar **somente** o adaptador, verificar assinatura/ACL/ausência de alterações em dados e depois integrar a aplicação testada. Não publicar o código novo antes dessa etapa.
5. Conferir Vercel READY e navegação com fixture autenticada isolada. Não iniciar/pular/cancelar uma rotina comercial real apenas para homologar.

Rollback de aplicação: reverter o PR e retornar ao cliente original. Adaptador adicional pode permanecer ocioso; remoção formal exige aprovação e conferência de dependências. Funções originais e dados permanecem intactos.

## Próximas tarefas independentes

Rascunhos de vínculos antes da criação e retorno ao lead ainda não têm paridade. Não substituir `CompanyNewCustomerForm` pelo legado: o ramo Fitness usa `fitness_resolve_customer` para manter identidade/atomicidade. Compartilhar rascunhos/validação/apresentação e definir retorno local sem duplicar resolução nem aplicar atribuições de parceria silenciosamente. Painel após cadastro já foi entregue no #78, não repetir.
