# Home V4 — Central + logos padronizadas

Este patch altera somente a tela inicial e os arquivos visuais das marcas.

## Alterações
- Adiciona Candinho Central como primeira operação.
- Home: Central | Suplementos | Fitness | Bank.
- Segunda linha: Parceiros | Perfil | Integrações.
- Texto: "Olá, [Usuário]." e "Escolha sua operação."
- Padroniza as logos a partir dos arquivos oficiais enviados pelo usuário.
- Atualiza também os arquivos-base usados no login, sidebar e cabeçalho mobile.
- Central usa a identidade Candinho com o rótulo CENTRAL.

## Validação
- npm run lint: 0 erros (1 aviso pré-existente em central/midia sobre <img>).
- npm run build: compilação, TypeScript, páginas estáticas e rotas concluídos.
