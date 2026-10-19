# Skills compartilhadas — 19/10/2026

Repositório: IgorCandin/candinho-gestao. Codex Desktop/Windows; Next.js, React, TypeScript, Supabase preservados. Este lote publica somente skills/documentação e acabamento mobile autorizado; sem hooks, serviços externos, credenciais, dependências do ERP ou alterações de banco.

## Instaladas e versionadas

Instalador nativo `skill-installer`, somente diretórios selecionados, commits fixados em `.agents/tooling-lock.json`:

- **systematic-debugging** e **verification-before-completion** (obra/superpowers): já existiam no checkout local de setup; agora compartilhadas no Git, sem alterar aquele checkout.
- **ponytail** (DietrichGebert/ponytail): mesma skill previamente instalada. O endereço solicitado `hyeongchankim/poneytail` apresenta a distribuição Ponytail com instalação apontando para DietrichGebert; não instalar uma segunda cópia nem os hooks de ativação.
- **code-simplification** (addyosmani/agent-skills): nova seleção para reduzir complexidade preservando comportamento. Sem instalar os 25 workflows ou plugins. Não foi utilizada para iniciar uma refatoração neste lote.

O verificador inspeciona fontes fixadas, frontmatter, nomes e links portáteis. Não certifica confiança, execução ou integridade criptográfica de todo o conteúdo. Nenhum script externo da skill foi executado. O instalador nativo foi inspecionado antes do uso; cópia não executa os arquivos baixados.

## Reutilizadas / avaliadas

| Solicitação | Resultado |
| --- | --- |
| Find Skills (vercel-labs/skills) | Já disponível no catálogo pessoal; reutilizada para descoberta. Sem instalar CLI como dependência do ERP. |
| Motionmaxxing | Já disponível em `C:/Users/User/.agents/skills/motionmaxxing` nesta máquina. Não duplicada no projeto: pacote de renderização não necessário ao mobile. Outras máquinas precisam instalação própria se forem produzir vídeos. |
| Vibe Coding Toolkit | Seleção conservadora já preparada em outro checkout, conforme diagnóstico anterior. Reutilizados contexto durável, AGENTS, testes e quatro skills acima; nenhuma importação do pacote inteiro. Demais skills locais daquele trabalho permanecem intactas, não declaradas publicadas por este lote. |
| React / Next.js / revisão visual / testes | Reutilizados catálogo oficial Vercel, webapp-testing e recursos existentes. Não copiar todas as skills de cliente para o projeto. |
| Graphify | Avaliado, não instalado. Modo de código local é possível, mas exige CLI Python e instalação/configuração própria; não há análise de dependências bloqueando este lote. Não habilitar guard/hook, extração paralela, análise de documentos com modelo ou cloud. Reavaliar diante de uma pergunta concreta de impacto; `rg` e testes atuais atendem agora. |
| OmniRoute | Gateway, não skill. Não instalado: exigiria serviço/contas/provedores e revisão de privacidade/manutenção. Não muda o modelo deste chat e não garante API gratuita. |

Fontes oficiais consultadas: [Graphify](https://github.com/Graphify-Labs/graphify), [Agent Skills](https://github.com/addyosmani/agent-skills), [Poneytail](https://github.com/hyeongchankim/poneytail), [Skills](https://github.com/vercel-labs/skills), [Motionmaxxing](https://github.com/Tejashmakwana/motionmaxxing), [Toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit), [OmniRoute](https://github.com/diegosouzapw/OmniRoute).

## Uso diário e outras sessões

Atualizar a branch própria com estas alterações sem trocar/resetar branches de outros trabalhos. Abrir novo turno/sessão no projeto e conferir o catálogo de skills; reiniciar o Codex somente se necessário. As skills locais podem ser selecionadas automaticamente quando o cliente as descobrir, ou solicitadas pelo nome. A instalação em disco não prova descoberta em uma sessão já aberta. Não copiar configurações pessoais ou credenciais.

Exemplos: “investigue este bug com systematic-debugging”; “verifique esta entrega”; “faça a menor correção completa com ponytail”; “simplifique somente este helper mantendo os testes”. Processo proporcional: não carregar todo o catálogo, não repetir auditorias sem mudança e não criar agentes desnecessários. Não há economia de tokens medida ou prometida.

## Continuidade

Tarefa original mantida: fechamento mobile e mapa focado, em `docs/engineering/MOBILE-FECHAMENTO-2026-10-19.md`. Nenhuma função removida. Testes de escrita somente isolados; iPhone físico e confirmação histórica da consignação continuam com o responsável. Verificar build/TypeScript remoto antes de liberar; registrar resultado real, não aprovação presumida.
