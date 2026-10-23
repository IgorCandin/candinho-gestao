# Lote mobile e busca — 23/10/2026

- Reutiliza o guard de menus, testes e mapa do PR #63; nenhuma aprovação anterior removida.
- Busca por telefone em Vender (prioridades, leads, estimativas, tamanho/estoque, reativação e contatos) e Acompanhar. Usa apenas telefones já presentes nas props autorizadas; não amplia consultas ou acesso. Pontuação é normalizada para fragmentos com pelo menos quatro dígitos, mantendo busca textual, filas, filtros e paginação.
- Botão Voltar com nome acessível e alvo 44×44 até 420px; coluna do cabeçalho cresce junto. Handler de navegação preservado.
- Dois testes de componente reproduziram a falha antes da correção (11 passaram, 2 falharam); após a correção, 18 testes focados passaram, incluindo menus/mapa do #63. Suíte completa: 174/174. Lint dos quatro arquivos de runtime sem erros. `git diff --check` aprovado.
- Normalizados os finais de linha duplicados do componente Acompanhar, sem refatorar sua lógica de atendimento.
- Build/TypeScript e publicação dependem da conferência do deployment por SHA. Teste em navegador responsivo não equivale à homologação em Safari físico. Nenhum registro comercial alterado.
