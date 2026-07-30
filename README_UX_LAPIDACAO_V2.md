# UX Lapidação V2

Pacote de continuidade após Nexus Operating Layer + Nexus Fitness/Vitrine.

## 1. Nexus operacional mais legível

A tela Hoje e a Central do Nexus continuam compactas, mas os textos que estavam
pequenos demais foram ampliados, especialmente:

- descrição do Nexus;
- títulos e resumos dos sinais;
- microtextos dos KPIs;
- rotina aprendida;
- botões compactos.

No mobile o aumento é maior para preservar a leitura sem transformar a tela em
uma sequência gigante de cards.

## 2. Vitrine pública refinada

O `/catalogo` e `/catalogo/[slug]` ganham uma camada final de UX:

- textos maiores;
- inputs legíveis no iPhone;
- botões com mais altura;
- ícone e escrita com espaço consistente;
- cards do catálogo mais fáceis de ler;
- nome e preço dos produtos maiores no mobile;
- badges de disponibilidade/promoção mais legíveis;
- conversa com Nexus com tipografia maior por herança da nova camada.

A lógica, preços, Nexus e páginas individuais não mudam.

## 3. Produtos com estoque em verde na Nova Venda

Em `/vendas/nova`, o seletor de produto passa a considerar o
**estoque/deposito de origem selecionado**.

- disponibilidade > 0: opção verde;
- disponibilidade 0: aparência normal;
- mantém a ordem alfabética atual;
- produto com saldo mostra também `N disp.`;
- o próprio select fica verde quando o produto escolhido possui saldo;
- no iPhone, mesmo quando o seletor nativo limita cores, a quantidade disponível
  continua aparecendo no texto.

A melhoria é somente visual e não altera reserva, baixa ou preço.

## 4. Recompensa de parceiro sem ambiguidade

No parceiro com brinde por meta:

- se já existe recompensa realmente disponível:
  **Entregar recompensa**
- se ainda falta venda para a meta:
  **Registrar antecipada**

Abaixo do botão aparece a próxima meta e quantas vendas faltam.

Exemplo:
`Próxima meta 90 · faltam 7 venda(s).`

O botão novo aciona a mesma função de registro que já existia. Nenhuma regra de
recompensa foi alterada.

## 5. Pendências do cadastro do parceiro

Na ficha `/parceiros/[id]`, o topo da coluna lateral agora mostra:

**Pendências do cadastro**

com:

- percentual de completude;
- campos completos / total;
- quantidade de pendências;
- lista exata do que falta;
- botão `Completar cadastro`.

Campos avaliados sempre:
- Nome
- Tipo
- Responsável
- Telefone
- Cidade
- Referência
- Data de início
- Modelo da parceria
- Regra do acerto

Campos condicionais:
- Descrição da recompensa, quando existe recompensa;
- Meta de vendas, para brinde por meta;
- Valor/percentual, quando aplicável;
- Dia do acerto, se mensal;
- Ponto físico relacionado, se o parceiro mantém estoque ou é ponto de retirada.

Cupom, fim da parceria e observações continuam opcionais e não derrubam o 100%.

## Banco

Sem migration.
Sem SQL.
Sem alteração de estrutura do Supabase.

## Aplicação

1. Extrair na raiz do repositório.
2. Substituir os arquivos.
3. GitHub Desktop.
4. Commit.
5. Push origin.
6. Testar o deploy.

Commit sugerido:

`fix: lapida UX do Nexus, vitrine, venda e parceiros`
