# Menus, zoom e Doctor — 19/10/2026

## Alterações limitadas à apresentação

O guard de menus impunha 180 px mesmo com apenas 112 px disponíveis. Teste com o componente real transpilado e DOM simulado falhou com 180 ≠ 112 antes da correção. O cálculo agora respeita espaço não negativo, inclusive após resize/scroll do visualViewport; observação cobre também o menu da conta Company/Bank/Physique.

Menu da conta sem max-height/overflow: em fixture de geometria com 18 ações fictícias e CSS global real, o painel terminava entre 679 e 709 px numa tela de 516 px. CSS delimitado ao painel agora limita altura, permite rolagem, quebra textos longos e mantém ações com 44 px. Todas as ações e handlers originais preservados. Nenhuma dependência, regra comercial ou integração alterada.

## Verificação e limites

- `node --test tests/menu-viewport.test.cjs`: viewport reduzida, ampliação, espaço zero, offset após scroll e remoção de listeners. DOM simulado, não navegador Safari.
- Fixture local `../navigation-review.py`: Chromium, CSS global expandido e marcação estrutural sintética; larguras 285, 320, 390, 683, 910, 1093, 1366 e 1708 px. Antes: painel cortado em todas. Depois: painel rolável dentro de 516 px; cabeçalho sem overflow nesse cenário isolado. Essas larguras representam redução de espaço disponível, não teste de zoom físico 80–200%.
- O teste não renderiza o cabeçalho React completo, dados reais nem Vitrine. Não prova solução do alerta de 285 px. Safari físico, teclado, todos os acessos e zoom real continuam pendentes no mapa.
- Não executar build pesado simultâneo com outros trabalhos. Publicação/build/TypeScript requerem evidência do deployment; este documento não confirma produção.

## Doctor — leitura, não limpeza

Consulta SELECT em `public.ux_health_signals`, sem ids de clientes, tokens ou payloads completos. Não foram chamados RPCs nem o endpoint de health-check, que poderia encerrar alertas.

- `/company/vitrine`: horizontal_overflow e fixed_clip, 285×516, 129 px, último registro 18/10/2026 15:21 (São Paulo). Header sintético não reproduziu; falta isolar conteúdo/estilos da página completa.
- `/company/vendas/nova/suplementos`: React 418, 26 ocorrências na assinatura desktop, último em 17/10/2026 19:05. Ainda investigar hidratação; não mascarar com suppressHydrationWarning ou remover funções.
- `/bank`: React 441 em 16/10 e Load failed em 08/10 não considerados resolvidos pela idade. Janelas corrigidas no PR #51 exigem confirmação na integração real.

Nenhuma gravação no banco, exclusão de histórico, resolução de sinal ou marcação de aceite do usuário.
