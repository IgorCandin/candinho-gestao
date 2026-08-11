# V45.18 · Padronização final das operações

## Objetivo
Fechar a auditoria de namespaces sem criar telas novas.

## Resultado da auditoria
- Suplementos: URL canônica `/suplementos/...` mantida pela V45.17.
- Fitness: já nativo em `/fitness/...`.
- Bank: já nativo em `/bank/...`.
- Central: já nativo em `/central/...`.
- Marketing: já possuía páginas nativas:
  - `/marketing/ideias`
  - `/marketing/planejamento`
  O problema era apenas alguns atalhos antigos apontando para a Central.
- Parceiro: já nativo em `/parceiro/...`.
- Physique: auditado e consistente em `/physique/...`.
- Nexus: permanece global em `/nexus/...`.

## Mudanças V45.18
1. Links antigos:
   - `/central/midia?scope=marketing` -> `/marketing/ideias`
   - `/central/agenda?scope=marketing` -> `/marketing/planejamento`
2. Compatibilidade adicional:
   - `/marketing/midia` -> `/marketing/ideias`
   - `/marketing/agenda` -> `/marketing/planejamento`
3. A camada canônica já existente da V45.17 passa a corrigir também os
   atalhos do Marketing e o destaque ativo do menu.
4. Remove os quatro instaladores temporários da limpeza do Bank Lab:
   - `APLICAR_V45_16_1.bat`
   - `APLICAR_V45_16_1.ps1`
   - `APLICAR_V45_16_2.bat`
   - `APLICAR_V45_16_2.ps1`

## O que NÃO muda
- nenhuma migration;
- nenhuma tabela do Supabase;
- nenhuma regra do Nexus Fitness;
- nenhuma tela funcional;
- nenhuma rota física de Suplementos;
- nenhuma lógica de Bank, Fitness, Central, Parceiro ou Physique.

## Commit sugerido
`V45.18 - padroniza rotas das operações e limpa temporários`
