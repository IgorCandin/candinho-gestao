# V38 · Pacotão 6 · Homologação operacional

## Portal do Parceiro
Correção aplicada em produção:
- período de vendas e histórico mensal passam a usar a data efetiva da operação;
- quando entregue, a data comercial é a data da entrega em America/Sao_Paulo;
- quando ainda não entregue, permanece fallback para a data do orçamento;
- filtros do Portal seguem a mesma data efetiva;
- participação estimada respeita `counts_only_delivered`.

Durante a auditoria foram encontrados registros de parceiro atravessando meses entre orçamento e entrega, incluindo vendas da C.T.S. Pâmella Nunes.

## Bank
Correção aplicada em produção:
- `bank_get_annual_projection` agora consulta `bank_month_commitment_resolutions`;
- mensalidades já marcadas como pagas no mês não são reprojetadas;
- dívidas resolvidas no mês também ficam protegidas contra dupla projeção.

Fotografia de julho durante a homologação:
- 8 mensalidades resolvidas/pagas;
- total nominal: R$ 1.364,80;
- essas mensalidades não possuíam cobrança vinculada para julho e, antes da correção, poderiam voltar como estimativa da projeção.

## Central
- a rota pausada `/central/integracoes` agora encaminha para `/central/governanca`;
- a tela de prioridades usa o nome `Prioridades operacionais`;
- atalhos de diagnóstico de integrações apontam para Governança.

## Produção
O deploy do Pacotão 5 foi confirmado como READY.
Na janela recente verificada, não foram encontrados erros de runtime na Vercel.

## Segurança
Após as migrations:
- RPCs do Portal permanecem executáveis por `authenticated`;
- `anon` permanece sem execução;
- `bank_get_annual_projection` permanece executável por `authenticated`;
- `anon` permanece sem execução.

As migrations deste pacote já foram aplicadas diretamente no Supabase de produção.
Os arquivos SQL existem para manter o repositório sincronizado.
