# CANDINHO V45 · PACOTÃO OPERACIONAL

Este pacote substitui o Pacote 2 da Home e adiciona uma camada comercial/operacional grande.

## Já aplicado no Supabase
As migrations deste pacote já foram aplicadas no projeto oficial.
NÃO rode SQL manualmente.

## O que entra

### 1. Home Foco
- Candinho Company
- CS / CF / CM / CB / CCE
- nomes das operações abaixo dos ícones
- Vitrine + Physique + Perfil + Sair
- Sala do Dono continua existindo, mas sai da Home
- sem KPIs na tela seletora

### 2. Saídas não-venda
Nova rota:
`/suplementos/saidas`

Motivos:
- Ativação de parceria
- Premiação / sorteio
- Amostra
- Ação de marketing
- Influenciador
- Doação
- Uso interno
- Perda / avaria
- Outro

A saída:
- baixa o estoque oficial
- respeita estoque reservado
- respeita sabor
- usa rastreabilidade oficial de lote
- guarda custo do produto
- receita = zero
- não cria venda
- não cria cliente fictício
- não entra em ticket/recompra/comissão

### 3. Radar Comercial V45
Rota existente:
`/clientes/radar`

Abas:
- Falar hoje
- Recompras
- Creatina Candinho
- Complementares
- Todas

Feedback:
- Acabou
- Ainda usa
- Depois
- Outra marca
- Não quer
- Vendeu

O ERP pausa oportunidades automaticamente conforme o feedback.

### 4. Quero vender este produto
Nova rota:
`/clientes/radar/produtos`

Fluxo:
produto -> melhores clientes -> motivo -> criar retorno -> feedback

### 5. Nexus Comercial dentro da ficha do cliente
Na ficha:
`/clientes/[id]`

Mostra até 3 oportunidades com:
- produto
- motivo
- score
- ação recomendada
- feedback comercial

### 6. Parcerias em configuração
Nova rota:
`/parceiros/configuracao`

Mostra:
- o que ainda falta definir
- investimento comercial já feito
- unidades destinadas à parceria

Uma parceria pode existir antes de comissão/contrapartida estar decidida.

## Caso TopTraining
Depois do deploy:
1. Abrir `/suplementos/saidas`
2. Motivo: `Ativação de parceria`
3. Se a TopTraining ainda não estiver cadastrada, usar `Outro destino`
4. Destino: `TopTraining`
5. Produto: `Creatina 300g | Candinho Suplementos`
6. Quantidade: `3`
7. Observação sugerida:
   `3 creatinas entregues antes da definição formal da parceria para sorteio entre alunos.`

Isto NÃO deve ser lançado como venda/brinde.

## Commit sugerido
`V45.2 - pacotao comercial e logistica operacional`

## Depois do push
Aguardar a Vercel.
Se houver erro de build, não criar novo commit em cima antes de analisar o log.
