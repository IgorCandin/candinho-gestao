# Candinho V45.9 · UI Foundation

## Objetivo

Corrigir a sensação de ERP pequeno, apertado e dependente de zoom do navegador.

O V45.9 não cria módulo novo e não altera regras de venda, estoque, agenda, Bank ou CRM.
É uma camada visual global aplicada somente ao ERP autenticado.

## Diagnóstico que motivou o pacote

A auditoria das folhas V45.3–V45.8 encontrou 140+ regras recentes com fonte abaixo de 10 px.
Havia textos na faixa de 5–8 px em:

- Nexus Daily;
- Fila Única;
- Command;
- Meu Dia;
- Rotinas;
- UX Doctor;
- Comercial V45.8;
- Barra de ferramentas;
- gestor de banners.

O UX Doctor também mostrou vários `fixed_clip`, mas a maior parte era falso positivo vertical:

- topbar;
- sidebar;
- menu mobile;
- lateral da nova venda;
- lateral do detalhe da venda;
- painel de imagens de produto.

Esses elementos estavam apenas acima/abaixo da viewport durante o scroll.

## 1. Escala tipográfica oficial

O ERP passa a trabalhar com uma escala mínima previsível:

- micro: 10 px;
- auxiliar: 11 px;
- label/botão: 12 px;
- texto base: 13 px;
- texto médio: 14 px;
- título de seção: 16 px;
- título de página: 22–30 px.

No tablet/mobile a base sobe levemente para preservar leitura e toque.

A meta é usar Chrome em 100% de zoom.

## 2. Formulários e controles

Padronizado:

- input/select/textarea: mínimo 36 px no desktop;
- botão normal: mínimo 36 px;
- botão compacto: mínimo 32 px;
- mobile: controles entre 38–42 px;
- labels deixam de ficar microscópicos.

## 3. V45.3–V45.8 normalizados

A nova folha sobrescreve as microfontes acumuladas nas versões recentes sem precisar reescrever cada componente.

Foram auditados e normalizados seletores de:

- Nexus Daily;
- Preview Seguro;
- Nexus Command;
- Fila Única;
- Meu Dia;
- atalhos pessoais;
- Rotinas;
- UX Doctor;
- Comercial/Promoções;
- Barra de ferramentas;
- Banners de produto.

## 4. Vendas e orçamento responsivos

Em notebook, janela dividida ou viewport <= 1360 px:

- `.new-sale-side` deixa de competir por uma coluna estreita;
- `.sale-details-side` deixa de competir por uma coluna estreita;
- a lateral vira bloco abaixo do conteúdo principal;
- sticky é removido nessa largura;
- não é necessário diminuir zoom para caber.

Em telas largas, o layout original continua disponível.

## 5. Produto responsivo

Abaixo de 1180 px:

- painel de imagens deixa de forçar coluna estreita;
- gestor Desktop/Mobile de banners vira uma coluna;
- painel de imagens passa a ocupar a largura disponível.

## 6. Nexus mais legível

Cards continuam compactos, porém textos de ação, prioridade, recomendação, atalhos e histórico sobem para uma faixa legível.

No tablet/mobile:

- Próxima Ação vira uma coluna quando necessário;
- métricas reorganizam em 2 colunas;
- cards complexos viram uma coluna no telefone.

## 7. Barra Ferramentas

A barra criada no V45.8 continua não-flutuante, mas agora tem:

- altura melhor;
- texto legível;
- atalhos com 11 px;
- mobile em uma coluna dentro do accordion.

## 8. UX Doctor V2 do detector

Corrigido o algoritmo de `fixed_clip`:

### Sticky
Para elementos `position: sticky`, apenas overflow horizontal conta como quebra.

Scroll vertical normal não vira alerta.

### Fixed
Para elementos `position: fixed`, clipping vertical só é avaliado se o elemento realmente intercepta a viewport.

Elementos completamente fora da tela por animação/recolhimento são ignorados.

### Zoom do navegador
Overflow horizontal não é registrado quando `visualViewport.scale` está significativamente diferente de 1.

Isso evita atribuir ao ERP uma quebra criada pelo próprio zoom/pinch do navegador.

## 9. Limpeza realizada no UX Doctor

Foram removidos da produção apenas sinais técnicos antigos reconhecidos como falso positivo do detector.

Não foram apagados:

- relatos manuais feitos pelo botão Quebra;
- tarefas;
- vendas;
- clientes;
- agenda;
- dados operacionais.

## 10. Escopo seguro

A classe `v459-erp` é adicionada somente no layout autenticado.

Portanto a normalização NÃO afeta:

- login;
- Vitrine pública;
- página pública de produto.

## Banco

V45.9 não precisa de migration.

Apenas houve limpeza de sinais técnicos falsos em `ux_health_signals`.

## Teste recomendado após deploy

Use Chrome em 100%.

1. Suplementos → Hoje.
2. Novo Orçamento.
3. Vendas.
4. Abrir uma venda.
5. Agenda.
6. Produtos.
7. Abrir um produto.
8. Clientes/Radar.
9. Meu Dia.
10. Fila Única.
11. Rotinas.
12. Qualidade.
13. Bank.
14. Fitness.
15. Repetir as principais no telefone.

O que observar:

- não precisar aumentar zoom para ler;
- botões continuarem compactos;
- textos auxiliares legíveis;
- nenhuma lateral espremida em janela menor;
- tabela com scroll próprio quando realmente necessário;
- ausência de conteúdo por cima de conteúdo.

## Commit sugerido

`V45.9 - normaliza tipografia e responsividade do ERP`
