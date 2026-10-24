# Company — vínculos antes do cadastro, 24/10/2026

## Escopo

Frente B independente do pedido parcial (#80) e das rotinas (#79 DRAFT). A Company não oferecia o editor de relações/afiliações do cadastro legado. Agora compõe o mesmo `NewCustomerForm`, passando seus campos básicos e seu resolvedor existente; não há cópia do editor, API ou regras comerciais.

- `fitness_resolve_customer` e busca/criação Suplementos permanecem os mesmos. Nenhuma associação por telefone nova foi criada.
- Opções/editor de vínculos só são disponibilizados com escrita Suplementos; usuário com escrita apenas Fitness mantém seu cadastro, sem consulta às opções CRM nem ao nome na tabela core.
- Como o resolvedor pode encontrar uma pessoa já cadastrada, havendo rascunhos Company exige uma segunda confirmação explícita do nome identificado. Campos básicos ficam bloqueados; pode abrir a ficha sem aplicar vínculos.
- Rascunhos são somente estado da página até confirmar. Sem localStorage, envio antecipado, memória externa ou telemetria com dados pessoais.
- O mesmo POST `kind: bulk` aplica os mesmos campos/flags. O backend continua validando permissões. Não se alteraram parceria automática, prioridade, grants, RLS, RPCs ou migrations.
- Em falha HTTP/rede Company mantém os rascunhos e avisa que alguns vínculos podem ter sido salvos; não navega nem declara sucesso. A ficha está disponível para conferência. Não há retry automático do bulk. Após resolver o ID core, retry da leitura de nome reutiliza esse ID em memória.
- Legado conserva campos, criação, payload e destinos. Exceção segura: falha de transporte do bulk segue agora à revisão existente, como já ocorria em erro HTTP, evitando oferecer recriar cliente após erro tardio.

## Evidências locais

Oito contratos com dados fictícios: composição compartilhada, gate Fitness, confirmação de identidade antes do POST, criação única, HTTP/rede sem perda de rascunhos, flags das afiliações, consultas condicionais na página e retry da leitura de nome sem nova resolução. Cinco testes falharam antes da correção.

Fixture hidratada dos componentes reais, todas as folhas CSS e stubs de banco/API: Chromium 320/390/1366 px, adicionar/remover relações/afiliações, resolver, confirmar identidade, simular falha e recuperar sem recriar cliente. Zero overflow horizontal, zero erros JS/hidratação; alvos móveis de 44 px e nomes longos conferidos. Isso não equivale a Safari físico ou gravação comercial em produção.

TypeScript e lint direcionado aprovados nesta implementação. Suíte completa e build remoto/READY devem ser registrados no PR/Trello com o SHA final; não inferir publicação deste arquivo.

## Limites e próximo lote

Paridade **parcial**, não migração integral de clientes/leads. O retorno ao lead ainda não preserva seu rascunho ao sair para cadastrar cliente; precisa contrato próprio sem gravar dados pessoais no navegador indevidamente. Observações no caminho Fitness continuam com o comportamento anterior do resolvedor; não mudamos persistência ou regras para encobrir diferenças históricas.

O bulk existente não é transação única com a criação nem com todas as relações; por isso falha parcial exige revisão e não pode ser chamada de sucesso. Nenhum dado real foi criado/editado para testar. Sem retirada do legado, alterações financeiras/estoque/credenciais ou SQL aplicado. Rollback de interface: reverter este PR, preservando os cadastros/vínculos já existentes.
