# Auditoria de integridade do backend — 2026-08-18

Este documento registra o estado observado antes das migrations e o resultado
da aplicação autorizada em produção. As migrations foram aplicadas e validadas
em 2026-08-17; nenhuma quantidade de estoque foi criada ou alterada.

## 1. Segurança

- 85 funções `SECURITY DEFINER` internas herdavam `EXECUTE` de `PUBLIC`.
- 21 views internas executavam com os direitos do proprietário.
- Os RPCs públicos da vitrine possuem concessões explícitas para `anon` e foram
  preservados pela migration de segurança.
- Funções anônimas preservadas: `public_storefront_snapshot`,
  `public_storefront_product_page_v1`, `public_storefront_slug_map_v1`,
  `public_storefront_top_sellers`, `public_product_banner_v1`,
  `public_catalog_advisor_snapshot_v1`, `public_catalog_backorders_v1`,
  `public_catalog_match_candidates_v1`, `public_catalog_question_count_v1`,
  `public_catalog_track_event_v1`, `public_create_catalog_lead_v1`,
  `public_create_catalog_lead_v2`, `public_create_fitness_catalog_lead_v1`,
  `public_fitness_available_options_v1`,
  `public_register_catalog_demand_gap_v1` e `resolve_login_email`.
- Resultado após aplicação: zero funções privilegiadas herdando acesso de
  `PUBLIC`, zero views-alvo inseguras e zero erros no advisor de segurança.

## 2. Vendas entregues ainda ativas

As quatro vendas abaixo estão entregues e com estoque baixado, mas ainda são
recebíveis. Portanto, `active` é o estado correto até o recebimento; nenhum
registro deve ser finalizado manualmente.

| Venda | Cliente | Data | Total | Pagamento |
|---|---|---:|---:|---|
| `f0e25cde-3ee9-4ae5-a7ec-0c4a3262024b` | Willians - CP | 2026-07-16 | R$ 500,00 | receivable |
| `cc162416-2aac-4c02-b403-c7c6cb9bd151` | Francyelle Nascimento - CP | 2026-08-07 | R$ 69,90 | receivable |
| `9cd6a364-3d1b-4ada-9a00-e6a3d19bc993` | Francyelle Nascimento - CP | 2026-08-14 | R$ 39,90 | receivable |
| `47d1592a-d551-4ef9-9c30-4c0513c2be57` | Geciane Silva - CP | 2026-08-14 | R$ 74,90 | receivable |

A migration adiciona uma regra que só finaliza automaticamente uma venda
quando entrega e pagamento estiverem concluídos.

## 3. Datas financeiras incompatíveis

Foram encontrados 14 registros, todos leads convertidos e finalizados, com
`payment_status = not_applicable` e vencimento residual. Eles não aparecem na
agenda real de recebíveis, mas o resíduo pode contaminar consultas futuras.

| Registro | Cliente | Vencimento | Total |
|---|---|---:|---:|
| `1313d786-f546-4960-a3e2-7b333fff5e20` | Francyelle Nascimento - CP | 2026-07-29 | R$ 49,90 |
| `b257fe04-41b5-4272-8f14-85a3a8c8aa2b` | Willians - CP | 2026-08-01 | R$ 494,10 |
| `24f43b3f-19d7-43c8-bc9c-584a67487e0e` | Igor Rodrigues - CP | 2026-08-01 | R$ 99,90 |
| `4ecce58e-2466-4455-a3ef-8aebae828a7e` | Wesley Figueiredo - CP | 2026-08-01 | R$ 49,90 |
| `7fb97030-33c1-482a-92f3-8b8646372a85` | Isaías Cabral - CP | 2026-08-01 | R$ 69,90 |
| `23b95282-6e99-478f-8fa6-0d79ff847f1d` | Isaías Cabral - CP | 2026-08-01 | R$ 99,90 |
| `6790e5ae-b0c5-4120-bb1a-a01eba7f4cbb` | Willians - CP | 2026-08-01 | R$ 454,20 |
| `4789cfd9-0805-44ef-9fd4-eb673493d916` | Catiane dos Reis - CP | 2026-08-05 | R$ 49,90 |
| `efbc1e4a-414b-4526-922d-afe480088715` | Dona Marta - AC | 2026-08-07 | R$ 84,90 |
| `7ef9ae80-0a0a-4688-833d-91b1f48277a0` | Willians - CP | 2026-08-08 | R$ 500,00 |
| `1a088ac0-4e7f-4b60-8055-a61763b37f7c` | Rafael Breder - AC | 2026-08-08 | R$ 49,90 |
| `b376794a-4224-4f64-8ed0-b4a653805a4b` | Rafael Breder - AC | 2026-08-09 | R$ 49,90 |
| `6464ec55-10e0-4880-94f7-1590e79be559` | Emanuel Teixeira - CP | 2026-08-12 | R$ 149,90 |
| `d7c55823-c5c4-4efe-8c57-3199f10c25f8` | Camila Nogueira - CP | 2026-09-01 | R$ 69,90 |

Antes de limpar os campos residuais, a migration grava vencimento, forma e
condição anteriores em `audit_events`. A view financeira passa a exigir
explicitamente `payment_status = receivable`.

## 4. Fila de recompra

Estado encontrado: 270 lembretes planejados, dos quais 44 tinham último evento
`contacted`, 25 `skipped`, 1 `no_response` e 200 nunca contatados. Os 44 abaixo
serão concluídos pela migration; nenhum lembrete nem tentativa será apagado.

| Lembrete | Cliente | Produto |
|---|---|---|
| `af92dd38-ba1d-4d05-bbb2-7e6a60e9ed6a` | Elian Valerio - AC | Abduzido 300g |
| `6ab0f496-c0ef-4c75-8dde-3f2e315dc3b8` | Lucas Conferente- EF | Touro Power 120 Cápsulas |
| `211d937f-e2c0-4914-9c95-83046da27569` | Leandro Louback - AC | Whey Protein 1kg Soldiers |
| `78f98412-5e62-4ab7-9e15-3916fb677ba2` | Nicolas Teixeira - CP | Whey Protein 1kg Soldiers |
| `8ddc5d54-0e0e-4c29-a607-a2c217aed40e` | Julliete Almeida - CP | Uxi Amarelo + Unha-de-Gato |
| `1a8ee9e6-e4bf-4c26-9db3-066dade908aa` | Leiziane Souza - AJ | Touro Power 120 Cápsulas |
| `14209471-968b-4742-8a29-28285552502a` | Willians - CP | Complexo B 60 Cápsulas |
| `b73841ac-d281-4caf-a8f3-dd033399b859` | Rafael Breder - AC | Cafeína 420mg 60 Cápsulas |
| `8ef8ca3e-7e9f-4eeb-bb0c-c076e8f62443` | Rafael Breder - AC | Creatina Mastigável 120 Comprimidos |
| `9a36037a-6f6b-42fd-9419-bd5e474068e9` | Lorena Gaspar - CP | Whey Protein 1kg Soldiers |
| `bf185d5c-8e4c-4419-82fc-ca8fb640d574` | Weverte Lopes - CP | Beterraba 120 Cápsulas |
| `1aa8f611-9e3e-48de-b3f7-764ad8b8326f` | Francyelle Nascimento - CP | Ashwagandha + Moringa + Maca Negra |
| `610ba5f8-98db-4e16-9037-e81d2310726f` | Eder Freire - CP | Abduzido 300g |
| `eac82634-7af4-4d80-8103-8c0a33763703` | Rhaiani UPS - CP | Cafeína 400mg |
| `6f97d11b-e3c5-4f6c-8777-11f7fc7c388e` | Rhaiani UPS - CP | Touro Power 120 Cápsulas |
| `cde048d1-df52-4b18-a67d-824c0109c2df` | Raquel Grativol - CP | Ashwagandha + Moringa + Maca Negra |
| `7a134f21-e06c-41fd-ab75-675c8e3cdbed` | Raquel Grativol - CP | Abduzido 300g |
| `cd98c51c-4d5f-470b-9460-60655589b48a` | Lucas Caetano - CP | Touro Power 120 Cápsulas |
| `6eeb4c6d-2671-484d-ae2c-2a0b02093adf` | Camila Nogueira - CP | Cafeína 400mg |
| `c0377b03-29ff-4145-be0e-c6e105a4273f` | Renan - CP | Touro Power 120 Cápsulas |
| `8dcb3e81-2698-4cc9-b6c7-38c0bbdd9493` | Alice Cunha - CP | Touro Power 120 Cápsulas |
| `178eec38-111a-4049-8b94-d58dc8ddd8ee` | Sammerson Grativol - CP | Ashwagandha + Moringa + Maca Negra |
| `cd98c588-c23b-4aab-9607-1cd1dba19ba5` | William Dantas - CP | Cafeína 400mg |
| `a92818fe-75dc-48c7-9ee4-f9b8219945d0` | Emanuel Teixeira - CP | Touro Power 120 Cápsulas |
| `4d02648f-d2c0-4e34-a682-5014c521fc72` | Emanuel Teixeira - CP | Beta-Alanina 200g |
| `6fab4990-aeba-4242-a1b7-247f2b9bd4d1` | Ana Luiza - CP | Abduzido 300g |
| `44d5b106-278b-4fd2-bb74-1452a6354141` | Raiane Copertino - CP | Abduzido 300g |
| `f0ca7760-5289-413d-94e7-ae342db12866` | Taiane Macedo - CP | Ashwagandha + Moringa + Maca Negra |
| `9a310351-d2ea-4fbc-843b-a90cb8b8a797` | Zezinha Reis - CP | Touro Power 120 Cápsulas |
| `874e52a5-43eb-4716-b58b-9f13291848bf` | Josi - CP | Touro Power 120 Cápsulas |
| `4221473a-8671-43f1-894b-5c7edc0ae7f3` | Kika - CP | Touro Power 120 Cápsulas |
| `58574ffb-5498-4789-8732-fcc79c86dd70` | Pâmella Nunes - CP | Touro Power 120 Cápsulas |
| `2f76ea31-e343-4272-a569-3a4382d8db8a` | Pâmella Nunes - CP | Ashwagandha + Moringa + Maca Negra |
| `3cf0c8eb-96d3-4b12-a695-9d1af5932e06` | Lidiane Lacerda - CP | Touro Power 120 Cápsulas |
| `d1156371-1323-4578-a10d-6f3b23db2847` | Ingrid Rodrigues - AJ | Touro Power 120 Cápsulas |
| `a57a5332-0b28-46cf-83bb-844f7e778eb7` | Denizia Figueiredo - CP | Abduzido 300g |
| `3a397683-4592-4ae9-809e-89e8b7945e49` | Denizia Figueiredo - CP | Touro Power 120 Cápsulas |
| `0207b999-71c7-4188-a86b-aa2701770036` | Denizia Figueiredo - CP | Ashwagandha + Moringa + Maca Negra |
| `a2b9bc5d-3cfb-45c8-a0b5-e0d22924bcc5` | Renato Xavier Filho - CP | Ashwagandha + Moringa + Maca Negra |
| `9745f570-da47-4e03-8708-1f12ff22fa50` | Pablo Paulo - CP | Ashwagandha + Moringa + Maca Negra |
| `640489de-6ae6-4eae-bd74-836611c9651b` | Hemyllay Alves - CP | Creatina Mastigável 120 Comprimidos |
| `01ce18bd-b37b-4775-a208-4942b0034c3c` | Wesley Figueiredo - CP | Ashwagandha + Moringa + Maca Negra |
| `2f8e383d-d998-45ae-99d0-baeb99d31341` | Wesley Figueiredo - CP | Thermo Crazy 60 Cápsulas |
| `a9a81db9-78af-4717-8a5d-87276651f61d` | Wesley Figueiredo - CP | Whey Isolate Protein 1,8kg |

Os 25 `skipped` e o único `no_response` continuam pendentes e tiveram a data
reagendada para `next_eligible_on`. Os 200 nunca contatados permaneceram
intactos. Resultado: 44 concluídos, 226 planejados e 21 cancelados; nenhum
registro foi apagado.

## 5. Pós-venda

Nos registros de venda: 61 `completed`, 206 `Concluído`, 1 `Contato perdido`,
14 `planned` e 25 vazios. O padrão proposto é:

- `not_scheduled`
- `planned`
- `completed`
- `lost_contact`
- `cancelled`

`lost_contact` permanece semanticamente diferente de `completed`. Todos os
valores anteriores são registrados em auditoria antes da normalização.

## 6. Estoque — depende de conferência

### Ativos sem qualquer linha de saldo (17)

Army Super Mass; Ashwagandha W Nutry; BCAA FTW; Biotina Ouro Pharma; Cafeína
Pure Energy; Cobavital; Creatina Health Labs; Enantato; Feno-Grego; Kit Whey
Protein; Massive Mass FTW; Moringa; Oxandrolona; Pholia Magra; Trembolona;
Vitamina B12 Ouro Pharma; Whey Dark Lab.

Todos possuem pelo menos uma venda não cancelada, mas nenhum saldo será criado
até a confirmação de quais continuam ativos e são controlados individualmente.

### Ativos com saldo total zero (19 produtos / 23 linhas de localização)

Anabolic Mass; Complexo de Magnésio; Creatina Growth; CreaGummy; Creatina Turbo;
Diabo Verde; HMB Pure; Maca Peruana; Masstodon; Melatonina; Multivitamínico A-Z;
NAC + Selênio; Ômega 3 OficialFarma; Picolinato de Cromo; Taurina; Whey 100% FTW;
Whey 100% HD Black Skull; Whey Concentrado Dark Lab; Whey Gourmet FN Forbis.

As quantidades precisam de conferência física; a IA não atribuirá números.

## 7. Produtos restritos — despublicação autorizada

| Produto | Produto ID | Página pública ID | Publicado |
|---|---|---|---|
| Enantato | `50d40a6c-44e7-4a54-8c67-ad20a8aa712b` | `f162ab53-3d99-4152-95d5-b85b80bba0d1` | sim |
| Oxandrolona | `a8dd3835-5e13-4549-bce3-aaf9f8d97c76` | `e798e748-1612-44aa-91cd-6124cdffb237` | sim |
| Trembolona | `0ac6ea27-4aa6-40f3-a464-973fb8f28395` | `b4e96381-5416-44a2-9cc4-30f26beaabf4` | sim |

A confirmação foi recebida em 2026-08-17. A migration definiu somente
`published = false` nessas três páginas. Produtos, vendas e histórico foram
preservados, e os valores anteriores foram registrados em `audit_events`.

## 8. Vitrine e preço em até 3x

Os produtos já possuem `installment_price`, mas o RPC público retornava apenas
o preço à vista. A migration cria `public_storefront_snapshot_v2` com
`cash_price`, `installment_price`, `installments_max = 3` e
`installment_value`. O adaptador de dados passa a consumir esse RPC. Nenhum
componente visual foi alterado nesta etapa.

## Decisões que dependem do responsável

1. Autorizar ou não a despublicação dos três produtos restritos.
2. Confirmar quais dos 17 produtos sem saldo continuam ativos/controlados.
3. Conferir fisicamente os 19 produtos com saldo zero.
4. Informar estoque mínimo e ideal dos itens relevantes.
5. Revisar apenas casos financeiros ambíguos futuros; os 14 registros acima são
   leads, não recebíveis reais.
