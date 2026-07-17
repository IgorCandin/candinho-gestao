# Pacote Navegação + Integrações V2

## Home / Operações
- Remove o texto redundante “Candinho Company” abaixo da logomarca.
- Remove o card grande duplicado da Central na Home para simplificar a escolha inicial.
- Mantém a primeira linha somente com Suplementos, Fitness e Bank.
- Mantém a segunda linha administrativa com Parceiros, Perfil e Integrações.
- Remove o segundo atalho de Fitness que causava duplicação visual.

## Menu lateral
- Remove o atalho Configurações das operações.
- Perfil e permissões continuam acessíveis pela Home em “PERFIL”.
- Ao abrir Perfil, a tela usa contexto visual da Candinho Company, em vez de parecer configuração de Suplementos.

## Integrações
- Nova Edge Function `central-integration-readiness` publicada no Supabase.
- A tela passa a verificar se META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET e OPENAI_API_KEY estão configurados, sem revelar os valores.
- Exibe URL do webhook Meta e botão para copiar.
- Exibe saúde de WhatsApp, Instagram e Facebook.
- Exibe prontidão do Nexus IA e da classificação de mídia.
- As integrações Meta continuam aguardando credenciais/contas externas para começar a receber mensagens reais.

## Segurança
- Nenhum segredo é enviado ao navegador.
- A consulta de prontidão exige login de administrador/gestor.
