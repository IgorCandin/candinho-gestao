# Correção Vercel — Analytics + Speed Insights

O deployment anterior falhou durante `npm install` porque o `package-lock.json` continha URLs de um registry interno do ambiente de geração para os pacotes `@vercel/analytics` e `@vercel/speed-insights`.

As URLs foram substituídas pelas URLs públicas oficiais do npm registry:
- `https://registry.npmjs.org/@vercel/analytics/-/analytics-2.0.1.tgz`
- `https://registry.npmjs.org/@vercel/speed-insights/-/speed-insights-2.0.0.tgz`

Validação local após a correção:
- `npm ci --registry=https://registry.npmjs.org --ignore-scripts` concluído com sucesso.
- ESLint concluído com sucesso.
- TypeScript (`npx tsc --noEmit`) concluído com sucesso.
- Next.js compilou com sucesso; a execução do comando foi encerrada pelo limite de tempo do ambiente durante a etapa posterior de TypeScript, já validada separadamente.
