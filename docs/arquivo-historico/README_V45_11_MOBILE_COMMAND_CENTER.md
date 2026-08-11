# Candinho V45.11 · Mobile nativo + Command Center

## Por que este pacote existe

O V45.9 resolveu um problema real no desktop:
- fontes microscópicas;
- controles pequenos;
- grids apertados;
- laterais espremidas.

Porém ele também adicionou a classe `v459-erp` no telefone.
Isso fez a camada de Foundation sobrescrever parte do shell mobile
que já estava maduro desde as versões anteriores.

O resultado visual ficou com sensação de:
`desktop adaptado/espremido no celular`.

Além disso, o V45.8 substituiu os antigos botões flutuantes por uma
barra global `Ferramentas` dentro do conteúdo.

Ela funcionava, mas criava um segundo cabeçalho visual em praticamente
todas as telas.

## 1. Mobile volta ao comportamento anterior

O componente:
`V459UiFoundationMarker`

agora aplica `v459-erp` somente em:
`min-width: 821px`.

### Desktop / notebook
Continua recebendo:
- escala tipográfica do V45.9;
- inputs e botões mais legíveis;
- correções de grid;
- responsividade de venda/produto;
- UI Foundation.

### Telefone
Não recebe mais os overrides globais do V45.9.

Voltam a prevalecer as folhas mobile já existentes:
- `mobile-shell-hotfix.css`
- `mobile-navigation-v3.css`
- `mobile-global-ux-v39-2.css`
- demais regras responsivas específicas de cada módulo.

O UX Doctor V2 continua ativo.
A correção do detector não depende da classe `v459-erp`.

## 2. A barra Ferramentas deixa de existir no conteúdo

Não existe mais:
`Ferramentas | Meu Dia | Nexus | Comando | Rotinas...`
ocupando uma linha antes da página.

O componente mantém o mesmo nome para reduzir risco:
`NexusUtilityBar`

Mas agora ele é um portal de navegação.

## 3. Desktop: ferramentas dentro da sidebar

Na sidebar aparece apenas:

`Ferramentas ▾`

Fechado por padrão.

Ao abrir:
- Meu Dia
- Nexus
- Comando
- Rotinas
- Qualidade
- Relatar problema

Se existir uma Rotina Nexus ativa:
- mostra a porcentagem no resumo;
- mostra a próxima etapa dentro do painel.

Nada fica sobre o conteúdo.
Nada cria um novo cabeçalho.

## 4. Telefone: ferramentas dentro do Menu

O Menu móvel continua com a experiência antiga.

Depois das rotas da operação aparece:
`Ferramentas ▾`

Só quando o usuário abrir, aparecem as ferramentas.

Portanto:
- não cria barra extra;
- não cria botão flutuante;
- não ocupa espaço permanente;
- mantém todos os recursos acessíveis.

## 5. Ctrl+K continua igual

`Ctrl+K` continua abrindo o Command normalmente no desktop.

O menu é apenas outra forma de chegar nele.

## 6. O que NÃO muda

Não altera:
- vendas;
- orçamento;
- preço promocional;
- pós-venda;
- reposição;
- estoque;
- Bank;
- Fitness;
- Agenda;
- Supabase;
- Google Calendar;
- Vitrine.

Não há migration.

## Teste recomendado

### Telefone
1. Abra Suplementos.
2. Confira se a navegação voltou a ter cara de mobile.
3. Abra Comercial.
4. Abra Novo Orçamento.
5. Abra Produto.
6. Abra Agenda.
7. Abra Bank.
8. Abra Fitness.
9. Abra `Menu`.
10. Confira `Ferramentas`.
11. Abra Nexus.
12. Abra Relatar problema.

### Desktop
1. Confira que a barra global de Ferramentas sumiu.
2. Abra `Ferramentas` na sidebar.
3. Teste Meu Dia.
4. Teste Nexus.
5. Teste Command.
6. Teste Rotinas.
7. Teste Qualidade.
8. Teste Relatar problema.
9. Confira que o V45.9 continua deixando as fontes legíveis.

## Commit sugerido

`V45.11 - recupera UX mobile e corrige sidebar e fila Nexus`


## Hotfix incluído · sidebar recolhida

Ao ocultar a sidebar no desktop, o shell ainda mantinha a coluna original
de 252 px reservada.

Agora:
- a coluna passa de 252 px para 0;
- o conteúdo principal ocupa o espaço liberado;
- a tela redimensiona de verdade;
- a transição é curta e respeita `prefers-reduced-motion`.

## Hotfix incluído · Nexus Fila

O score continua existindo e continua sendo usado pelo Nexus para ordenar
a Fila Única, porém não é mais exibido no card.

Antes:
`Urgente · Bank · score 97`

Agora:
`Urgente · Bank`

Para `bank_invoice`, quando o resumo começava com valor zero apenas porque
a fatura ainda não possuía valor consolidado:

Antes:
`R$ 0,00 · Banco do Brasil`

Agora:
`Banco do Brasil`

Se houver valor real maior que zero, o valor continua aparecendo normalmente.

A mesma limpeza é usada no card `Nexus · Faça primeiro`.

Nenhuma regra de prioridade, vencimento ou ordenação foi alterada.
