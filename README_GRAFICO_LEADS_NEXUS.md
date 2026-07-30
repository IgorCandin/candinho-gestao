# Gráfico financeiro + Nexus em Leads

## Gráfico Evolução do lucro

Ao passar o mouse em um ponto — ou tocar no celular — o tooltip mostra:

- quantidade de vendas;
- valor bruto;
- lucro;
- margem.

No modo acumulado, também mostra o lucro acumulado até aquele ponto.

A base permanece a mesma: vendas entregues e não canceladas.

## Nexus IA na tela do Lead

Enquanto o lead ainda não foi convertido, aparece:

**Nexus IA · mensagem para o lead**

O Nexus usa:
- status do lead;
- produtos e sabores de interesse;
- observações;
- orçamento vinculado;
- perfil do cliente;
- últimas compras;
- últimos contatos;
- sensibilidades/restrições e preferências cadastradas.

Também existe:

**Observações adicionais (opcional)**

Esse campo serve apenas para aquela geração, por exemplo:
- "Ele recebe sexta."
- "Hoje chegou o sabor que queria."
- "Pediu para chamar depois do treino."

Depois de gerar:
- pode editar a mensagem;
- regenerar;
- copiar;
- abrir pronta no WhatsApp;
- ver leitura do Nexus, próxima ação e alertas quando existirem.

## Banco

Sem SQL.
Sem migration.
Sem alteração de estrutura no Supabase.

Usa o Nexus e os dados que o sistema já possui.

## Aplicação

Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`feat: enriquece grafico financeiro e adiciona nexus aos leads`
