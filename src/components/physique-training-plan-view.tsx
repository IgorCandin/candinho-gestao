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

type AnalysisKey =
  | "chestPress"
  | "crossover"
  | "pushUp"
  | "curl"
  | "triceps"
  | "calf"
  | "bike"
  | "hipThrust"
  | "kneeExtension"
  | "legCurl"
  | "legPress"
  | "hinge"
  | "squat"
  | "reverseFly"
  | "pulldown"
  | "row"
  | "lateralRaise"
  | "core";

type ExerciseVisual = {
  src: string;
  label: string;
  terms?: string[];
  exactNames?: string[];
  analysisKey: AnalysisKey;
  note?: string;
};

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

const MUSCLE_ANALYSES: Record<AnalysisKey, MuscleAnalysis> = {
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
    joints: ["Cotovelo: flexão", "Antebraço: supinação ou pegada neutra, conforme a variação", "Ombro: estabilidade"],
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
    errors: ["Pelve descolar no fundo", "Joelhos colapsarem para dentro", "Amplitude além do controle", "Empurrar só com a ponta do pé"],
    tip: "A posição dos pés muda a ênfase, mas o principal é manter quadril e joelhos alinhados ao longo da repetição.",
  },
  hinge: {
    objective: "Desenvolver a cadeia posterior por meio de flexão e extensão do quadril com coluna estável.",
    primary: ["Isquiotibiais", "Glúteo máximo"],
    secondary: ["Eretores da espinha", "Adutores"],
    stabilizers: ["Core"],
    joints: ["Quadril: flexão/extensão", "Joelho: leve flexão mantida", "Coluna: neutralidade"],
    cues: ["Empurre o quadril para trás", "Mantenha a coluna neutra", "Barra ou carga próxima do corpo", "Suba estendendo quadril com controle"],
    errors: ["Arredondar a lombar", "Transformar o movimento em agachamento", "Afastar a carga do corpo", "Perder tensão na volta"],
    tip: "No stiff/romeno, o quadril manda no movimento; os joelhos participam, mas não devem dominar a descida.",
  },
  squat: {
    objective: "Desenvolver força global de membros inferiores, integrando joelhos e quadris com controle do tronco.",
    primary: ["Quadríceps", "Glúteo máximo"],
    secondary: ["Adutores", "Isquiotibiais"],
    stabilizers: ["Glúteo médio", "Core", "Eretores da espinha"],
    joints: ["Quadril: flexão/extensão", "Joelho: flexão/extensão", "Tornozelo: estabilidade"],
    cues: ["Pés firmes", "Joelhos acompanham a linha dos pés", "Tronco organizado", "Suba distribuindo a força no meio do pé"],
    errors: ["Joelhos colapsarem", "Perder a coluna neutra", "Amplitude sem controle", "Deslocar demais o peso para a ponta do pé"],
    tip: "A base e a intenção mudam entre convencional, sumô e isométrico, mas o alinhamento continua sendo o que mais protege e rende força.",
  },
  reverseFly: {
    objective: "Trabalhar a abertura horizontal do ombro e o controle escapular, com ênfase em deltoide posterior e parte alta das costas.",
    primary: ["Deltoide posterior", "Romboides"],
    secondary: ["Trapézio médio/inferior"],
    stabilizers: ["Manguito rotador", "Core"],
    joints: ["Ombro: abdução horizontal", "Escápulas: retração", "Coluna: estabilidade"],
    cues: ["Abra os braços conduzindo com os cotovelos", "Mantenha pescoço relaxado", "Controle a volta", "Evite compensar com a lombar"],
    errors: ["Encolher os ombros", "Usar impulso do tronco", "Fazer amplitude curta demais", "Perder controle na volta"],
    tip: "Face pull e crucifixo inverso têm mecânicas diferentes, mas ambos dependem de boa organização escapular.",
  },
  pulldown: {
    objective: "Desenvolver a puxada vertical com foco nas costas.",
    primary: ["Latíssimo do dorso"],
    secondary: ["Redondo maior", "Bíceps braquial", "Trapézio médio/inferior", "Deltoide posterior"],
    stabilizers: ["Core"],
    joints: ["Ombro: adução/extensão", "Cotovelo: flexão", "Escápulas: depressão e retração"],
    cues: ["Peito aberto", "Puxe os cotovelos para baixo", "Controle o retorno", "Evite jogar o tronco para trás"],
    errors: ["Puxar atrás da nuca", "Usar balanço", "Elevar demais os ombros", "Encurtar a descida"],
    tip: "Pense em conduzir o movimento com os cotovelos e não apenas com as mãos.",
  },
  row: {
    objective: "Desenvolver a puxada horizontal com foco em costas, controle do tronco e estabilidade escapular.",
    primary: ["Latíssimo do dorso", "Romboides"],
    secondary: ["Trapézio médio/inferior", "Bíceps braquial", "Deltoide posterior"],
    stabilizers: ["Eretores da espinha", "Core"],
    joints: ["Ombro: extensão/adução horizontal", "Cotovelo: flexão", "Escápulas: retração"],
    cues: ["Puxe levando o cotovelo para trás", "Mantenha o peito organizado", "Controle a volta", "Evite arrancar com a lombar"],
    errors: ["Arredondar a coluna", "Usar impulso excessivo", "Perder o alinhamento do pescoço", "Encurtar a amplitude"],
    tip: "Na remada, a qualidade da retração escapular costuma dizer mais sobre a execução do que a carga em si.",
  },
  lateralRaise: {
    objective: "Enfatizar o deltoide lateral por meio da abdução do ombro.",
    primary: ["Deltoide lateral"],
    secondary: ["Trapézio superior"],
    stabilizers: ["Manguito rotador", "Core"],
    joints: ["Ombro: abdução", "Escápulas: controle"],
    cues: ["Suba os braços para os lados com leve flexão no cotovelo", "Punhos neutros", "Evite encolher os ombros", "Desça com controle"],
    errors: ["Usar balanço", "Elevar demais os ombros", "Roubar com o tronco", "Dobrar demais os cotovelos"],
    tip: "A elevação lateral rende mais quando o ombro sobe limpo, sem precisar de embalo do corpo.",
  },
  core: {
    objective: "Melhorar estabilidade do tronco e controle do centro do corpo.",
    primary: ["Reto abdominal", "Oblíquos"],
    secondary: ["Core"],
    stabilizers: ["Eretores da espinha", "Glúteo máximo"],
    joints: ["Coluna: controle", "Pelve: estabilidade", "Quadril: apoio conforme a variação"],
    cues: ["Mantenha o abdômen ativo", "Respire sem perder pressão", "Evite compensar com lombar", "Controle o ritmo"],
    errors: ["Puxar com o pescoço", "Arqueamento excessivo da lombar", "Movimento sem controle", "Segurar a respiração o tempo todo"],
    tip: "No abdominal, sentir o tronco trabalhando vale mais do que correr para terminar a série.",
  },
};

const EXERCISE_VISUALS: ExerciseVisual[] = [
  {
    exactNames: ["supino reto"],
    src: "/images/physique/exercises/flat-barbell-bench-press.png",
    label: "Peito, ombros e tríceps",
    analysisKey: "chestPress",
  },
  {
    exactNames: ["supino reto máquina", "supino reto maquina"],
    src: "/images/physique/exercises/chest-press-machine-flat.webp",
    label: "Peito e tríceps",
    analysisKey: "chestPress",
  },
  {
    exactNames: [
      "supino inclinado com halter",
      "supino inclinado máquina",
      "supino inclinado maquina",
      "supino inclinado máquina ou halter",
      "supino inclinado maquina ou halter",
    ],
    src: "/images/physique/exercises/chest-press.webp",
    label: "Peito superior, ombros e tríceps",
    analysisKey: "chestPress",
    note: "Imagem representativa da família do movimento (supino/chest press inclinado).",
  },
  {
    exactNames: ["crossover baixo para cima"],
    src: "/images/physique/exercises/low-to-high-cable-crossover.png",
    label: "Peito superior",
    analysisKey: "crossover",
  },
  {
    exactNames: ["rosca scott unilateral ou alternada"],
    src: "/images/physique/exercises/preacher-curl.png",
    label: "Bíceps e braquial",
    analysisKey: "curl",
    note: "Imagem representativa da variação Scott; a execução pode alternar ou ser unilateral.",
  },
  {
    exactNames: ["rosca direta"],
    src: "/images/physique/exercises/barbell-biceps-curl.png",
    label: "Bíceps e braquial",
    analysisKey: "curl",
  },
  {
    exactNames: ["rosca martelo"],
    src: "/images/physique/exercises/biceps-curl.webp",
    label: "Bíceps, braquial e braquiorradial",
    analysisKey: "curl",
    note: "Imagem representativa da rosca; o foco na martelo é a pegada neutra.",
  },
  {
    exactNames: ["tríceps francês unilateral no cabo", "triceps frances unilateral no cabo"],
    src: "/images/physique/exercises/overhead-cable-triceps-extension.png",
    label: "Tríceps",
    analysisKey: "triceps",
  },
  {
    exactNames: ["tríceps unilateral no cabo", "triceps unilateral no cabo"],
    src: "/images/physique/exercises/triceps-cable.webp",
    label: "Tríceps",
    analysisKey: "triceps",
  },
  {
    exactNames: ["flexão com pés elevados", "flexao com pes elevados"],
    src: "/images/physique/exercises/decline-push-up.png",
    label: "Peito, ombros e tríceps",
    analysisKey: "pushUp",
  },
  {
    exactNames: ["flexão normal", "flexao normal", "flexão", "flexao", "flexão de braços", "flexao de bracos"],
    src: "/images/physique/exercises/push-up.png",
    label: "Peito, ombros e tríceps",
    analysisKey: "pushUp",
  },
  {
    exactNames: ["bike"],
    src: "/images/physique/exercises/bike.webp",
    label: "Core e condicionamento",
    analysisKey: "bike",
  },
  {
    exactNames: ["elevação pélvica no sofá", "elevacao pelvica no sofa", "elevação pélvica unilateral", "elevacao pelvica unilateral"],
    src: "/images/physique/exercises/hip-thrust.webp",
    label: "Glúteos e posteriores",
    analysisKey: "hipThrust",
    note: "Imagem representativa da elevação pélvica; a variação unilateral pode ter execução diferente da foto.",
  },
  {
    exactNames: ["cadeira extensora"],
    src: "/images/physique/exercises/knee-extension.webp",
    label: "Quadríceps",
    analysisKey: "kneeExtension",
  },
  {
    exactNames: ["cadeira ou mesa flexora bilateral", "mesa ou cadeira flexora bilateral"],
    src: "/images/physique/exercises/leg-curl-bilateral.png",
    label: "Posteriores de coxa",
    analysisKey: "legCurl",
  },
  {
    exactNames: ["flexora", "flexora unilateral"],
    src: "/images/physique/exercises/leg-curl.webp",
    label: "Posteriores de coxa",
    analysisKey: "legCurl",
    note: "Imagem representativa da flexora; a variação unilateral pode mudar a máquina ou a posição.",
  },
  {
    exactNames: ["leg press"],
    src: "/images/physique/exercises/leg-press.webp",
    label: "Pernas e glúteos",
    analysisKey: "legPress",
  },
  {
    exactNames: ["stiff / terra romeno", "stiff moderado"],
    src: "/images/physique/exercises/romanian-deadlift.webp",
    label: "Posteriores e glúteos",
    analysisKey: "hinge",
  },
  {
    exactNames: ["agachamento livre ou smith", "agachamento isométrico", "agachamento sumô", "agachamento sumo"],
    src: "/images/physique/exercises/squat.webp",
    label: "Pernas e glúteos",
    analysisKey: "squat",
    note: "Imagem representativa da família do agachamento; sumô e isométrico têm base e intenção diferentes da foto padrão.",
  },
  {
    exactNames: ["crucifixo inverso ou face pull"],
    src: "/images/physique/exercises/reverse-fly.webp",
    label: "Posterior de ombro e costas",
    analysisKey: "reverseFly",
    note: "Imagem representativa da família do movimento; face pull não tem exatamente a mesma foto do crucifixo inverso.",
  },
  {
    exactNames: ["puxada aberta"],
    src: "/images/physique/exercises/pulldown.webp",
    label: "Costas e bíceps",
    analysisKey: "pulldown",
  },
  {
    exactNames: ["remada máquina ou baixa", "remada maquina ou baixa"],
    src: "/images/physique/exercises/row.webp",
    label: "Costas e bíceps",
    analysisKey: "row",
  },
  {
    exactNames: ["elevação lateral", "elevacao lateral"],
    src: "/images/physique/exercises/lateral-raise.webp",
    label: "Ombros",
    analysisKey: "lateralRaise",
  },
  {
    exactNames: ["panturrilha no leg ou máquina", "panturrilha no leg ou maquina"],
    src: "/images/physique/exercises/seated-leg-press-calf-raise.png",
    label: "Panturrilhas",
    analysisKey: "calf",
  },
  {
    exactNames: ["panturrilha unilateral", "panturrilha isométrica", "panturrilha isometrica"],
    src: "/images/physique/exercises/calf-raise.webp",
    label: "Panturrilhas",
    analysisKey: "calf",
    note: "Imagem representativa da panturrilha; unilateral e isométrica podem variar em apoio e postura.",
  },
  {
    exactNames: ["abdominal reverso"],
    src: "/images/physique/exercises/core-cardio.webp",
    label: "Core",
    analysisKey: "core",
    note: "Ainda não há arte específica para abdominal reverso; esta imagem representa a categoria de core.",
  },

  // Fallbacks genéricos
  {
    terms: ["supino", "peitoral", "paralela", "mergulho"],
    src: "/images/physique/exercises/chest-press-machine-flat.webp",
    label: "Peito e tríceps",
    analysisKey: "chestPress",
  },
  {
    terms: ["crossover", "crucifixo"],
    src: "/images/physique/exercises/chest-press-machine-flat.webp",
    label: "Peito e ombros",
    analysisKey: "crossover",
    note: "Imagem representativa da família do movimento.",
  },
  {
    terms: ["rosca", "curl"],
    src: "/images/physique/exercises/biceps-curl.webp",
    label: "Bíceps e braquial",
    analysisKey: "curl",
  },
  {
    terms: ["tríceps", "triceps"],
    src: "/images/physique/exercises/triceps-cable.webp",
    label: "Tríceps",
    analysisKey: "triceps",
  },
  {
    terms: ["panturrilha", "gêmeos", "gemeos"],
    src: "/images/physique/exercises/calf-raise.webp",
    label: "Panturrilhas",
    analysisKey: "calf",
  },
  {
    terms: ["bike", "bicicleta", "spinning"],
    src: "/images/physique/exercises/bike.webp",
    label: "Core e condicionamento",
    analysisKey: "bike",
  },
  {
    terms: ["elevação pélvica", "elevacao pelvica", "hip thrust", "ponte de glúteo", "ponte de gluteo"],
    src: "/images/physique/exercises/hip-thrust.webp",
    label: "Glúteos e posteriores",
    analysisKey: "hipThrust",
  },
  {
    terms: ["extensora"],
    src: "/images/physique/exercises/knee-extension.webp",
    label: "Quadríceps",
    analysisKey: "kneeExtension",
  },
  {
    terms: ["flexora", "leg curl"],
    src: "/images/physique/exercises/leg-curl.webp",
    label: "Posteriores de coxa",
    analysisKey: "legCurl",
  },
  {
    terms: ["leg press"],
    src: "/images/physique/exercises/leg-press.webp",
    label: "Pernas e glúteos",
    analysisKey: "legPress",
  },
  {
    terms: ["stiff", "romeno", "rdl", "terra"],
    src: "/images/physique/exercises/romanian-deadlift.webp",
    label: "Posteriores e glúteos",
    analysisKey: "hinge",
  },
  {
    terms: ["agach", "sumô", "sumo", "avanço", "avanco", "passada", "afundo"],
    src: "/images/physique/exercises/squat.webp",
    label: "Pernas e glúteos",
    analysisKey: "squat",
  },
  {
    terms: ["face pull", "crucifixo inverso", "voador inverso", "reverse fly"],
    src: "/images/physique/exercises/reverse-fly.webp",
    label: "Posterior de ombro e costas",
    analysisKey: "reverseFly",
  },
  {
    terms: ["puxada", "pulldown", "pulley", "barra fixa"],
    src: "/images/physique/exercises/pulldown.webp",
    label: "Costas e bíceps",
    analysisKey: "pulldown",
  },
  {
    terms: ["remada"],
    src: "/images/physique/exercises/row.webp",
    label: "Costas e bíceps",
    analysisKey: "row",
  },
  {
    terms: ["ombro", "elevação lateral", "elevacao lateral", "desenvolvimento"],
    src: "/images/physique/exercises/lateral-raise.webp",
    label: "Ombros",
    analysisKey: "lateralRaise",
  },
  {
    terms: ["abdominal", "core", "prancha"],
    src: "/images/physique/exercises/core-cardio.webp",
    label: "Core",
    analysisKey: "core",
  },
];

function normalize(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getExerciseVisual(exerciseName: string) {
  const normalized = normalize(exerciseName);

  const exact = EXERCISE_VISUALS.find((visual) =>
    visual.exactNames?.some((name) => normalize(name) === normalized),
  );
  if (exact) return exact;

  return (
    EXERCISE_VISUALS.find((visual) =>
      visual.terms?.some((term) => normalized.includes(normalize(term))),
    ) ?? null
  );
}

function MuscleList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <strong style={{ fontSize: 12 }}>{title}</strong>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,.03)",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 12 }}>{item}</div>
            <div style={{ opacity: 0.78, fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>
              {MUSCLE_FUNCTIONS[item] ?? "Participa da mecânica do exercício e ajuda a estabilizar ou produzir movimento."}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseInsightModal({
  exercise,
  visual,
  onClose,
}: {
  exercise: Exercise;
  visual: ExerciseVisual;
  onClose: () => void;
}) {
  const analysis = MUSCLE_ANALYSES[visual.analysisKey];
  const prescription = [exercise.sets_text, exercise.reps_text].filter(Boolean).join(" × ");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(2, 8, 16, 0.78)",
        backdropFilter: "blur(8px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "min(92vh, 980px)",
          overflow: "auto",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,.08)",
          background:
            "radial-gradient(circle at top right, rgba(87,216,184,.08), transparent 30%), radial-gradient(circle at bottom left, rgba(214,193,93,.06), transparent 34%), rgba(8,14,23,.98)",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          color: "#eef4fb",
        }}
      >
        <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#dcc46c", fontSize: 10, fontWeight: 900, letterSpacing: ".14em" }}>ANÁLISE DO EXERCÍCIO</div>
            <h3 style={{ margin: "6px 0 4px", fontSize: 28, lineHeight: 1.05 }}>{exercise.exercise_name}</h3>
            <p style={{ margin: 0, opacity: 0.75, fontSize: 12 }}>{visual.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.04)",
              color: "#eef4fb",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            aria-label="Fechar análise"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) minmax(0, 1fr)", gap: 18 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 18, overflow: "hidden", background: "#fff" }}>
                <Image src={visual.src} alt={`Visual do exercício ${exercise.exercise_name}`} fill sizes="(max-width: 900px) 100vw, 360px" style={{ objectFit: "cover" }} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13 }}><Target size={15} /> Objetivo</div>
                <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,.03)", fontSize: 12, lineHeight: 1.55 }}>
                  {analysis.objective}
                </div>
              </div>
              {(visual.note || exercise.technique || exercise.load_guidance || exercise.notes) && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13 }}><Info size={15} /> Observações</div>
                  <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,.03)", fontSize: 12, lineHeight: 1.55, display: "grid", gap: 6 }}>
                    {visual.note && <div><strong>Visual:</strong> {visual.note}</div>}
                    {prescription && <div><strong>Séries/Reps:</strong> {prescription}</div>}
                    {exercise.rest_seconds != null && <div><strong>Descanso:</strong> {exercise.rest_seconds}s</div>}
                    {exercise.technique && <div><strong>Técnica:</strong> {exercise.technique}</div>}
                    {exercise.load_guidance && <div><strong>Carga:</strong> {exercise.load_guidance}</div>}
                    {exercise.notes && <div><strong>Nota da ficha:</strong> {exercise.notes}</div>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <MuscleList title="Músculos principais" items={analysis.primary} />
                <MuscleList title="Músculos secundários" items={analysis.secondary} />
                <MuscleList title="Estabilizadores" items={analysis.stabilizers} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><Activity size={15} /> Movimentos articulares</strong>
                  <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,.03)", display: "grid", gap: 7 }}>
                    {analysis.joints.map((item) => (
                      <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.45 }}><CheckCircle2 size={15} style={{ flex: "0 0 auto", color: "#9ff1d8" }} /> {item}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><CheckCircle2 size={15} /> Execução</strong>
                  <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,.03)", display: "grid", gap: 7 }}>
                    {analysis.cues.map((item) => (
                      <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.45 }}><CheckCircle2 size={15} style={{ flex: "0 0 auto", color: "#9ff1d8" }} /> {item}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><AlertTriangle size={15} /> Erros comuns</strong>
                  <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,.03)", display: "grid", gap: 7 }}>
                    {analysis.errors.map((item) => (
                      <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.45 }}><AlertTriangle size={15} style={{ flex: "0 0 auto", color: "#ff8a8a" }} /> {item}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(87,216,184,.16)", borderRadius: 16, padding: 14, background: "rgba(87,216,184,.05)", display: "grid", gap: 8 }}>
                <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><Sparkles size={15} /> Dica Physique</strong>
                <div style={{ fontSize: 12, lineHeight: 1.55 }}>{analysis.tip}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const [insightExerciseId, setInsightExerciseId] = useState<string | null>(null);

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

  const insightExercise = selectedExercises.find((exercise) => exercise.id === insightExerciseId) ?? null;
  const insightVisual = insightExercise ? getExerciseVisual(insightExercise.exercise_name) : null;

  useEffect(() => {
    if (!selectedExercises.some((exercise) => exercise.id === insightExerciseId)) {
      setInsightExerciseId(null);
    }
  }, [insightExerciseId, selectedExercises]);

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
            {day.focus && <em className="physique-ux-day-focus-v4526">{day.focus}</em>}
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
            const prescription = [exercise.sets_text, exercise.reps_text].filter(Boolean).join(" × ");
            const visual = getExerciseVisual(exercise.exercise_name);
            const canAnalyze = Boolean(visual);

            return (
              <article className="physique-ux-exercise-card" key={exercise.id}>
                <button
                  className="physique-ux-exercise-visual"
                  onClick={() => visual && setInsightExerciseId(exercise.id)}
                  type="button"
                  style={{
                    border: 0,
                    cursor: visual ? "pointer" : "default",
                    padding: 0,
                    textAlign: "left",
                  }}
                  aria-label={visual ? `Abrir análise de ${exercise.exercise_name}` : `Visual de ${exercise.exercise_name}`}
                  disabled={!visual}
                >
                  {visual ? (
                    <Image alt={`Grupo muscular: ${visual.label}`} fill sizes="(max-width: 720px) 104px, 132px" src={visual.src} />
                  ) : (
                    <div className="physique-ux-exercise-visual-fallback">
                      <Dumbbell size={28} />
                    </div>
                  )}
                  <span>{exercise.exercise_order}</span>
                  {canAnalyze && (
                    <div
                      style={{
                        position: "absolute",
                        right: 7,
                        bottom: 7,
                        zIndex: 1,
                        padding: "5px 8px",
                        borderRadius: 999,
                        fontSize: 8,
                        fontWeight: 900,
                        color: "#07110e",
                        background: "rgba(255,255,255,.94)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MousePointerClick size={11} /> Analisar
                    </div>
                  )}
                </button>

                <div className="physique-ux-exercise-copy">
                  <strong>{exercise.exercise_name}</strong>

                  {visual && (
                    <button
                      type="button"
                      onClick={() => setInsightExerciseId(exercise.id)}
                      className="physique-ux-exercise-muscles"
                      style={{
                        border: 0,
                        padding: 0,
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {visual.label}
                    </button>
                  )}

                  <div className="physique-ux-exercise-meta">
                    <span>{prescription || "Séries/repetições não informadas"}</span>
                    {exercise.rest_seconds != null && (
                      <span>
                        <Clock3 size={12} /> {exercise.rest_seconds}s
                      </span>
                    )}
                  </div>

                  {(exercise.technique || exercise.load_guidance || exercise.notes || visual?.note) && (
                    <div className="physique-ux-exercise-notes">
                      {visual?.note && <p><b>Visual:</b> {visual.note}</p>}
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

      {insightExercise && insightVisual && (
        <ExerciseInsightModal
          exercise={insightExercise}
          visual={insightVisual}
          onClose={() => setInsightExerciseId(null)}
        />
      )}
    </div>
  );
}
