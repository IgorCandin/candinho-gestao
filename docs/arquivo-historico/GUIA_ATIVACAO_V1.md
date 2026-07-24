# Candinho Company V1 · Guia de Ativação

Este guia começa depois do Pacote Consolidado V10.

## Regra de ouro

Não coloque tokens, API keys, App Secrets ou senhas no Git, no navegador ou em tabelas da aplicação. Use somente Secrets/variáveis protegidas do ambiente de execução.

## 1. Portal Parceiro

- Confirmar primeiro login de CTS.
- Confirmar primeiro login de ITAPHARMA.
- Cada parceiro deve visualizar apenas `/parceiro` e `/parceiro/seguranca`.
- Trocar as senhas temporárias no primeiro acesso.
- Conferir estoque físico antes de corrigir saldo de consignação.

## 2. Meta

Na Central, abra `Central > Ativação V1` e depois `Central > Integrações`.

Cadastre apenas:
- canal;
- operação;
- nome da conta;
- identificador técnico da conta/canal.

Configure fora do banco, em Secrets:
- `META_WEBHOOK_VERIFY_TOKEN`;
- `META_APP_SECRET`;
- `META_GRAPH_API_VERSION`;
- token de envio do WhatsApp, Instagram ou Facebook conforme o canal.

Use a URL de callback exibida pela própria tela de Ativação/Integrações.

## 3. OpenAI

Configure em Secret:
- `OPENAI_API_KEY`.

Opcionalmente, configure os nomes dos modelos usados pelo Nexus e pela classificação de mídia. A tela de Ativação mostra o modelo detectado.

## 4. Teste ponta a ponta

1. Enviar mensagem real para um canal conectado.
2. Confirmar que a conversa apareceu no Inbox.
3. Confirmar criação ou vínculo do contato.
4. Gerar uma sugestão com Nexus.
5. Revisar manualmente a sugestão.
6. Enviar a resposta pelo Inbox.
7. Confirmar atualização do status de entrega.
8. Agendar um retorno a partir da conversa.
9. Criar um retorno a partir do Radar.
10. Confirmar que as tarefas aparecem em Agenda/Prioridades.

## 5. Fechamento V1

Depois dos testes reais, corrigir apenas bugs encontrados no uso e fazer a rodada final de segurança, performance e limpeza. Não iniciar novos módulos antes desse fechamento.
