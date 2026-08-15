"use client";

import Image from "next/image";
import { Clock3, Dumbbell } from "lucide-react";
import { useMemo, useState } from "react";

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

const exerciseVisuals = [
  {
    src: "/images/physique/exercises/back-biceps.png",
    label: "Costas e bíceps",
    terms: ["puxad", "remad", "barra fixa", "pulley", "dorsal", "costas", "rosca", "biceps", "bíceps"],
  },
  {
    src: "/images/physique/exercises/chest-triceps.png",
    label: "Peito e tríceps",
    terms: ["supino", "peitoral", "crucifixo", "flexao", "flexão", "triceps", "tríceps", "mergulho", "paralela"],
  },
  {
    src: "/images/physique/exercises/legs-glutes.png",
    label: "Pernas e glúteos",
    terms: ["agach", "leg press", "extensora", "flexora", "stiff", "terra", "panturrilha", "glute", "glúte", "avanco", "avanço", "passada", "afundo", "adutor", "abdutor"],
  },
  {
    src: "/images/physique/exercises/shoulders.png",
    label: "Ombros",
    terms: ["ombro", "deltoid", "elevação lateral", "elevacao lateral", "desenvolvimento", "face pull", "encolhimento"],
  },
  {
    src: "/images/physique/exercises/core-cardio.png",
    label: "Core e condicionamento",
    terms: ["abdominal", "prancha", "core", "bike", "bicicleta", "esteira", "corrida", "eliptico", "elíptico", "cardio", "aquecimento"],
  },
] as const;

function getExerciseVisual(exerciseName: string) {
  const normalized = exerciseName.toLocaleLowerCase("pt-BR");
  return exerciseVisuals.find((visual) =>
    visual.terms.some((term) => normalized.includes(term)),
  ) ?? null;
}

export function PhysiqueTrainingPlanView({
  days,
  exercises,
}: {
  days: Day[];
  exercises: Exercise[];
}) {
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");

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
                <div className="physique-ux-exercise-visual">
                  {visual ? (
                    <Image
                      alt={`Grupo muscular: ${visual.label}`}
                      fill
                      sizes="(max-width: 720px) 104px, 132px"
                      src={visual.src}
                    />
                  ) : (
                    <div className="physique-ux-exercise-visual-fallback">
                      <Dumbbell size={28} />
                    </div>
                  )}
                  <span>{exercise.exercise_order}</span>
                </div>

                <div className="physique-ux-exercise-copy">
                  <strong>{exercise.exercise_name}</strong>

                  {visual && (
                    <small className="physique-ux-exercise-muscles">
                      {visual.label}
                    </small>
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
    </div>
  );
}
