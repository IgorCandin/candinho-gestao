# Acompanhamento único — Bank e escritório visual

Atualizado em 16/10/2026. Atualizar este arquivo conforme cada teste/implementação for concluído; registrar evidência, não presumir aprovação. Esta lista complementa o roteiro geral, não encerra pautas antigas.

## Estado confirmado

| Item | Estado | Evidência / destino |
| --- | --- | --- |
| Planejamento e simulador parcelado | Publicado, teste do usuário pendente | PR #27 integrado, produção READY commit 701617e; `/bank/planejamento` |
| Fechamento/vencimento nos cards e data de comparação | Implementado em prévia, NÃO publicado | PR #30 aberto; verificação Vercel SUCCESS em 16/10 |
| Escritório de operações | Implementado em prévia, NÃO publicado | PR #31 aberto; verificação Vercel SUCCESS em 16/10 |

As prévias #30 e #31 são pacotes separados. A prévia do escritório não inclui automaticamente os cartões novos da #30. Não interpretar ausência nessa prévia como perda da implementação. Não publicar/mesclar por causa desta atualização documental.

## Testes do responsável — ainda não aprovados

- [ ] PR #30, `/bank/planejamento`: cada cartão mostra “Fecha” e “Vence” separados; conferir dias reais de cada banco/titular. Datas vazias devem pedir cadastro, nunca inventar dia.
- [ ] PR #30: alterar “Se eu comprar em…” para antes, no dia e depois do fechamento; conferir primeiro mês sugerido e alerta do próprio dia. Sicoob e Nubank devem respeitar seus próprios cadastros, sem regra universal de dia 1 ou 11.
- [ ] Produção/PR #30, simulador: R$ 1.000 em 10x R$ 100; escolher cartão e data; ajustar início manualmente; verificar parcelas e virada de ano. Não grava despesa.
- [ ] PR #31, `/company/escritorio`: quatro salas para administrador, contadores comparados às filas; links abrem a operação correta.
- [ ] PR #31: abrir pelo atalho do início da Company; testar telefone e computador, rolagem, textos e teclado.
- [ ] Verificação técnica: usuário sem Bank/Fitness/Suplementos não vê indicadores dessas áreas; falha de consulta = indisponível, nunca zero fictício. Não precisa criar pagamentos para testar.

## Implementação ainda faltando

- [ ] Ampliar horizonte financeiro além do próximo mês. Hoje as parcelas futuras aparecem, mas capacidade financeira nesses meses permanece “a conferir”.
- [ ] Escritório: lista filtrada dos cadastros sem telefone, com acesso direto ao cadastro; atualmente abre a lista geral de clientes.
- [ ] Escritório: reposição usando critérios e filas existentes, sem inventar recomendação de compra.
- [ ] Escritório: notas compartilhadas com permissões/histórico; não implementadas em armazenamento local.
- [ ] Homologar prévias e publicar os pacotes autorizados, preservando trabalho paralelo no main.

## Como registrar cada retorno

Anotar item, resultado (aprovado/problema), dispositivo, rota e evidência. Se houver problema, manter o teste aberto e associar a correção. Build aprovado não marca teste de usuário como aprovado. Personagens são indicadores, não agentes executando ações.
