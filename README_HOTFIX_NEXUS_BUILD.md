# Hotfix Nexus Build V1

Corrige tipagem TypeScript do Mega Pacote Nexus Operating Layer V1.

Erro original da Vercel:
`Parameter 'value' implicitly has an 'any' type`

Arquivos:
- `src/lib/nexus-operating-context.ts`
- `src/app/api/nexus/ask/route.ts`

Não há SQL e não há migration.

Aplicação:
1. Extrair na raiz.
2. Substituir os arquivos.
3. Commit.
4. Push origin.

Commit sugerido:
`fix: corrige tipagem do Nexus Operating Layer`
