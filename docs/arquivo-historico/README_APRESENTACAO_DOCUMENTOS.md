# Candinho — Apresentação institucional + Documentos Oficiais

Este ZIP foi pensado para ser aplicado depois do hotfix da Central Operacional V2.

## O que entra

### 1. Apresentação da Candinho
- `/central/apresentacao` = administração da base institucional.
- `/apresentacao` = página limpa e segura para mostrar ou compartilhar.
- A apresentação usa somente `central_company_profile_sections` com `public_safe = true`.
- Não consulta clientes, estoque, banco, custos, margens ou documentos.

### 2. Atualizar informações com Nexus
Na Central existe o botão **Atualizar informações**.

Aceita:
- PDF
- TXT
- Markdown
- JPEG
- PNG
- WebP

O arquivo fica privado no bucket `central-company-files`.

O Nexus só pode atualizar:
- identidade
- propósito
- como trabalhamos
- presença
- diferenciais
- história

O prompt e uma segunda filtragem no servidor bloqueiam dados como CPF/CNPJ, telefone, e-mail, CEP, credenciais, PIX e dados bancários.

### 3. Documentos oficiais
- `/central/documentos`
- PDF privado
- categoria
- data do documento
- validade
- observação
- campo **Preciso levar em rotas**

Os PDFs ficam em bucket separado da Biblioteca de Mídia.

O campo `route_required` foi criado já pensando no próximo módulo de Rotas.

### 4. Navegação
Em qualquer página da Central aparece uma pequena barra:
- Apresentação
- Documentos oficiais (administrador)

Assim não foi necessário reescrever o menu lateral inteiro e o pacote não conflita com os hotfixes anteriores.

## Aplicação

Extraia na raiz do projeto, substitua os arquivos e use:

GitHub Desktop → Commit → Push origin

Commit sugerido:

`feat: adiciona apresentação institucional e cofre de documentos`

## Banco

A migration vai junto para manter o repositório sincronizado.

Se o banco já tiver sido aplicado pelo Nexus durante esta implementação, não rode SQL manualmente.

## Próxima etapa sugerida

Criar `/central/rotas` (ou um módulo operacional dedicado) usando:
- documentos `route_required`;
- clientes/entregas por cidade;
- pontos parceiros;
- ordem das paradas;
- checklist da viagem;
- despesas e resultado da rota.

A estrutura dos documentos já está pronta para isso.
