"use client";

import { CheckCircle2, FilePlus2, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Analysis = {
  file_category: string;
  summary: string;
  extracted_facts: string[];
  attention_points: string[];
  normalized_context: string;
  suggested_goal: string;
};

type HistoryRow = {
  id: string;
  file_type: string;
  file_name: string;
  ai_summary: string | null;
  created_at: string;
};

const FILE_TYPES = [
  ["assessment", "Avaliação física"],
  ["training", "Ficha de treino"],
  ["front_photo", "Foto de frente"],
  ["side_photo", "Foto lateral"],
  ["back_photo", "Foto de costas"],
  ["nutrition", "Alimentação"],
  ["supplementation", "Suplementação"],
  ["exam", "Exame"],
  ["other", "Outro"],
] as const;

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function PhysiqueAthleteImportHub({
  athleteId,
  athleteName,
}: {
  athleteId: string;
  athleteName: string;
}) {
  const [title, setTitle] = useState(`Atualização de ${athleteName}`);
  const [fileType, setFileType] = useState("assessment");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [trainingTime, setTrainingTime] = useState("");
  const [supplements, setSupplements] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [additional, setAdditional] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const contextObject = useMemo(
    () => ({
      training_time: trainingTime.trim() || null,
      current_supplements: supplements.trim() || null,
      nutrition_context: nutrition.trim() || null,
      additional_context: additional.trim() || null,
    }),
    [trainingTime, supplements, nutrition, additional],
  );

  const context = useMemo(
    () =>
      [
        trainingTime.trim()
          ? `Horário/rotina de treino: ${trainingTime.trim()}`
          : "",
        supplements.trim()
          ? `Suplementação atual: ${supplements.trim()}`
          : "",
        nutrition.trim()
          ? `Alimentação atual: ${nutrition.trim()}`
          : "",
        additional.trim()
          ? `Contexto adicional: ${additional.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [trainingTime, supplements, nutrition, additional],
  );

  async function loadHistory() {
    const { data } = await createClient()
      .from("physique_athlete_import_files")
      .select("id,file_type,file_name,ai_summary,created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(12);

    setHistory((data ?? []) as HistoryRow[]);
  }

  useEffect(() => {
    void loadHistory();
  }, [athleteId]);

  async function analyzeAndSave() {
    if (!file) {
      setMessage("Selecione um arquivo.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setAnalysis(null);

    const supabase = createClient();
    let sessionId = activeSessionId;
    let createdSession = false;
    let uploadedPath: string | null = null;
    let fileRowId: string | null = null;
    let snapshotId: string | null = null;

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("file_type", fileType);
      form.set("context", context);

      const response = await fetch("/api/physique/importar-arquivo", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Não foi possível analisar o arquivo.",
        );
      }

      const parsed = payload.analysis as Analysis;
      setAnalysis(parsed);

      if (!sessionId) {
        const { data: session, error: sessionError } = await supabase
          .from("physique_athlete_import_sessions")
          .insert({
            athlete_id: athleteId,
            title: title.trim() || `Atualização de ${athleteName}`,
            status: "open",
            context: contextObject,
            ai_summary: parsed.summary,
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;
        sessionId = String(session.id);
        createdSession = true;
      } else {
        const { error: sessionUpdateError } = await supabase
          .from("physique_athlete_import_sessions")
          .update({
            title: title.trim() || `Atualização de ${athleteName}`,
            context: contextObject,
            ai_summary: parsed.summary,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (sessionUpdateError) throw sessionUpdateError;
      }

      uploadedPath = `athletes/${athleteId}/imports/${sessionId}/${Date.now()}-${safeFileName(file.name)}`;
      const upload = await supabase.storage
        .from("physique-training-files")
        .upload(uploadedPath, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (upload.error) throw upload.error;

      const { data: fileRow, error: fileError } = await supabase
        .from("physique_athlete_import_files")
        .insert({
          session_id: sessionId,
          athlete_id: athleteId,
          file_type: fileType,
          file_name: file.name,
          file_url: uploadedPath,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          ai_payload: { ...parsed, model: payload.model ?? null },
          ai_summary: parsed.summary,
        })
        .select("id")
        .single();
      if (fileError) throw fileError;
      fileRowId = String(fileRow.id);

      const { data: snapshot, error: snapshotError } = await supabase
        .from("physique_athlete_snapshots")
        .insert({
          athlete_id: athleteId,
          session_id: sessionId,
          source_file_id: fileRowId,
          snapshot_type: fileType,
          payload: {
            analysis: parsed,
            context: contextObject,
          },
          summary: parsed.summary,
        })
        .select("id")
        .single();
      if (snapshotError) throw snapshotError;
      snapshotId = String(snapshot.id);

      setActiveSessionId(sessionId);
      setMessage(
        "Arquivo adicionado a esta atualização. Importe outro arquivo ou conclua a atualização do atleta.",
      );
      setFile(null);
      setFileInputKey((value) => value + 1);
      await loadHistory();
    } catch (error) {
      if (snapshotId) {
        await supabase
          .from("physique_athlete_snapshots")
          .delete()
          .eq("id", snapshotId);
      }
      if (fileRowId) {
        await supabase
          .from("physique_athlete_import_files")
          .delete()
          .eq("id", fileRowId);
      }
      if (uploadedPath) {
        await supabase.storage
          .from("physique-training-files")
          .remove([uploadedPath]);
      }
      if (createdSession && sessionId) {
        await supabase
          .from("physique_athlete_import_sessions")
          .delete()
          .eq("id", sessionId);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o arquivo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeSession() {
    if (!activeSessionId) return;
    setFinishing(true);
    setMessage(null);

    try {
      const { error } = await createClient()
        .from("physique_athlete_import_sessions")
        .update({
          status: "completed",
          context: contextObject,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSessionId);

      if (error) throw error;

      setActiveSessionId(null);
      setAnalysis(null);
      setTitle(`Atualização de ${athleteName}`);
      setMessage(
        "Atualização concluída. O histórico foi preservado para comparação com as próximas avaliações e arquivos.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a atualização.",
      );
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="physique-import-hub">
      <div className="physique-form-heading">
        <FilePlus2 size={20} />
        <div>
          <strong>Importar arquivos do atleta</strong>
          <span>
            Crie uma atualização, adicione avaliação, ficha, fotos e contexto
            um arquivo por vez e conclua quando terminar.
          </span>
        </div>
      </div>

      {activeSessionId && (
        <div className="physique-import-result">
          <strong>Atualização em andamento</strong>
          <span>
            Os próximos arquivos serão agrupados nesta mesma atualização do
            atleta.
          </span>
        </div>
      )}

      <div className="physique-form-grid two">
        <label className="field">
          <span>Nome desta atualização</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Avaliação de julho"
          />
        </label>
        <label className="field">
          <span>Tipo do arquivo</span>
          <select
            className="select"
            value={fileType}
            onChange={(event) => setFileType(event.target.value)}
          >
            {FILE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="physique-import-context-grid">
        <label className="field">
          <span>Horário / rotina de treino</span>
          <input
            className="input"
            value={trainingTime}
            onChange={(event) => setTrainingTime(event.target.value)}
            placeholder="Ex.: treino às 6h, 5x por semana"
          />
        </label>
        <label className="field">
          <span>Suplementação atual</span>
          <textarea
            className="textarea"
            rows={2}
            value={supplements}
            onChange={(event) => setSupplements(event.target.value)}
            placeholder="Ex.: creatina 5g/dia, whey..."
          />
        </label>
        <label className="field">
          <span>Alimentação atual</span>
          <textarea
            className="textarea"
            rows={2}
            value={nutrition}
            onChange={(event) => setNutrition(event.target.value)}
            placeholder="Descreva livremente a rotina alimentar."
          />
        </label>
        <label className="field">
          <span>Contexto adicional</span>
          <textarea
            className="textarea"
            rows={2}
            value={additional}
            onChange={(event) => setAdditional(event.target.value)}
            placeholder="Objetivo, dificuldades e observações que ajudem o Nexus."
          />
        </label>
      </div>

      <label className="field">
        <span>Arquivo</span>
        <input
          key={fileInputKey}
          className="input"
          type="file"
          accept=".pdf,image/*,.txt,.csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setAnalysis(null);
          }}
        />
        <small className="form-help">
          Até 4 MB por arquivo. Para fotos, importe frente, lateral e costas
          separadamente dentro da mesma atualização.
        </small>
      </label>

      <div className="sale-action-buttons">
        <button
          className="physique-action-button secondary"
          type="button"
          disabled={!file || loading || finishing}
          onClick={analyzeAndSave}
        >
          {loading ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          {loading
            ? "Nexus analisando e salvando"
            : activeSessionId
              ? "Analisar e adicionar outro arquivo"
              : "Analisar e iniciar atualização"}
        </button>

        {activeSessionId && (
          <button
            className="physique-action-button"
            type="button"
            disabled={loading || finishing}
            onClick={completeSession}
          >
            {finishing ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {finishing ? "Concluindo" : "Concluir esta atualização"}
          </button>
        )}
      </div>

      {analysis && (
        <div className="physique-import-result">
          <strong>{analysis.summary}</strong>
          {analysis.normalized_context && (
            <span>{analysis.normalized_context}</span>
          )}
          {analysis.suggested_goal && (
            <span>Objetivo identificado: {analysis.suggested_goal}</span>
          )}
          {analysis.extracted_facts?.length > 0 && (
            <span>
              Identificado: {analysis.extracted_facts.join(" · ")}
            </span>
          )}
          {analysis.attention_points?.length > 0 && (
            <span>Revisar: {analysis.attention_points.join(" · ")}</span>
          )}
        </div>
      )}

      {message && <p className="physique-form-message">{message}</p>}

      {history.length > 0 && (
        <div>
          <div className="physique-panel-title">
            <div>
              <span>Histórico importado</span>
              <h3>Arquivos e snapshots recentes</h3>
            </div>
            <b>{history.length}</b>
          </div>
          <div className="physique-import-history">
            {history.map((item) => (
              <article key={item.id}>
                <strong>{item.file_name}</strong>
                <small>
                  {FILE_TYPES.find(([value]) => value === item.file_type)?.[1] ??
                    item.file_type}{" "}
                  · {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </small>
                {item.ai_summary && <small>{item.ai_summary}</small>}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
