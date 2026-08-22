# V45.40 — Physique · Análise muscular interativa

Base usada: `main` no commit `ca3be5b0713cc3a2e94da319087af00b8e9ee25d`.

## Ideia

As fotos atuais de cada exercício continuam exatamente como estão. A mudança é de interação: ao tocar/clicar na foto, o Physique abre uma análise visual do exercício em um modal/bottom-sheet.

## O popup mostra

- objetivo do movimento;
- músculos principais;
- músculos secundários;
- músculos estabilizadores;
- função de cada grupo muscular naquela cadeia de movimento;
- movimentos articulares envolvidos;
- checklist de execução;
- erros comuns;
- dica rápida do Physique;
- séries/repetições/descanso da ficha atual;
- técnica, orientação de carga e observações específicas da ficha, quando existirem.

## Cobertura

A análise usa os mesmos identificadores que já escolhem as imagens dos exercícios. Foram adicionados perfis para:

- supinos / peitoral;
- crossover;
- flexões;
- bíceps;
- tríceps;
- panturrilha;
- bike/cardio;
- elevação pélvica;
- extensora;
- flexora;
- leg press;
- stiff / terra romeno / levantamento terra;
- agachamentos/passadas;
- crucifixo inverso / face pull;
- puxadas/pulldown;
- remadas;
- elevação lateral;
- ombros;
- core.

## UX

- desktop: modal central grande;
- celular: bottom-sheet quase tela cheia;
- fecha no X, tocando fora ou pressionando Esc;
- bloqueia scroll da página enquanto aberto;
- botão `Analisar` fica sobre a foto;
- o texto de grupo muscular abaixo do nome também abre a análise.

## Arquivos

- `src/components/physique-training-plan-view.tsx`
- `src/app/(app)/physique/physique-muscle-insights-v45-40.css`
- `src/app/(app)/physique/layout.tsx`

Não há migration e não altera dados do Supabase.

## Teste rápido

1. Abra `Physique > Fichas`.
2. Entre em uma ficha.
3. Toque na foto de um exercício.
4. Confira objetivo, mapa muscular, execução, erros e dica.
5. Troque de exercício e teste no celular.
6. Confirme que o treino e as fotos continuam iguais quando o modal está fechado.
