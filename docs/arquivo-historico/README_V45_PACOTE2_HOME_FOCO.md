# Candinho V45 · Pacote 2 — Home Foco

## Objetivo
Transformar a tela inicial em um seletor simples de operação.

### Antes
- Cards com KPIs.
- Operações divididas em faixas.
- Physique tratado como operação principal.
- Sala do Dono competindo com os acessos do dia a dia.

### Depois
- Logo completa Candinho Company.
- `Olá, {usuário}.`
- `Escolha sua operação.`
- 5 operações principais:
  - CS · Suplementos
  - CF · Fitness
  - CM · Marketing
  - CB · Bank
  - CCE · Central
- Nome da operação logo abaixo do ícone.
- Atalhos secundários:
  - Vitrine
  - Physique
  - Perfil
  - Sair
- Sala do Dono continua existindo no ERP, mas não aparece mais na Home.
- A Home não consulta mais o snapshot de KPIs operacionais.

## Segurança
As permissões atuais foram preservadas. O usuário só vê as operações que já podia acessar.

## Arquivos
Substituir:
- `src/app/(app)/dashboard/page.tsx`
- `src/app/globals.css`

Adicionar:
- `src/app/company-home-focus-v45.css`
- `public/home-operation-cs.png`
- `public/home-operation-cf.png`
- `public/home-operation-cm.png`
- `public/home-operation-cb.png`
- `public/home-operation-cce.png`

## Aplicação
1. Extrair este ZIP na raiz do `candinho-gestao`.
2. Aceitar substituição dos arquivos.
3. Revisar no GitHub Desktop.
4. Commit sugerido:
   `V45.1 - simplifica home e concentra operacoes`
5. Push para `main`.
6. Aguardar deploy da Vercel.
