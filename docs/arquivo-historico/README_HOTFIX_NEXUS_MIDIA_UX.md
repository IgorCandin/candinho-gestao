# Hotfix — Nexus Mídia + UX da tela de detalhe

## O que aconteceu com o Nexus

O Nexus principal já havia sido migrado para múltiplos provedores:
- Gemini como opção principal/gratuita
- OpenAI como fallback opcional

Mas a Biblioteca de Mídia continuou com a lógica antiga:
- a tela verificava somente `readiness.openai.ready`;
- mostrava `Aguardando chave OpenAI`;
- desabilitava o botão se a OpenAI não estivesse pronta;
- a rota ainda encaminhava a análise para a antiga Edge Function de mídia.

Por isso parecia que o Nexus tinha parado, mesmo com o Gemini funcionando em outras áreas.

## Correção

A classificação de mídia agora usa `generateNexus()` diretamente no servidor:
1. carrega a imagem privada do Storage;
2. tenta Gemini conforme a configuração do Nexus;
3. usa OpenAI como fallback quando permitido;
4. salva descrição, categoria, ambiente, produtos reconhecidos, uso sugerido e metadados do provedor.

Nenhuma chave é enviada ao navegador.

## UX da tela

A tela de detalhe foi redesenhada:
- imagem é o elemento principal;
- clique na imagem abre visualização ampliada com zoom;
- Nexus fica em um card compacto e prioritário;
- Contexto fica separado e simples;
- informações técnicas viraram uma faixa compacta;
- remove o painel enorme vazio da parte inferior;
- sidebar fica fixa em desktop e reorganiza no mobile;
- mostra qual provedor classificou (Gemini/OpenAI).

A listagem da Biblioteca também deixa de dizer "Aguardando chave OpenAI" e passa a refletir o Nexus multi-provedor.

## Aplicação

Extraia o ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça:

GitHub Desktop -> Commit -> Push origin

Commit sugerido:

`fix: restaura Nexus Mídia e refaz UX do detalhe`

Sem migration e sem alteração manual no Supabase.
