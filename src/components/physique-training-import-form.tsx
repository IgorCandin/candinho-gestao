"use client";

import { CheckCircle2, FileUp, LoaderCircle, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PhysiqueAthleteOption = { id: string; display_name: string };
type Exercise = { exercise_name: string; sets_text: string | null; reps_text: string | null; rest_seconds: number | null; technique: string | null; load_guidance: string | null; notes: string | null };
type TrainingDay = { day_label: string; focus: string | null; notes: string | null; exercises: Exercise[] };
type TrainingPreview = { title: string; goal: string | null; coach_name: string | null; starts_on: string | null; ends_on: string | null; notes: string | null; days: TrainingDay[]; summary: string; model: string };

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function PhysiqueTrainingImportForm({ athletes, initialAthleteId = "" }: { athletes: PhysiqueAthleteOption[]; initialAthleteId?: string }) {
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
      const response = await fetch("/api/physique/interpretar-treino", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível ler o PDF.");

      const next = data as TrainingPreview;
      setPreview(next);
      setTitle(next.title ?? "");
      setGoal(next.goal ?? "");
      setCoach(next.coach_name ?? "");
      setMessage(
        next.days.length > 0 && next.days.some((day) => day.exercises.length > 0)
          ? "Ficha lida pelo Nexus. Revise o resumo e os dados antes de salvar."
          : "O Nexus leu o PDF, mas não encontrou exercícios suficientes para criar uma ficha. Confira o arquivo.",
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

      const { data: planId, error: rpcError } = await supabase.rpc("create_physique_training_plan_from_ai", {
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
      });
      if (rpcError) throw rpcError;
      if (!planId) throw new Error("A ficha foi processada, mas o sistema não retornou o identificador do plano.");

      const id = String(planId);
      const path = `plans/${id}/${Date.now()}-${safeFileName(file.name || "ficha.pdf")}`;
      const upload = await supabase.storage
        .from("physique-training-files")
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });

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
    <div className="physique-form">
      <div className="physique-form-heading">
        <Sparkles size={20} />
        <div><strong>Importar ficha com Nexus</strong><span>Envie o PDF, revise a leitura e só então grave a ficha estruturada.</span></div>
      </div>
      <div className="physique-form-grid two">
        <label className="field"><span>Atleta</span><select className="select" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>{athletes.map((a) => <option value={a.id} key={a.id}>{a.display_name}</option>)}</select></label>
        <label className="field"><span>PDF da ficha</span><input className="input" type="file" accept="application/pdf,.pdf" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} /></label>
      </div>
      <button className="physique-action-button" type="button" disabled={reading || saving || !file} onClick={interpret}>
        {reading ? <LoaderCircle className="spin" size={16} /> : <FileUp size={16} />}
        {reading ? "Nexus lendo PDF" : "Ler PDF com Nexus"}
      </button>
      {preview && <div className="physique-nexus-preview">
        <div className="physique-nexus-preview-head"><CheckCircle2 size={18} /><div><strong>{preview.days.length} treino(s) · {exerciseCount} exercício(s)</strong><span>{preview.summary}</span></div></div>
        <div className="physique-form-grid three">
          <label className="field"><span>Título</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="field"><span>Objetivo</span><input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
          <label className="field"><span>Treinador</span><input className="input" value={coach} onChange={(e) => setCoach(e.target.value)} /></label>
        </div>
        <div className="physique-import-day-list">{preview.days.map((day, index) => <article key={`${day.day_label}-${index}`}><strong>{day.day_label}</strong><span>{day.focus ?? "Sem foco descrito"}</span><small>{day.exercises.map((e) => e.exercise_name).join(" · ") || "Nenhum exercício identificado"}</small></article>)}</div>
        <button className="physique-action-button secondary" type="button" disabled={saving || reading || !canSave} onClick={save}>
          {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
          {saving ? "Salvando ficha" : "Salvar ficha e PDF"}
        </button>
      </div>}
      {message && <p className="physique-form-message">{message}</p>}
    </div>
  );
}
