# Pacote - Correcoes Suplementos Mobile e PDF

## Escopo

Pacote consolidado gerado sobre a V1 Final Estabilizada.

### Mobile / PWA
- adiciona botao global de voltar no cabecalho mobile;
- remove o atalho redundante "Trocar operacao" do menu mobile;
- fecha o menu automaticamente ao navegar para outra aba;
- mantem a logo como caminho para o seletor de operacoes.

### Textos e caracteres
- corrige textos com mojibake/UTF-8 quebrado nas telas de Cliente e Estoque;
- remove da base de producao a observacao tecnica de migracao AppSheet que aparecia em 156 fichas de clientes.

### Vendas / entrega
- melhora a exibicao de erros das acoes de pagamento, entrega e cancelamento;
- corrige em producao a venda de Pamella Nunes - CP / Whey Concentrado FTW 900g, incluindo o recebimento historico faltante e a entrega em 16/07/2026;
- a venda ficou finalizada, pagamento recebido, entrega registrada e saldo final do produto igual a 0.

### Novo Orcamento
- o PDF nao abre mais automaticamente;
- depois de salvar, o sistema pergunta "Abrir o PDF agora?";
- permite escolher "Agora nao" ou "Abrir PDF".

### PDF de Orcamento
- layout redesenhado para ficar mais proximo da identidade visual do app;
- estrutura mais compacta e harmonica;
- cabecalho premium, card do cliente, metadados, tabela de produtos, resumo financeiro, condicoes, brinde/observacoes e rodape;
- continua suportando varias paginas.

## Validacao local
- npm ci: 0 vulnerabilidades;
- ESLint: aprovado;
- TypeScript: aprovado;
- Next.js: compilacao, TypeScript, geracao das paginas e lista final de rotas concluidas.

Observacao: o processo de build do ambiente de execucao encerrou por timeout depois de exibir a lista final completa das rotas. Os artefatos de build foram gerados e as etapas de compilacao/TypeScript/paginas foram concluidas.


## Adição de validação de deploy
- Editor de Combos agora permite adicionar, trocar ou remover a foto diretamente do celular/computador.
- A imagem é otimizada para WEBP e enviada ao bucket `product-images`.
- O campo de URL continua disponível como opção avançada.
