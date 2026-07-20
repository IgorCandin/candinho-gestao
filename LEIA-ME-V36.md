# Candinho Company · V36
## Correção Pâmella + Rede Candinho gerencial

Base esperada:

`25d92321aa7a8f709a0b56f81ae25de74af8989e`

---

## 1. Causa do erro da parceria da Pâmella

A parceria:

`C.T.S. Pâmella Nunes`

possui histórico legado recuperável.

Ao abrir a ficha, o frontend consultava diretamente:

`inventory_history`

Essa tabela teve escrita/leitura direta endurecida nas versões de segurança.

Parceiros sem histórico legado não executavam essa consulta, por isso a falha parecia acontecer especificamente na Pâmella.

---

## 2. Correção

Nova RPC:

`partner_legacy_history_snapshot(uuid)`

Ela:

- valida acesso à operação Suplementos;
- lê o histórico legado internamente;
- remove o registro `Marco zero teste`;
- agrupa duplicidades pelo identificador antigo;
- preserva as duas movimentações reais de coqueteleira;
- não inventa se o movimento era brinde;
- retorna somente os dados necessários à tela.

O frontend deixa de consultar `inventory_history` diretamente.

Além disso, o histórico legado passa a ser uma informação opcional:

uma falha nessa camada não derruba mais toda a página do parceiro.

---

## 3. Rede Candinho

A tela `/parceiros` ganhou uma camada gerencial.

### Indicadores

- parceiros ativos;
- vendas do ciclo;
- faturamento do ciclo;
- acertos pendentes;
- pontos com estoque.

### Atenções

- parceiros ativos sem venda há 30 dias;
- parceiros sem venda registrada;
- cadastros sem telefone, cidade ou responsável.

### Estoque na rede

Mostra parceiros com unidades físicas vinculadas ao ponto:

- parceiro;
- código/local;
- quantidade no ponto;
- acesso direto à ficha.

---

## 4. O que não foi alterado

- cálculo de comissão;
- vendas;
- acertos;
- estoque;
- histórico antigo;
- Meta;
- Marketing;
- Bank;
- Fitness;
- Portal Parceiro.

---

## 5. Supabase

Migration aplicada diretamente:

`20260720162000_v36_partner_legacy_history_rpc.sql`

RPC:

- SECURITY DEFINER;
- search_path=public;
- authenticated=true;
- anon=false.

---

## Commit sugerido

`V36 · Corrige parceria Pâmella e evolui gestão da rede`
