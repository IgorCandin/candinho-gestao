"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Info,
  MousePointerClick,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Day = {
  id: string;
  day_order: number;
  day_label: string;
  focus: string | null;
  notes: string | null;
};

type Exercise = {
  id: string;
  day_id: string;
  exercise_order: number;
  exercise_name: string;
  sets_text: string | null;
  reps_text: string | null;
  rest_seconds: number | null;
  technique: string | null;
  load_guidance: string | null;
  notes: string | null;
};

type MuscleRole = "principal" | "secundario" | "estabilizador";

type MuscleAnalysis = {
  objective: string;
  primary: string[];
  secondary: string[];
  stabilizers: string[];
  joints: string[];
  cues: string[];
  errors: string[];
  tip: string;
};

const MUSCLE_FUNCTIONS: Record<string, string> = {
  "Peitoral maior": "Aproxima o braço à frente do tronco e participa da adução horizontal do ombro.",
  "Deltoide anterior": "Auxilia a flexão do ombro e a condução do braço à frente do corpo.",
  "Deltoide lateral": "Eleva o braço para o lado e ajuda a manter o ombro alinhado durante a abdução.",
  "Deltoide posterior": "Leva o braço para trás e auxilia a abertura horizontal do ombro.",
  "Tríceps braquial": "Estende o cotovelo e ajuda a finalizar movimentos de empurrar.",
  "Bíceps braquial": "Flexiona o cotovelo e auxilia na supinação do antebraço.",
  Braquial: "É um forte flexor do cotovelo, atuando independentemente da posição da mão.",
  Braquiorradial: "Auxilia a flexão do cotovelo, principalmente com pegada neutra.",
  "Latíssimo do dorso": "Puxa o braço para baixo e para trás, contribuindo para extensão e adução do ombro.",
  "Trapézio médio/inferior": "Controla a retração e a depressão das escápulas durante puxadas e remadas.",
  "Trapézio superior": "Participa da elevação e do controle da escápula, especialmente em movimentos acima da cabeça.",
  Romboides: "Aproximam as escápulas e ajudam a manter estabilidade durante puxadas.",
  "Redondo maior": "Auxilia o latíssimo ao puxar o braço para baixo e para trás.",
  "Serrátil anterior": "Mantém a escápula apoiada no tórax e auxilia sua protração e rotação.",
  "Manguito rotador": "Estabiliza a cabeça do úmero dentro da articulação do ombro durante o movimento.",
  "Reto abdominal": "Ajuda a manter o tronco rígido e a controlar a posição da pelve.",
  Oblíquos: "Estabilizam o tronco contra rotação e inclinação excessivas.",
  "Eretores da espinha": "Mantêm a coluna estável e resistem à flexão do tronco sob carga.",
  "Glúteo máximo": "Estende o quadril e produz força em agachamentos, passadas, terra e elevação pélvica.",
  "Glúteo médio": "Estabiliza a pelve e o joelho, especialmente em exercícios unilaterais.",
  Isquiotibiais: "Estendem o quadril e flexionam o joelho, com grande participação em movimentos de cadeia posterior.",
  Quadríceps: "Estende o joelho e gera força em agachamentos, leg press e extensora.",
  Adutores: "Ajudam a aproximar a coxa e contribuem para estabilidade do quadril em bases mais abertas.",
  Gastrocnêmio: "Faz flexão plantar do tornozelo e participa da impulsão da panturrilha.",
  Sóleo: "Trabalha a flexão plantar com forte participação quando o joelho está flexionado.",
  Core: "Conjunto de músculos que estabiliza tronco, pelve e coluna para transferir força com controle.",
};

const MUSCLE_ANALYSES = {
  chestPress: {
    objective: "Desenvolver a força de empurrar e a adução horizontal do ombro, com maior participação do peitoral.",
    primary: ["Peitoral maior"],
    secondary: ["Deltoide anterior", "Tríceps braquial"],
    stabilizers: ["Serrátil anterior", "Manguito rotador", "Core"],
    joints: ["Ombro: adução horizontal", "Cotovelo: extensão", "Escápulas: controle e estabilidade"],
    cues: ["Peito aberto e escápulas controladas", "Desça com controle", "Mantenha punhos alinhados", "Empurre sem perder a posição do ombro"],
    errors: ["Abrir demais os cotovelos", "Perder o controle na descida", "Elevar os ombros", "Desalinhar os punhos"],
    tip: "Pense em aproximar os braços à frente do peito, e não apenas em empurrar a carga para longe.",
  },
  crossover: {
    objective: "Enfatizar o peitoral em uma trajetória convergente, mantendo tensão contínua durante o arco do movimento.",
    primary: ["Peitoral maior"],
    secondary: ["Deltoide anterior", "Serrátil anterior"],
    stabilizers: ["Manguito rotador", "Core"],
    joints: ["Ombro: adução horizontal", "Cotovelo: leve flexão mantida", "Escápulas: protração controlada"],
    cues: ["Tronco estável", "Cotovelos semi-flexionados", "Movimento em arco", "Feche à frente do corpo sem bater as mãos"],
    errors: ["Usar impulso", "Elevar os ombros", "Flexionar demais os cotovelos", "Perder o alinhamento do tronco"],
    tip: "Ajuste a altura das polias conforme a região do peitoral que deseja enfatizar, mantendo o ombro confortável.",
  },
  pushUp: {
    objective: "Desenvolver força de empurrar usando o peso corporal com controle do tronco e das escápulas.",
    primary: ["Peitoral maior", "Tríceps braquial"],
    secondary: ["Deltoide anterior", "Serrátil anterior"],
    stabilizers: ["Reto abdominal", "Oblíquos", "Core"],
    joints: ["Ombro: adução horizontal", "Cotovelo: extensão", "Escápulas: protração e estabilidade"],
    cues: ["Mãos firmes e alinhadas", "Corpo em linha reta", "Desça com controle", "Suba sem perder a rigidez do tronco"],
    errors: ["Quadril cair", "Cotovelos muito abertos", "Encurtar a amplitude", "Projetar a cabeça à frente"],
    tip: "A rigidez do core melhora a transferência de força entre pernas, tronco e braços.",
  },
  curl: {
    objective: "Produzir flexão do cotovelo com foco em bíceps e braquial, limitando compensações do ombro.",
    primary: ["Bíceps braquial", "Braquial"],
    secondary: ["Braquiorradial"],
    stabilizers: ["Deltoide anterior", "Core"],
    joints: ["Cotovelo: flexão", "Antebraço: supinação conforme a pegada", "Ombro: estabilidade"],
    cues: ["Cotovelos próximos ao corpo", "Suba sem levar o ombro à frente", "Controle a descida", "Mantenha o punho neutro"],
    errors: ["Usar balanço do tronco", "Projetar os cotovelos à frente", "Soltar a descida", "Quebrar o punho"],
    tip: "Se o tronco começa a balançar, a carga provavelmente está maior do que o movimento consegue controlar.",
  },
  triceps: {
    objective: "Desenvolver extensão do cotovelo com foco no tríceps, mantendo o ombro estável.",
    primary: ["Tríceps braquial"],
    secondary: [],
    stabilizers: ["Deltoide anterior", "Manguito rotador", "Core"],
    joints: ["Cotovelo: extensão", "Ombro: estabilidade", "Escápulas: controle"],
    cues: ["Mantenha os cotovelos estáveis", "Estenda até onde o cotovelo permanece confortável", "Volte devagar", "Evite mover o tronco"],
    errors: ["Abrir os cotovelos", "Usar impulso", "Inclinar demais o tronco", "Perder o controle na volta"],
    tip: "O tríceps trabalha melhor quando o cotovelo fica previsível e o movimento vem da extensão, não do balanço do corpo.",
  },
  calf: {
    objective: "Desenvolver a flexão plantar do tornozelo e a força da panturrilha.",
    primary: ["Gastrocnêmio", "Sóleo"],
    secondary: [],
    stabilizers: ["Core"],
    joints: ["Tornozelo: flexão plantar", "Joelho: estabilidade", "Pé: controle"],
    cues: ["Suba pelo antepé", "Faça uma pausa no topo", "Desça com controle", "Evite deixar o tornozelo colapsar para dentro"],
    errors: ["Quicar no fundo", "Fazer amplitude curta", "Girar os pés durante a repetição", "Usar impulso excessivo"],
    tip: "Amplitude controlada e pausa no topo costumam valer mais do que simplesmente aumentar a carga.",
  },
  bike: {
    objective: "Elevar a demanda cardiovascular enquanto pernas e quadris repetem um padrão cíclico de força.",
    primary: ["Quadríceps", "Glúteo máximo"],
    secondary: ["Isquiotibiais", "Gastrocnêmio", "Sóleo"],
    stabilizers: ["Core"],
    joints: ["Quadril: flexão/extensão", "Joelho: flexão/extensão", "Tornozelo: controle"],
    cues: ["Mantenha cadência fluida", "Evite balançar o tronco", "Ajuste o banco para não fechar demais o joelho", "Distribua força ao longo da pedalada"],
    errors: ["Banco muito baixo", "Quadril balançando", "Carga alta demais para a cadência", "Joelhos desviando muito para dentro"],
    tip: "Para aquecimento, priorize ritmo progressivo; para condicionamento, aumente a intensidade sem perder a técnica da pedalada.",
  },
  hipThrust: {
    objective: "Desenvolver extensão do quadril com grande participação dos glúteos.",
    primary: ["Glúteo máximo"],
    secondary: ["Isquiotibiais", "Adutores"],
    stabilizers: ["Glúteo médio", "Core"],
    joints: ["Quadril: extensão", "Joelho: estabilidade", "Coluna: controle neutro"],
    cues: ["Empurre o chão com os pés", "Suba o quadril sem hiperestender a lombar", "Contraia os glúteos no topo", "Mantenha costelas controladas"],
    errors: ["Hiperestender a lombar", "Pés muito longe ou muito perto", "Joelhos colapsando para dentro", "Subir com impulso"],
    tip: "O topo deve vir da extensão do quadril; se a lombar assume o movimento, reduza a amplitude ou reajuste os pés.",
  },
  kneeExtension: {
    objective: "Isolar a extensão do joelho com foco direto no quadríceps.",
    primary: ["Quadríceps"],
    secondary: [],
    stabilizers: ["Core"],
    joints: ["Joelho: extensão", "Quadril: estabilidade"],
    cues: ["Alinhe o eixo da máquina ao joelho", "Estenda com controle", "Evite chutar a carga", "Desça sem deixar a pilha bater"],
    errors: ["Usar impulso", "Descolar o quadril do banco", "Carga que reduz demais a amplitude", "Movimento muito rápido"],
    tip: "Controle o último terço da extensão e a volta para manter tensão no quadríceps sem depender do embalo.",
  },
  legCurl: {
    objective: "Flexionar o joelho com foco nos isquiotibiais e controle da cadeia posterior.",
    primary: ["Isquiotibiais"],
    secondary: ["Gastrocnêmio"],
    stabilizers: ["Glúteo máximo", "Core"],
    joints: ["Joelho: flexão", "Quadril: estabilidade"],
    cues: ["Mantenha o quadril apoiado", "Flexione sem levantar a pelve", "Segure brevemente no final", "Retorne devagar"],
    errors: ["Arquear a lombar", "Tirar o quadril do banco", "Usar impulso", "Encurtar a volta"],
    tip: "Uma descida lenta ajuda a manter os posteriores trabalhando durante toda a repetição.",
  },
  legPress: {
    objective: "Desenvolver força de pernas em padrão de extensão de joelhos e quadris com apoio do tronco.",
    primary: ["Quadríceps", "Glúteo máximo"],
    secondary: ["Isquiotibiais", "Adutores"],
    stabilizers: ["Glúteo médio", "Core"],
    joints: ["Quadril: extensão", "Joelho: extensão", "Tornozelo: estabilidade"],
    cues: ["Pés firmes na plataforma", "Joelhos acompanham a linha dos pés", "Desça até manter a pelve apoiada", "Empurre sem travar agressivamente os joelhos"],
    errors: ["Pelve descolar no fundo", "Joelhos colapsarem para dentro", "Amplitude além do controle", "Empurrar com a ponta dos pés"],
    tip: "A melhor amplitude é aquela em que você mantém quadril, joelhos e lombar organizados do início ao fim.",
  },
  hinge: {
    objective: "Desenvolver força de cadeia posterior usando extensão do quadril com coluna estável.",
    primary: ["Isquiotibiais", "Glúteo máximo"],
    secondary: ["Eretores da espinha", "Adutores"],
    stabilizers: ["Core", "Latíssimo do dorso"],
    joints: ["Quadril: extensão", "Joelho: leve flexão", "Coluna: estabilidade isométrica"],
    cues: ["Leve o quadril para trás", "Mantenha a carga próxima ao corpo", "Tronco rígido", "Suba estendendo o quadril"],
    errors: ["Arredondar as costas", "Transformar em agachamento", "Afastar a carga do corpo", "Hiperestender a lombar no topo"],
    tip: "Pense em dobrar no quadril mantendo a coluna como uma peça firme; o alongamento deve aparecer principalmente nos posteriores.",
  },
  squat: {
    objective: "Desenvolver força global de membros inferiores com extensão coordenada de quadril e joelhos.",
    primary: ["Quadríceps", "Glúteo máximo"],
    secondary: ["Adutores", "Isquiotibiais"],
    stabilizers: ["Glúteo médio", "Eretores da espinha", "Core"],
    joints: ["Quadril: flexão/extensão", "Joelho: flexão/extensão", "Tornozelo: dorsiflexão/estabilidade"],
    cues: ["Pés firmes", "Joelhos acompanham os pés", "Tronco organizado", "Desça dentro da amplitude que consegue controlar"],
    errors: ["Joelhos colapsarem para dentro", "Calcanhares perderem contato", "Perder a posição do tronco", "Subir com quadril e peito em tempos muito diferentes"],
    tip: "A base e a amplitude podem mudar entre pessoas; o objetivo é manter controle e distribuir a força sem compensações grandes.",
  },
  rearDelt: {
    objective: "Trabalhar deltoide posterior e musculatura escapular em movimentos de abertura e retração.",
    primary: ["Deltoide posterior"],
    secondary: ["Romboides", "Trapézio médio/inferior"],
    stabilizers: ["Manguito rotador", "Core"],
    joints: ["Ombro: abdução horizontal", "Escápulas: retração controlada"],
    cues: ["Mantenha o pescoço relaxado", "Abra os braços sem elevar os ombros", "Controle a volta", "Evite transformar em remada"],
    errors: ["Encolher os ombros", "Usar balanço", "Flexionar demais os cotovelos", "Carga que reduz a amplitude"],
    tip: "Pense em afastar os braços e organizar as escápulas, sem esmagá-las com força excessiva.",
  },
  pulldown: {
    objective: "Desenvolver a puxada vertical com foco no latíssimo do dorso e controle das escápulas.",
    primary: ["Latíssimo do dorso"],
    secondary: ["Redondo maior", "Bíceps braquial", "Braquial"],
    stabilizers: ["Trapézio médio/inferior", "Romboides", "Core"],
    joints: ["Ombro: adução/extensão", "Cotovelo: flexão", "Escápulas: depressão e retração controladas"],
    cues: ["Peito aberto", "Tronco estável", "Puxe os cotovelos para baixo", "Retorne com controle"],
    errors: ["Puxar atrás da nuca", "Usar balanço do tronco", "Encurtar a subida", "Elevar demais os ombros"],
    tip: "Pense em conduzir o movimento com os cotovelos; isso reduz a sensação de puxar apenas com as mãos.",
  },
  row: {
    objective: "Desenvolver a puxada horizontal e a retração escapular com foco nas costas.",
    primary: ["Latíssimo do dorso", "Romboides", "Trapézio médio/inferior"],
    secondary: ["Deltoide posterior", "Bíceps braquial", "Braquial"],
    stabilizers: ["Eretores da espinha", "Core"],
    joints: ["Ombro: extensão/adução", "Cotovelo: flexão", "Escápulas: retração"],
    cues: ["Mantenha tronco estável", "Puxe na direção do abdômen ou linha proposta", "Cotovelos acompanham a trajetória", "Controle a volta"],
    errors: ["Arredondar a lombar", "Levantar o tronco a cada repetição", "Puxar longe do corpo", "Usar excesso de impulso"],
    tip: "A posição dos cotovelos muda a ênfase entre dorsais, romboides e trapézio; preserve a trajetória escolhida durante a série.",
  },
  lateralRaise: {
    objective: "Desenvolver a abdução do ombro com foco no deltoide lateral.",
    primary: ["Deltoide lateral"],
    secondary: ["Trapézio superior"],
    stabilizers: ["Manguito rotador", "Serrátil anterior", "Core"],
    joints: ["Ombro: abdução", "Escápula: rotação superior controlada"],
    cues: ["Eleve os braços com controle", "Mantenha cotovelos levemente flexionados", "Evite encolher os ombros", "Pare antes de perder o alinhamento"],
    errors: ["Usar balanço", "Subir a carga com trapézio dominante", "Punhos muito quebrados", "Carga que obriga a roubar"],
    tip: "Menos carga com trajetória limpa geralmente aumenta a qualidade do trabalho no deltoide lateral.",
  },
  shoulders: {
    objective: "Desenvolver os ombros preservando o controle escapular e a estabilidade glenoumeral.",
    primary: ["Deltoide anterior", "Deltoide lateral"],
    secondary: ["Tríceps braquial", "Trapézio superior"],
    stabilizers: ["Manguito rotador", "Serrátil anterior", "Core"],
    joints: ["Ombro: flexão/abdução conforme o exercício", "Escápulas: rotação e estabilidade", "Cotovelo: extensão nos desenvolvimentos"],
    cues: ["Controle a escápula", "Mantenha punhos alinhados", "Use amplitude confortável", "Evite compensar com a lombar"],
    errors: ["Elevar demais os ombros", "Usar balanço", "Exceder a carga", "Perder alinhamento do tronco"],
    tip: "O ombro funciona melhor quando braço e escápula se movem juntos, sem forçar amplitude além do controle.",
  },
  coreCardio: {
    objective: "Treinar estabilidade do tronco e/ou condicionamento, dependendo do exercício selecionado.",
    primary: ["Core", "Reto abdominal", "Oblíquos"],
    secondary: [],
    stabilizers: ["Eretores da espinha", "Glúteo médio"],
    joints: ["Coluna: estabilidade", "Pelve: controle", "Respiração: coordenação com o esforço"],
    cues: ["Mantenha o tronco organizado", "Respire sem perder a posição", "Controle a amplitude", "Interrompa a série antes de a técnica desmontar"],
    errors: ["Prender a respiração sem necessidade", "Compensar com lombar", "Executar rápido demais", "Perder a posição da pelve"],
    tip: "No core, qualidade de posição e controle costumam ser mais importantes do que aumentar repetições rapidamente.",
  },
} satisfies Record<string, MuscleAnalysis>;

type AnalysisKey = keyof typeof MUSCLE_ANALYSES;

type ExerciseVisual = {
  src: string;
  label: string;
  terms: readonly string[];
  analysisKey: AnalysisKey;
};

const movementVisuals = [
  {
    src: "/images/physique/exercises/flat-barbell-bench-press.png",
    label: "Peito, ombros e tríceps",
    terms: ["supino reto", "supino plano"],
    analysisKey: "chestPress",
  },
  {
    src: "/images/physique/exercises/low-to-high-cable-crossover.png",
    label: "Peito superior",
    terms: ["crossover baixo para cima", "crossover baixo-pra-cima"],
    analysisKey: "crossover",
  },
  {
    src: "/images/physique/exercises/preacher-curl.png",
    label: "Bíceps e braquial",
    terms: ["rosca scott", "preacher curl"],
    analysisKey: "curl",
  },
  {
    src: "/images/physique/exercises/barbell-biceps-curl.png",
    label: "Bíceps e braquial",
    terms: ["rosca direta", "curl com barra"],
    analysisKey: "curl",
  },
  {
    src: "/images/physique/exercises/overhead-cable-triceps-extension.png",
    label: "Tríceps",
    terms: ["tríceps francês", "triceps frances", "francês no cabo", "frances no cabo"],
    analysisKey: "triceps",
  },
  {
    src: "/images/physique/exercises/decline-push-up.png",
    label: "Peito, ombros e tríceps",
    terms: ["flexão com pés elevados", "flexao com pes elevados", "flexão declinada", "flexao declinada"],
    analysisKey: "pushUp",
  },
  {
    src: "/images/physique/exercises/seated-leg-press-calf-raise.png",
    label: "Panturrilhas",
    terms: ["panturrilha no leg", "panturrilha na máquina", "panturrilha na maquina"],
    analysisKey: "calf",
  },
  {
    src: "/images/physique/exercises/push-up.png",
    label: "Peito, ombros e tríceps",
    terms: ["flexão", "flexao", "flexão de braços", "flexao de bracos"],
    analysisKey: "pushUp",
  },
  {
    src: "/images/physique/exercises/bike.webp",
    label: "Core e condicionamento",
    terms: ["bike", "bicicleta", "spinning"],
    analysisKey: "bike",
  },
  {
    src: "/images/physique/exercises/hip-thrust.webp",
    label: "Glúteos e posteriores",
    terms: ["elevação pélvica", "elevacao pelvica", "hip thrust", "ponte de glúteo", "ponte de gluteo"],
    analysisKey: "hipThrust",
  },
  {
    src: "/images/physique/exercises/calf-raise.webp",
    label: "Panturrilhas",
    terms: ["panturrilha", "gêmeos", "gemeos"],
    analysisKey: "calf",
  },
  {
    src: "/images/physique/exercises/knee-extension.webp",
    label: "Quadríceps",
    terms: ["cadeira extensora", "extensora"],
    analysisKey: "kneeExtension",
  },
  {
    src: "/images/physique/exercises/leg-curl-bilateral.png",
    label: "Cadeira e mesa flexora",
    terms: ["cadeira ou mesa flexora", "mesa ou cadeira flexora"],
    analysisKey: "legCurl",
  },
  {
    src: "/images/physique/exercises/leg-curl.webp",
    label: "Posteriores de coxa",
    terms: ["mesa flexora", "cadeira flexora", "flexora", "leg curl"],
    analysisKey: "legCurl",
  },
  {
    src: "/images/physique/exercises/leg-press.webp",
    label: "Pernas e glúteos",
    terms: ["leg press"],
    analysisKey: "legPress",
  },
  {
    src: "/images/physique/exercises/romanian-deadlift.webp",
    label: "Posteriores e glúteos",
    terms: ["stiff", "terra romeno", "levantamento romeno", "rdl", "levantamento terra"],
    analysisKey: "hinge",
  },
  {
    src: "/images/physique/exercises/squat.webp",
    label: "Pernas e glúteos",
    terms: ["agachamento", "agach", "sumô", "sumo", "afundo", "passada", "avanço", "avanco"],
    analysisKey: "squat",
  },
  {
    src: "/images/physique/exercises/reverse-fly.webp",
    label: "Posterior de ombro e costas",
    terms: ["crucifixo inverso", "face pull", "voador inverso", "reverse fly"],
    analysisKey: "rearDelt",
  },
  {
    src: "/images/physique/exercises/pulldown.webp",
    label: "Costas e bíceps",
    terms: ["puxada", "pulldown", "pulley frente", "barra fixa"],
    analysisKey: "pulldown",
  },
  {
    src: "/images/physique/exercises/row.webp",
    label: "Costas e bíceps",
    terms: ["remada"],
    analysisKey: "row",
  },
  {
    src: "/images/physique/exercises/biceps-curl.webp",
    label: "Bíceps e braquial",
    terms: ["rosca", "curl"],
    analysisKey: "curl",
  },
  {
    src: "/images/physique/exercises/lateral-raise.webp",
    label: "Ombros",
    terms: ["elevação lateral", "elevacao lateral"],
    analysisKey: "lateralRaise",
  },
  {
    src: "/images/physique/exercises/triceps-cable.webp",
    label: "Tríceps",
    terms: ["tríceps", "triceps"],
    analysisKey: "triceps",
  },
  {
    src: "/images/physique/exercises/chest-press.webp",
    label: "Peito e tríceps",
    terms: ["supino", "crucifixo", "crossover", "peitoral", "paralela", "mergulho"],
    analysisKey: "chestPress",
  },
] satisfies readonly ExerciseVisual[];

const exerciseVisuals = [
  {
    src: "/images/physique/exercises/back-biceps.webp",
    label: "Costas e bíceps",
    terms: ["puxad", "remad", "barra fixa", "pulley", "dorsal", "costas", "rosca", "biceps", "bíceps"],
    analysisKey: "pulldown",
  },
  {
    src: "/images/physique/exercises/chest-triceps.webp",
    label: "Peito e tríceps",
    terms: ["supino", "peitoral", "crucifixo", "flexao", "flexão", "triceps", "tríceps", "mergulho", "paralela"],
    analysisKey: "chestPress",
  },
  {
    src: "/images/physique/exercises/legs-glutes.webp",
    label: "Pernas e glúteos",
    terms: ["agach", "leg press", "extensora", "flexora", "stiff", "terra", "panturrilha", "glute", "glúte", "avanco", "avanço", "passada", "afundo", "adutor", "abdutor"],
    analysisKey: "squat",
  },
  {
    src: "/images/physique/exercises/shoulders.webp",
    label: "Ombros",
    terms: ["ombro", "deltoid", "elevação lateral", "elevacao lateral", "desenvolvimento", "face pull", "encolhimento"],
    analysisKey: "shoulders",
  },
  {
    src: "/images/physique/exercises/core-cardio.webp",
    label: "Core e condicionamento",
    terms: ["abdominal", "prancha", "core", "bike", "bicicleta", "esteira", "corrida", "eliptico", "elíptico", "cardio", "aquecimento"],
    analysisKey: "coreCardio",
  },
] satisfies readonly ExerciseVisual[];

function getExerciseVisual(exerciseName: string): ExerciseVisual | null {
  const normalized = exerciseName.toLocaleLowerCase("pt-BR");

  return (
    movementVisuals.find((visual) =>
      visual.terms.some((term) => normalized.includes(term)),
    ) ??
    exerciseVisuals.find((visual) =>
      visual.terms.some((term) => normalized.includes(term)),
    ) ??
    null
  );
}

function roleLabel(role: MuscleRole) {
  if (role === "principal") return "Principal";
  if (role === "secundario") return "Secundário";
  return "Estabilizador";
}

function MuscleGroup({
  title,
  role,
  muscles,
}: {
  title: string;
  role: MuscleRole;
  muscles: string[];
}) {
  if (muscles.length === 0) return null;

  return (
    <div className={`physique-muscle-role physique-muscle-role-${role}`}>
      <header>
        <strong>{title}</strong>
        <span>{roleLabel(role)}</span>
      </header>

      <div className="physique-muscle-role-list">
        {muscles.map((muscle) => (
          <article key={muscle}>
            <span className="physique-muscle-role-dot" />
            <div>
              <strong>{muscle}</strong>
              <p>{MUSCLE_FUNCTIONS[muscle] ?? "Participa da execução e do controle deste movimento."}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ExerciseMuscleModal({
  exercise,
  visual,
  onClose,
}: {
  exercise: Exercise;
  visual: ExerciseVisual;
  onClose: () => void;
}) {
  const analysis = MUSCLE_ANALYSES[visual.analysisKey];
  const prescription = [exercise.sets_text, exercise.reps_text]
    .filter(Boolean)
    .join(" × ");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="physique-muscle-modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-labelledby="physique-muscle-modal-title"
        aria-modal="true"
        className="physique-muscle-modal"
        role="dialog"
      >
        <header className="physique-muscle-modal-header">
          <div>
            <span>ANÁLISE DO MOVIMENTO</span>
            <h2 id="physique-muscle-modal-title">{exercise.exercise_name}</h2>
            <p>{visual.label}</p>
          </div>

          <button aria-label="Fechar análise" onClick={onClose} type="button">
            <X size={19} />
          </button>
        </header>

        <div className="physique-muscle-modal-body">
          <aside className="physique-muscle-modal-preview">
            <div className="physique-muscle-modal-image">
              <Image
                alt={`Execução de ${exercise.exercise_name}`}
                fill
                sizes="(max-width: 760px) 90vw, 340px"
                src={visual.src}
              />
            </div>

            <div className="physique-muscle-modal-prescription">
              <span>Na sua ficha</span>
              <strong>{prescription || "Séries/repetições não informadas"}</strong>
              {exercise.rest_seconds != null && (
                <small>
                  <Clock3 size={13} /> Descanso de {exercise.rest_seconds}s
                </small>
              )}
            </div>

            <article className="physique-muscle-insight-card physique-muscle-objective">
              <Target size={18} />
              <div>
                <span>OBJETIVO</span>
                <p>{analysis.objective}</p>
              </div>
            </article>
          </aside>

          <div className="physique-muscle-modal-content">
            <section className="physique-muscle-section">
              <div className="physique-muscle-section-title">
                <Activity size={18} />
                <div>
                  <span>MAPA MUSCULAR</span>
                  <h3>Quem trabalha e qual é a função</h3>
                </div>
              </div>

              <div className="physique-muscle-role-grid">
                <MuscleGroup title="Motores principais" role="principal" muscles={analysis.primary} />
                <MuscleGroup title="Músculos auxiliares" role="secundario" muscles={analysis.secondary} />
                <MuscleGroup title="Controle e estabilidade" role="estabilizador" muscles={analysis.stabilizers} />
              </div>
            </section>

            <section className="physique-muscle-info-grid">
              <article className="physique-muscle-insight-card">
                <Info size={18} />
                <div>
                  <span>MOVIMENTOS ARTICULARES</span>
                  <ul>
                    {analysis.joints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="physique-muscle-insight-card success">
                <CheckCircle2 size={18} />
                <div>
                  <span>EXECUÇÃO</span>
                  <ul>
                    {analysis.cues.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="physique-muscle-insight-card danger">
                <AlertTriangle size={18} />
                <div>
                  <span>ERROS COMUNS</span>
                  <ul>
                    {analysis.errors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="physique-muscle-insight-card tip">
                <Sparkles size={18} />
                <div>
                  <span>DICA PHYSIQUE</span>
                  <p>{analysis.tip}</p>
                </div>
              </article>
            </section>

            {(exercise.technique || exercise.load_guidance || exercise.notes) && (
              <section className="physique-muscle-ficha-notes">
                <span>ORIENTAÇÃO ESPECÍFICA DESTA FICHA</span>
                {exercise.technique && <p><b>Técnica:</b> {exercise.technique}</p>}
                {exercise.load_guidance && <p><b>Carga:</b> {exercise.load_guidance}</p>}
                {exercise.notes && <p>{exercise.notes}</p>}
              </section>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function PhysiqueTrainingPlanView({
  days,
  exercises,
}: {
  days: Day[];
  exercises: Exercise[];
}) {
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");
  const [selectedInsight, setSelectedInsight] = useState<{
    exercise: Exercise;
    visual: ExerciseVisual;
  } | null>(null);

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0] ?? null;

  const selectedExercises = useMemo(
    () =>
      selectedDay
        ? exercises
            .filter((exercise) => exercise.day_id === selectedDay.id)
            .sort((a, b) => a.exercise_order - b.exercise_order)
        : [],
    [exercises, selectedDay],
  );

  if (!selectedDay) {
    return (
      <div className="physique-empty compact">
        <Dumbbell size={23} />
        <strong>Nenhum dia estruturado nesta ficha</strong>
      </div>
    );
  }

  return (
    <div className="physique-ux-training-view">
      <div className="physique-ux-day-tabs" role="tablist" aria-label="Dias da ficha">
        {days.map((day) => (
          <button
            className={selectedDay.id === day.id ? "active" : ""}
            key={day.id}
            onClick={() => setSelectedDayId(day.id)}
            role="tab"
            type="button"
          >
            <small>Treino {day.day_order}</small>
            <strong>{day.day_label}</strong>
            {day.focus && (
              <em className="physique-ux-day-focus-v4526">
                {day.focus}
              </em>
            )}
          </button>
        ))}
      </div>

      <section className="physique-ux-selected-day">
        <header>
          <div>
            <span>Treino {selectedDay.day_order}</span>
            <h2>{selectedDay.day_label}</h2>
            <p>{selectedDay.focus ?? selectedDay.notes ?? "Foco não informado"}</p>
          </div>
          <b>{selectedExercises.length} exercícios</b>
        </header>

        <div className="physique-ux-exercise-grid">
          {selectedExercises.map((exercise) => {
            const prescription = [exercise.sets_text, exercise.reps_text]
              .filter(Boolean)
              .join(" × ");
            const visual = getExerciseVisual(exercise.exercise_name);

            return (
              <article className="physique-ux-exercise-card" key={exercise.id}>
                {visual ? (
                  <button
                    aria-label={`Abrir análise muscular de ${exercise.exercise_name}`}
                    className="physique-ux-exercise-visual physique-ux-exercise-visual-button"
                    onClick={() => setSelectedInsight({ exercise, visual })}
                    type="button"
                  >
                    <Image
                      alt={`Grupo muscular: ${visual.label}`}
                      fill
                      sizes="(max-width: 720px) 104px, 132px"
                      src={visual.src}
                    />
                    <span>{exercise.exercise_order}</span>
                    <small className="physique-ux-exercise-open-analysis">
                      <MousePointerClick size={12} />
                      Analisar
                    </small>
                  </button>
                ) : (
                  <div className="physique-ux-exercise-visual">
                    <div className="physique-ux-exercise-visual-fallback">
                      <Dumbbell size={28} />
                    </div>
                    <span>{exercise.exercise_order}</span>
                  </div>
                )}

                <div className="physique-ux-exercise-copy">
                  <strong>{exercise.exercise_name}</strong>

                  {visual && (
                    <button
                      className="physique-ux-exercise-muscles physique-ux-exercise-muscles-button"
                      onClick={() => setSelectedInsight({ exercise, visual })}
                      type="button"
                    >
                      {visual.label}
                      <Info size={11} />
                    </button>
                  )}

                  <div className="physique-ux-exercise-meta">
                    <span>{prescription || "Séries/repetições não informadas"}</span>
                    {exercise.rest_seconds != null && (
                      <span><Clock3 size={12} /> {exercise.rest_seconds}s</span>
                    )}
                  </div>

                  {(exercise.technique || exercise.load_guidance || exercise.notes) && (
                    <div className="physique-ux-exercise-notes">
                      {exercise.technique && <p><b>Técnica:</b> {exercise.technique}</p>}
                      {exercise.load_guidance && <p><b>Carga:</b> {exercise.load_guidance}</p>}
                      {exercise.notes && <p>{exercise.notes}</p>}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedInsight && (
        <ExerciseMuscleModal
          exercise={selectedInsight.exercise}
          onClose={() => setSelectedInsight(null)}
          visual={selectedInsight.visual}
        />
      )}
    </div>
  );
}
