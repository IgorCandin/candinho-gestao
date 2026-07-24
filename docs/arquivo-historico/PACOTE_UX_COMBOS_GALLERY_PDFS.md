# Pacote UX — Combos, Gallery, Busca e PDFs Premium

## Produtos / Combos
- Área separada em Produtos > Combos.
- Cadastro e edição de combos dentro do site.
- Combo é um template comercial formado por produtos reais; não cria estoque fictício próprio.
- Disponibilidade do combo é calculada pela disponibilidade dos componentes.
- Os 4 combos antigos foram importados como modelos e ficam com configuração pendente até que seus componentes sejam definidos.
- No Novo Orçamento, combos configurados podem ser aplicados e são convertidos nos produtos reais do combo, com o desconto comercial correspondente.

## Gallery
- Alternância Deck / Gallery.
- Controle de densidade/zoom para aumentar ou reduzir a quantidade de produtos por linha.
- Alternância Completo / Essencial.
- Essencial prioriza foto, nome e disponibilidade.
- Completo mantém preços e demais informações.
- Cores de estoque e ícone de caminhão continuam ativos.

## Novo Orçamento
- Busca digitável de cliente por nome, cidade ou telefone.
- Seleção continua vinculada ao cliente real cadastrado.

## Cards clicáveis
- StatCards/resumos das áreas principais passam a navegar para a tela relacionada quando existe um destino natural.

## PDFs
- Orçamento com identidade premium escura, preta e dourada, hierarquia visual e resumo financeiro destacado.
- Catálogo com capa premium e acabamento visual alinhado à Candinho Suplementos.

## Validação
- ESLint sem erros.
- TypeScript sem erros.
- Build de produção compilou e gerou BUILD_ID, incluindo as novas rotas de Combos e PDFs.
- Função de criação/edição de combo testada no Supabase em transação com rollback; nenhum dado de teste foi mantido.
