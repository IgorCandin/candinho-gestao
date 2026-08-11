# V45.20 · UX Doctor ativo + menu mobile definitivo

## Por que os erros antigos continuavam aparecendo?

A V45.19 corrigia a interface, mas `ux_health_signals` não possuía estado de
resolução. O snapshot do UX Doctor mostrava qualquer sinal visto nos últimos
14 dias como se ainda estivesse ativo.

Por isso:
- `/bank-lab` de 10/08 continuava aparecendo;
- `/clientes` de 08/08 continuava aparecendo;
- os antigos cortes de 54/61 px continuavam nos cards mesmo depois do hotfix.

## O que muda

### 1. Ciclo de vida dos sinais automáticos
`ux_health_signals` recebe:
- `status`: active / resolved / ignored;
- `resolved_at`;
- `resolution_note`.

Os sinais existentes viram histórico no momento da migration.

Se o mesmo problema reaparecer depois:
- a RPC reabre automaticamente o mesmo fingerprint;
- atualiza a medida atual do overflow;
- o card volta ao UX Doctor.

Nenhum histórico é apagado do banco.

### 2. UX Doctor
O snapshot passa a contar e exibir apenas sinais `active`.

Assim um erro antigo corrigido deixa de parecer um bug atual.

### 3. Menu mobile
A V45.19 reduziu o corte de 54 px para 46 px em uma nova medição no
`/nexus/qualidade`, mas ainda dependia de JS.

A V45.20 usa uma fronteira CSS rígida:
- mantém o `top` definido pelo shell;
- fixa `bottom` dentro da viewport;
- usa `height:auto`;
- o navegador calcula a altura entre topo e rodapé.

Isso funciona antes mesmo do JavaScript carregar.

### 4. Bank Lab
`/bank-lab` passa a redirecionar para `/bank`.

A rota foi aposentada; um bookmark antigo não deve terminar em 404.

## Banco
A migration está incluída no repositório, mas não precisa ser executada
manualmente. Ela será aplicada no Supabase oficial após o deploy.

## Commit sugerido
`V45.20 - resolve sinais antigos e fecha menu mobile`
