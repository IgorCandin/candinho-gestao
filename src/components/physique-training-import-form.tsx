"use client";

import {
  CheckCircle2,
  ChevronDown,
  FileText,
  FileUp,
  LoaderCircle,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PhysiqueAthleteOption = { id: string; display_name: string };

type Exercise = {
  exercise_name: string;
  sets_text: string | null;
  reps_text: string | null;
  rest_seconds: number | null;
  technique: string | null;
  load_guidance: string | null;
  notes: string | null;
};

type TrainingDay = {
  day_label: string;
  focus: string | null;
  notes: string | null;
  exercises: Exercise[];
};

type TrainingPreview = {
  title: string;
  goal: string | null;
  coach_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  notes: string | null;
  days: TrainingDay[];
  summary: string;
  model: string;
  provider?: string;
};

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function PhysiqueTrainingImportForm({
  athletes,
  initialAthleteId = "",
}: {
  athletes: PhysiqueAthleteOption[];
  initialAthleteId?: string;
}) {
  const router = useRouter();
  const [athleteId, setAthleteId] = useState(initialAthleteId || athletes[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<TrainingPreview | null>(null);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [coach, setCoach] = useState("");

  const exerciseCount = useMemo(
    () => preview?.days.reduce((sum, day) => sum + day.exercises.length, 0) ?? 0,
    [preview],
  );

  async function interpret() {
    if (!file) {
      setMessage("Selecione o PDF da ficha de treino.");
      return;
    }

    if (file.size === 0) {
      setMessage("O PDF selecionado está vazio.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setMessage("O PDF deve ter no máximo 4 MB para leitura pelo Nexus.");
      return;
    }

    setReading(true);
    setMessage(null);
    setPreview(null);

    try {
      const form = new FormData();
      form.set("file", file);

      const response = await fetch("/api/physique/interpretar-treino", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível ler o PDF.");
      }

      const next = data as TrainingPreview;
      setPreview(next);
      setTitle(next.title ?? "");
      setGoal(next.goal ?? "");
      setCoach(next.coach_name ?? "");

      setMessage(
        next.days.length > 0 && next.days.some((day) => day.exercises.length > 0)
          ? "Ficha interpretada. Revise o resumo e os dias antes de salvar."
          : "O Nexus leu o PDF, mas não encontrou exercícios suficientes para criar uma ficha.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível interpretar a ficha.");
    } finally {
      setReading(false);
    }
  }

  async function save() {
    if (!athleteId) {
      setMessage("Selecione o atleta.");
      return;
    }

    if (!file || !preview) {
      setMessage("Leia o PDF com o Nexus antes de salvar.");
      return;
    }

    if (preview.days.length === 0 || exerciseCount === 0) {
      setMessage("A leitura não contém dias e exercícios suficientes para salvar uma ficha estruturada.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const payload = {
        ...preview,
        title: title.trim() || preview.title,
        goal: goal.trim() || null,
        coach_name: coach.trim() || null,
      };

      const { data: planId, error: rpcError } = await supabase.rpc(
        "create_physique_training_plan_from_ai",
        {
          p_athlete_id: athleteId,
          p_title: payload.title,
          p_goal: payload.goal,
          p_status: "active",
          p_starts_on: preview.starts_on || null,
          p_ends_on: preview.ends_on || null,
          p_coach_name: payload.coach_name,
          p_notes: preview.notes || preview.summary || null,
          p_ai_model: preview.model || null,
          p_ai_payload: payload,
        },
      );

      if (rpcError) throw new Error(rpcError.message);
      if (!planId) {
        throw new Error("A ficha foi processada, mas o sistema não retornou o identificador do plano.");
      }

      const id = String(planId);
      const path = `plans/${id}/${Date.now()}-${safeFileName(file.name || "ficha.pdf")}`;

      const upload = await supabase.storage
        .from("physique-training-files")
        .upload(path, file, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });

      if (upload.error) {
        router.push(`/physique/fichas/${id}?anexo=pendente`);
        router.refresh();
        return;
      }

      const attachment = await supabase.from("physique_training_attachments").insert({
        plan_id: id,
        file_name: file.name || "Ficha de treino.pdf",
        file_url: path,
        mime_type: file.type || "application/pdf",
        file_size_bytes: file.size,
      });

      if (attachment.error) {
        await supabase.storage.from("physique-training-files").remove([path]);
        router.push(`/physique/fichas/${id}?anexo=pendente`);
        router.refresh();
        return;
      }

      router.push(`/physique/fichas/${id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(preview && preview.days.length > 0 && exerciseCount > 0);

  return (
    <div className="physique-ux-import-flow">
      <div className="physique-ux-stepper">
        <div className="active">
          <b>1</b>
          <span>Atleta e PDF</span>
        </div>
        <i />
        <div className={preview ? "active" : ""}>
          <b>2</b>
          <span>Revisar leitura</span>
        </div>
        <i />
        <div>
          <b>3</b>
          <span>Salvar ficha</span>
        </div>
      </div>

      <section className="physique-ux-import-stage">
        <header>
          <div className="physique-ux-stage-icon"><FileUp size={20} /></div>
          <div>
            <span>ETAPA 1</span>
            <h2>Envie a ficha para o Nexus</h2>
            <p>Escolha o atleta e o PDF. Nada é salvo como ficha antes da sua revisão.</p>
          </div>
        </header>

        <div className="physique-form-grid two">
          <label className="field">
            <span><UserRound size={13} /> Atleta</span>
            <select
              className="select"
              value={athleteId}
              onChange={(event) => setAthleteId(event.target.value)}
            >
              {athletes.map((athlete) => (
                <option value={athlete.id} key={athlete.id}>
                  {athlete.display_name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span><FileText size={13} /> PDF da ficha</span>
            <input
              className="input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setMessage(null);
              }}
            />
          </label>
        </div>

        {file && (
          <div className="physique-ux-file-selected">
            <FileText size={18} />
            <div>
              <strong>{file.name}</strong>
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        )}

        <button
          className="physique-action-button secondary"
          type="button"
          disabled={reading || saving || !file}
          onClick={interpret}
        >
          {reading ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
          {reading ? "Nexus analisando a ficha..." : "Analisar ficha com Nexus"}
        </button>
      </section>

      {preview && (
        <section className="physique-ux-import-stage highlight">
          <header>
            <div className="physique-ux-stage-icon success"><CheckCircle2 size={20} /></div>
            <div>
              <span>ETAPA 2</span>
              <h2>Revise o que foi identificado</h2>
              <p>{preview.summary}</p>
            </div>
            <div className="physique-ux-import-summary-kpis">
              <b>{preview.days.length}<small>treinos</small></b>
              <b>{exerciseCount}<small>exercícios</small></b>
            </div>
          </header>

          <div className="physique-form-grid three">
            <label className="field">
              <span>Título</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field">
              <span>Objetivo</span>
              <input className="input" value={goal} onChange={(event) => setGoal(event.target.value)} />
            </label>
            <label className="field">
              <span>Treinador</span>
              <input className="input" value={coach} onChange={(event) => setCoach(event.target.value)} />
            </label>
          </div>

          <div className="physique-ux-import-days">
            {preview.days.map((day, index) => (
              <details key={`${day.day_label}-${index}`} open={index === 0}>
                <summary>
                  <div>
                    <small>Treino {index + 1}</small>
                    <strong>{day.day_label}</strong>
                    <span>{day.focus ?? "Sem foco descrito"}</span>
                  </div>
                  <b>{day.exercises.length} exercícios</b>
                  <ChevronDown size={16} />
                </summary>

                <div>
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <article key={`${exercise.exercise_name}-${exerciseIndex}`}>
                      <b>{exerciseIndex + 1}</b>
                      <div>
                        <strong>{exercise.exercise_name}</strong>
                        <span>
                          {[exercise.sets_text, exercise.reps_text].filter(Boolean).join(" × ") ||
                            "Séries/repetições não informadas"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="physique-ux-save-strip">
            <div>
              <span>ETAPA 3</span>
              <strong>Está tudo certo?</strong>
              <p>Ao salvar, a ficha estruturada fica ativa no perfil do atleta e o PDF original é preservado.</p>
            </div>

            <button
              className="physique-action-button secondary"
              type="button"
              disabled={saving || reading || !canSave}
              onClick={save}
            >
              {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              {saving ? "Salvando ficha..." : "Salvar ficha e PDF"}
            </button>
          </div>
        </section>
      )}

      {message && (
        <p className={`physique-form-message ${preview ? "success" : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}
