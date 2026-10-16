# Escritório visual de pendências — proposta, não implementado

Referência provável pesquisada em 16/10/2026: https://github.com/ringhyacinth/Star-Office-UI. Não há confirmação de que seja o vídeo do responsável. O projeto visualiza estados de agentes; código MIT, artes com restrição não comercial. Não instalar backend nem reutilizar artes no ERP.

## Adaptação à Candinho

Mapa opcional na Company com cômodos Company/CRM, Suplementos, Fitness e Bank, sem substituir menus e filas existentes. Personagens próprios representam filas com pendências, não agentes autônomos realmente trabalhando. Rotular “pendências para resolver”, nunca “IA resolvendo” sem execução real.

Cada pendência precisa de origem, evidência, data de consulta, prioridade e link para resolver. Exemplo: clientes sem telefone (qualidade cadastral), reposição (compras), faturas/datas ausentes (Bank). Não expor nomes/telefones/dados financeiros na visão geral além da permissão do usuário. Falha de consulta deve aparecer como indisponível, nunca zero pendências.

## Caminho de execução

1. Inventariar filas e permissões existentes para não criar sistema paralelo ou duplicar avisos.
2. Protótipo responsivo de planta com artes próprias/CSS, versão em lista acessível e movimento reduzido. Qualquer amostra deve ser identificada como demonstração.
3. Conectar leituras reais, limitadas por acesso, sem gravações automáticas. Contadores precisam indicar o escopo e data; priorização sem inventar regras de compra.
4. Adicionar notas persistentes somente após definir armazenamento/permissões e histórico. Não usar localStorage como se fosse registro compartilhado.
5. Conferir teclado, celular, estado vazio/erro e links antes de publicar.

Find Skills foi consultado; Frontend Design e React Best Practices já disponíveis atendem ao desenho inicial. Nenhuma skill, serviço de IA ou dependência adicional foi instalada. Não há custo externo novo nesta proposta.
