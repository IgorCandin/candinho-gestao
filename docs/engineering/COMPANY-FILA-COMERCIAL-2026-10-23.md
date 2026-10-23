# P0 — Fila Comercial profunda na Company

Continua #76, base `71dc8a9fb48391034435a64655e47ffc8d4e8c62`. Cartão único: https://trello.com/c/Fftoz6V9 . Estado de publicação/SHA/READY nos comentários desse cartão e PASSO 2; não confundir implementação com homologação humana.

## Solução e paridade

- `/company/fila-comercial` e `/suplementos/fila-comercial` compõem o mesmo `operational-pages/commercial-contact-queue-page.tsx`, sem props extras em entradas Next. Mesma consulta `commercial_contact_queue_people_v1({p_limit:40})`, fallback e propagação de erro.
- Mesmo gate `admin || canWriteSupplements`; negação no contexto Company retorna à Company, sem ampliar acesso. RLS, API, permissões e regras permanecem inalteradas.
- O mesmo `CommercialContactQueue` mantém meta, ordem, agrupamento de contextos, próximos contatos, disponibilidade, WhatsApp, estados e mensagens. Apenas `Abrir cliente` usa destino Company quando nesse contexto; ID/query/hash preservados.
- Fila Única/Copilot/paleta aproveitam o mapeador existente para o novo destino. Cartão comercial da agenda Company aponta agora à fila exata, não à seleção diferente de Vender agora. Legado continua funcional.
- Ações intactas: `commercial_contact_customer_action_v1`, com cliente, ação e `p_notes:null`; `contacted`, `skipped`, `responded`, `no_response`. Recarregamento permanece na URL atual. Não se duplica tarefa, contato, compra, cliente ou venda.

## Evidência técnica

- Dois testes vermelhos antes da implementação; um teste de ações já verde antes foi mantido como contrato.
- Testes executam componentes reais e quatro ações em ambos os contextos com Supabase/window fictícios, sem rede. Erro não recarrega nem oculta mensagem. Guard, RPC de leitura, fallback vazio, erros e composição Next conferidos.
- Suíte194/194, lint dos arquivos alterados exit0, diff-check limpo. TypeScript/build exatos devem ser confirmados no deploy do PR antes do merge. Revisão React: sem novos efeitos/estado/requests, componente compartilhado e identidade/payload de ação preservados.
- Teste real em produção é somente navegação, leitura, viewport e console. Não acionar Chamei/Pular/Respondeu/Não respondeu, WhatsApp ou gravação de registros de clientes como experimento.

## Limites e próximos

Cadastro ainda exige paridade de relacionamentos: `NewCustomerForm` legado monta relacionamentos/afiliações e revisão parcial via API; `CompanyNewCustomerForm` usa o resolvedor unificado e não recebe esses rascunhos. Não substituir o resolvedor nem duplicar cadastros apenas para copiar campos. Avançar com composição das ferramentas de relacionamentos existentes e testes isolados de retorno/erro.

Rotinas continuam dependentes da equivalência de chegada com RPC persistido; abrir rotina pode gravar avanço automaticamente. Não mapear cegamente href ou executar rotina real para teste. Nenhuma migration criada neste lote. Controlador #67 e Google Reviews intactos.

Rollback: revert do PR desta branch restaura os links anteriores e remove apenas a entrada nova. Mesmos componentes/dados do legado permanecem, sem backfill ou reversão de dados.
