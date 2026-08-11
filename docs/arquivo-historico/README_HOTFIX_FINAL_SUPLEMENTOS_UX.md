# Pacote final de UX — Suplementos

Este pacote reúne os últimos pontos encontrados durante o teste operacional.

## 1. Leads convertidos
- Leads com status `Convertido` deixam de aparecer na tela ativa de Leads.
- O registro original não é apagado.
- A origem continua preservada para orçamento/venda por meio dos vínculos já existentes.
- A alteração do banco **já foi aplicada em produção**.
- A migration está neste ZIP apenas para manter o GitHub sincronizado.

## 2. Reconciliação de estoque / ponto da Ingrid
Antes, a pendência dizia para conferir/recontar, mas os botões só mudavam o status da revisão.

Agora:
- pendência de local mostra **Recontar agora**;
- abre a contagem física com o ponto já fixado;
- pendência de produto mostra **Corrigir estoque**;
- “Marcar resolvido” continua existindo apenas como etapa de auditoria.

## 3. Materiais / insumos
A edição já existia, mas estava escondida.

Agora a tela de Custos mostra uma chamada clara:
**Editar / arquivar materiais**

Nessa área é possível:
- alterar o nome;
- alterar operação/unidade/mínimo;
- corrigir regra de consumo;
- corrigir saldo e custo;
- arquivar o material.

### Por que arquivar em vez de apagar?
Materiais podem estar ligados a movimentos, compras, vendas e snapshots de custo.
Apagar fisicamente destruiria a referência histórica. Arquivar tira do uso futuro sem estragar o passado.

## Como aplicar
1. Extraia o ZIP na raiz do projeto `candinho-gestao`.
2. Confirme a substituição dos arquivos.
3. Abra GitHub Desktop.
4. Commit.
5. Push origin.

Commit sugerido:

`fix: finaliza UX de leads materiais e reconciliação de estoque`

## Importante
Não rode SQL manualmente para o filtro dos Leads convertidos.
A migration `20260728004833_hide_converted_leads_from_active_history.sql`
já está aplicada no Supabase de produção.
