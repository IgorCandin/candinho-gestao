# Configuração dos recursos de IA

Os recursos de IA usam a OpenAI API somente no servidor. A chave nunca deve ser exposta ao navegador nem enviada ao Git.

Configure no ambiente da Vercel:

- `OPENAI_API_KEY` — chave da OpenAI Platform
- `OPENAI_BANK_MODEL` — opcional; define o modelo usado pelo Nexus Bank

Sem `OPENAI_API_KEY`, o restante do ERP continua funcionando, mas os recursos que dependem de geração ou interpretação por IA ficam indisponíveis.

O Nexus Bank produz uma prévia antes de qualquer confirmação operacional. A configuração histórica original está preservada em `docs/arquivo-historico/pacotes-raiz/CONFIGURAR_IA_V40.txt`.
