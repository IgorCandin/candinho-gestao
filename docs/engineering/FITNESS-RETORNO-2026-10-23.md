# Fitness: retorno escolhido em Já chamei

O mesmo componente atende Vender, oportunidades e Acompanhar. Já chamei abre a data (sugestão +6 dias); confirmar salva `contacted`, não `later`. Contato futuro existente é preservado ao reabrir. Respondeu e Ficou para depois continuam disponíveis.

Migration gerada pelo CLI: `20261023171120_fitness_contact_optional_return.sql`. Substitui apenas o corpo da RPC existente, mesma assinatura, permissões, trava por cliente, revisão otimista, gravação atômica de estado/histórico e fuso de São Paulo. Não atualiza registros existentes. Aplicar antes da versão da interface que envia data; clientes antigos enviando null continuam recebendo +6 dias.

Evidências: API antiga descartava a data (teste vermelho). PostgreSQL isolado PGlite reproduziu rejeição da função antiga e aprovou a nova: data futura/default, passado/hoje/data impossível, status, revisão, autorização, cliente inativa, histórico e reaplicação sem reescrita. Sete testes API/UI e suíte 177/177 passaram; lint direcionado sem erros. Não simula concorrência multissessão nem substitui homologação no iPhone.

Reprodução SQL sem banco real: instalar `@electric-sql/pglite@0.3.14` em diretório temporário, informar o caminho em `PGLITE_MODULE` e executar `node scripts/test-fitness-contact-sql.cjs`. Nenhuma dependência de runtime do ERP adicionada. CLI/PGlite locais foram instalados em `.codex-tmp/sql-harness`, ignorado pelo Git, com scripts inspecionados e checksum do binário CLI verificado.

Antes da alteração no servidor, conferência somente leitura confirmou contrato esperado, ACL restrita a postgres/authenticated/service_role e zero registros nos dois históricos de contato. Não chamar a RPC real para testar; conferir somente definição, grants e contagens após migration. Build/publicação devem ser confirmados por SHA no deployment.
