# CRM — exclusão automática + cooldown após contato

## Já aplicado no Supabase de produção

As migrations deste pacote já estão aplicadas no banco. Elas estão no ZIP para manter o GitHub sincronizado.

## O que mudou

### Participar do CRM automático
Na ficha do cliente, em **Editar dados**, agora existe:
- Participar do CRM automático
- Motivo da exclusão: Interno, Teste, Não contatar ou Outro

Ao desligar:
- cliente continua no cadastro;
- histórico e vendas continuam intactos;
- deixa de aparecer no Radar de Oportunidades;
- deixa de entrar nos contadores do Radar.

### Contato registrado remove o cliente do Radar
Depois de registrar contato:
- sem próximo retorno: fica fora do Radar por 7 dias;
- com próximo retorno: fica fora até a data agendada;
- retorno para hoje ou atrasado: volta ao Radar normalmente.

### Cliente interno
O cadastro interno que estava aparecendo no Radar já foi marcado em produção como:
- CRM automático: desligado
- Motivo: Interno

## Aplicação no repositório

Extraia este ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`fix: melhora lógica do radar e adiciona exclusão do CRM automático`

Não execute as migrations manualmente: elas já foram aplicadas em produção.
