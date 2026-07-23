"use client";

import {
  CheckCircle2,
  FilePlus2,
  History,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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

type ConsolidatedAnalysis = {
  summary: string;
  current_state: string;
  comparison_with_previous: string;
  objective_summary: string;
  recommended_primary_goal: string;
  training_summary: string;
  supplementation_summary: string;
  nutrition_summary: string;
  extracted_facts: string[];
  visual_notes: string[];
  attention_points: string[];
  inconsistencies: string[];
  missing_information: string[];
};

type SessionFile = {
  id: string;
  file_type: string;
  file_name: string;
  ai_summary: string | null;
  created_at: string;
};

type SessionOverview = {
  id: string;
  title: string;
  status: string;
  context: Record<string, unknown> | null;
  ai_summary: string | null;
  ai_payload: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  file_count: number;
  file_types: string[] | null;
};

type CurrentDossier = {
  session_id: string;
  title: string;
  ai_summary: string | null;
  ai_payload: Record<string, unknown> | null;
  completed_at: string | null;
  file_count: number;
  file_types: string[] | null;
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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function stringArray(
  payload: Record<string, unknown> | null,
  key: string,
): string[] {
  const value = payload?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function contextText(
  context: Record<string, unknown> | null,
  key: string,
) {
  const value = context?.[key];
  return typeof value === "string" ? value : "";
}

function fileTypeLabel(value: string) {
  return FILE_TYPES.find(([key]) => key === value)?.[1] ?? value;
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
  const [consolidation, setConsolidation] =
    useState<ConsolidatedAnalysis | null>(null);
  const [applySuggestedGoal, setApplySuggestedGoal] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionOverview[]>([]);
  const [currentDossier, setCurrentDossier] = useState<CurrentDossier | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
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

  async function loadSessionFiles(sessionId: string) {
    const { data, error } = await createClient()
      .from("physique_athlete_import_files")
      .select("id,file_type,file_name,ai_summary,created_at")
      .eq("session_id", sessionId)
      .order("created_at");

    if (error) throw error;
    setSessionFiles((data ?? []) as SessionFile[]);
  }

  async function loadOverview() {
    const supabase = createClient();

    const [
      { data: openSession, error: openError },
      { data: completedSessions, error: historyError },
      { data: latestDossier, error: dossierError },
    ] = await Promise.all([
      supabase
        .from("physique_athlete_import_session_overview")
        .select(
          "id,title,status,context,ai_summary,ai_payload,created_at,completed_at,file_count,file_types",
        )
        .eq("athlete_id", athleteId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("physique_athlete_import_session_overview")
        .select(
          "id,title,status,context,ai_summary,ai_payload,created_at,completed_at,file_count,file_types",
        )
        .eq("athlete_id", athleteId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(8),
      supabase
        .from("physique_athlete_current_dossier")
        .select(
          "session_id,title,ai_summary,ai_payload,completed_at,file_count,file_types",
        )
        .eq("athlete_id", athleteId)
        .maybeSingle(),
    ]);

    if (openError) throw openError;
    if (historyError) throw historyError;
    if (dossierError) throw dossierError;

    setSessionHistory((completedSessions ?? []) as SessionOverview[]);
    setCurrentDossier((latestDossier ?? null) as CurrentDossier | null);

    if (openSession) {
      const row = openSession as SessionOverview;
      const savedContext = objectValue(row.context);

      setActiveSessionId(row.id);
      setTitle(row.title || `Atualização de ${athleteName}`);
      setTrainingTime(contextText(savedContext, "training_time"));
      setSupplements(contextText(savedContext, "current_supplements"));
      setNutrition(contextText(savedContext, "nutrition_context"));
      setAdditional(contextText(savedContext, "additional_context"));
      await loadSessionFiles(row.id);
    } else {
      setActiveSessionId(null);
      setSessionFiles([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBootstrapping(true);
      try {
        await loadOverview();
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o dossiê do atleta.",
          );
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // athleteId é a identidade estável desta tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  async function findOpenSession() {
    const { data, error } = await createClient()
      .from("physique_athlete_import_sessions")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? String(data.id) : null;
  }

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

        if (sessionError) {
          if (sessionError.code === "23505") {
            sessionId = await findOpenSession();
            if (!sessionId) throw sessionError;
          } else {
            throw sessionError;
          }
        } else {
          sessionId = String(session.id);
          createdSession = true;
        }
      }

      if (!sessionId) {
        throw new Error("Não foi possível identificar a atualização aberta.");
      }

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
      setConsolidation(null);
      setApplySuggestedGoal(false);
      setMessage(
        "Arquivo adicionado à atualização. Adicione os próximos arquivos ou peça ao Nexus para consolidar tudo.",
      );
      setFile(null);
      setFileInputKey((value) => value + 1);
      await loadSessionFiles(sessionId);
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

  async function prepareConclusion() {
    if (!activeSessionId) return;

    setConsolidating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/physique/consolidar-atualizacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Não foi possível consolidar a atualização.",
        );
      }

      setConsolidation(payload.analysis as ConsolidatedAnalysis);
      setApplySuggestedGoal(false);
      setMessage(
        "Consolidação pronta. Revise o estado atual e a comparação antes de salvar no histórico.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível consolidar a atualização.",
      );
    } finally {
      setConsolidating(false);
    }
  }

  async function completeSession() {
    if (!activeSessionId || !consolidation) return;

    setFinishing(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "complete_physique_import_session",
        {
          p_session_id: activeSessionId,
          p_ai_summary: consolidation.summary,
          p_ai_payload: consolidation,
          p_context: contextObject,
          p_primary_goal:
            applySuggestedGoal && consolidation.recommended_primary_goal
              ? consolidation.recommended_primary_goal
              : null,
        },
      );

      if (error) throw error;

      setActiveSessionId(null);
      setSessionFiles([]);
      setAnalysis(null);
      setConsolidation(null);
      setApplySuggestedGoal(false);
      setTitle(`Atualização de ${athleteName}`);
      setTrainingTime("");
      setSupplements("");
      setNutrition("");
      setAdditional("");
      setMessage(
        "Atualização concluída. O novo estado do atleta e a comparação foram preservados no histórico.",
      );

      await loadOverview();
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

  const currentPayload = currentDossier?.ai_payload ?? null;
  const currentAttention = stringArray(currentPayload, "attention_points");

  return (
    <div className="physique-import-hub">
      {currentDossier && (
        <div className="physique-import-result">
          <strong>Estado atual consolidado</strong>
          <span>
            {currentDossier.ai_summary ??
              textValue(currentPayload, "current_state") ??
              "Última atualização concluída."}
          </span>

          {textValue(currentPayload, "comparison_with_previous") && (
            <span>
              Comparação: {textValue(currentPayload, "comparison_with_previous")}
            </span>
          )}

          {currentAttention.length > 0 && (
            <span>Acompanhar: {currentAttention.join(" · ")}</span>
          )}

          <small>
            {currentDossier.file_count} arquivo(s) ·{" "}
            {currentDossier.completed_at
              ? new Date(currentDossier.completed_at).toLocaleDateString("pt-BR")
              : "data não informada"}
          </small>
        </div>
      )}

      <div className="physique-form-heading">
        <FilePlus2 size={20}/>
        <div>
          <strong>Importar arquivos do atleta</strong>
          <span>
            Adicione avaliação, treino, fotos e contexto na mesma atualização.
            O Nexus consolida tudo antes de salvar um novo estado histórico.
          </span>
        </div>
      </div>

      {bootstrapping ? (
        <p className="form-help">Carregando dossiê do atleta...</p>
      ) : activeSessionId ? (
        <div className="physique-import-result">
          <strong>Atualização em andamento</strong>
          <span>
            Esta sessão foi preservada. Mesmo após recarregar a página, os próximos
            arquivos continuam agrupados aqui.
          </span>
          <span>{sessionFiles.length} arquivo(s) adicionado(s) nesta atualização.</span>
        </div>
      ) : (
        <p className="form-help">
          Nenhuma atualização aberta. O primeiro arquivo inicia uma nova sessão do dossiê.
        </p>
      )}

      <div className="physique-form-grid two">
        <label className="field">
          <span>Nome desta atualização</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Avaliação e treino · Julho"
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
            onChange={(event) => {
              setTrainingTime(event.target.value);
              setConsolidation(null);
            }}
            placeholder="Ex.: treino às 6h, 5x por semana"
          />
        </label>

        <label className="field">
          <span>Suplementação atual</span>
          <textarea
            className="textarea"
            rows={2}
            value={supplements}
            onChange={(event) => {
              setSupplements(event.target.value);
              setConsolidation(null);
            }}
            placeholder="Ex.: creatina 5g/dia, whey..."
          />
        </label>

        <label className="field">
          <span>Alimentação atual</span>
          <textarea
            className="textarea"
            rows={2}
            value={nutrition}
            onChange={(event) => {
              setNutrition(event.target.value);
              setConsolidation(null);
            }}
            placeholder="Descreva livremente a rotina alimentar."
          />
        </label>

        <label className="field">
          <span>Contexto adicional</span>
          <textarea
            className="textarea"
            rows={2}
            value={additional}
            onChange={(event) => {
              setAdditional(event.target.value);
              setConsolidation(null);
            }}
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
          Até 4 MB por arquivo. Importe frente, lateral e costas separadamente
          dentro da mesma atualização.
        </small>
      </label>

      <div className="sale-action-buttons">
        <button
          className="physique-action-button secondary"
          type="button"
          disabled={!file || loading || consolidating || finishing}
          onClick={analyzeAndSave}
        >
          {loading ? (
            <LoaderCircle className="spin" size={16}/>
          ) : (
            <Sparkles size={16}/>
          )}
          {loading
            ? "Nexus analisando e salvando"
            : activeSessionId
              ? "Analisar e adicionar arquivo"
              : "Analisar e iniciar atualização"}
        </button>

        {activeSessionId && sessionFiles.length > 0 && (
          <button
            className="physique-action-button"
            type="button"
            disabled={loading || consolidating || finishing}
            onClick={prepareConclusion}
          >
            {consolidating ? (
              <LoaderCircle className="spin" size={16}/>
            ) : (
              <Sparkles size={16}/>
            )}
            {consolidating
              ? "Consolidando dossiê"
              : consolidation
                ? "Refazer consolidação"
                : "Consolidar atualização com Nexus"}
          </button>
        )}
      </div>

      {analysis && (
        <div className="physique-import-result">
          <strong>Último arquivo analisado</strong>
          <span>{analysis.summary}</span>
          {analysis.extracted_facts?.length > 0 && (
            <span>Identificado: {analysis.extracted_facts.join(" · ")}</span>
          )}
          {analysis.attention_points?.length > 0 && (
            <span>Revisar: {analysis.attention_points.join(" · ")}</span>
          )}
        </div>
      )}

      {sessionFiles.length > 0 && (
        <div>
          <div className="physique-panel-title">
            <div>
              <span>Atualização aberta</span>
              <h3>Arquivos desta sessão</h3>
            </div>
            <b>{sessionFiles.length}</b>
          </div>

          <div className="physique-import-history">
            {sessionFiles.map((item) => (
              <article key={item.id}>
                <strong>{item.file_name}</strong>
                <small>
                  {fileTypeLabel(item.file_type)} ·{" "}
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </small>
                {item.ai_summary && <small>{item.ai_summary}</small>}
              </article>
            ))}
          </div>
        </div>
      )}

      {consolidation && (
        <div className="physique-import-result">
          <strong>Revisão final do Nexus</strong>
          <span>{consolidation.summary}</span>

          {consolidation.current_state && (
            <span>Estado atual: {consolidation.current_state}</span>
          )}
          {consolidation.comparison_with_previous && (
            <span>
              Comparação: {consolidation.comparison_with_previous}
            </span>
          )}
          {consolidation.objective_summary && (
            <span>Objetivo: {consolidation.objective_summary}</span>
          )}
          {consolidation.training_summary && (
            <span>Treino: {consolidation.training_summary}</span>
          )}
          {consolidation.supplementation_summary && (
            <span>
              Suplementação informada: {consolidation.supplementation_summary}
            </span>
          )}
          {consolidation.nutrition_summary && (
            <span>Alimentação informada: {consolidation.nutrition_summary}</span>
          )}
          {consolidation.visual_notes.length > 0 && (
            <span>Fotos/evolução: {consolidation.visual_notes.join(" · ")}</span>
          )}
          {consolidation.inconsistencies.length > 0 && (
            <span>
              Conferir antes de usar: {consolidation.inconsistencies.join(" · ")}
            </span>
          )}
          {consolidation.attention_points.length > 0 && (
            <span>
              Pontos de atenção: {consolidation.attention_points.join(" · ")}
            </span>
          )}
          {consolidation.missing_information.length > 0 && (
            <span>
              Faltou informar: {consolidation.missing_information.join(" · ")}
            </span>
          )}

          {consolidation.recommended_primary_goal && (
            <label className="switch-row">
              <div>
                <strong>
                  Atualizar objetivo principal para “
                  {consolidation.recommended_primary_goal}”
                </strong>
                <span>
                  Opcional. Só altere o cadastro depois de revisar a sugestão do Nexus.
                </span>
              </div>
              <input
                type="checkbox"
                checked={applySuggestedGoal}
                onChange={(event) =>
                  setApplySuggestedGoal(event.target.checked)
                }
              />
            </label>
          )}

          <div className="sale-action-buttons">
            <button
              className="physique-action-button secondary"
              type="button"
              disabled={finishing}
              onClick={() => setConsolidation(null)}
            >
              <RotateCcw size={16}/>
              Voltar e adicionar arquivos
            </button>

            <button
              className="physique-action-button"
              type="button"
              disabled={finishing}
              onClick={completeSession}
            >
              {finishing ? (
                <LoaderCircle className="spin" size={16}/>
              ) : (
                <CheckCircle2 size={16}/>
              )}
              {finishing
                ? "Salvando estado do atleta"
                : "Concluir e salvar no histórico"}
            </button>
          </div>
        </div>
      )}

      {message && <p className="physique-form-message">{message}</p>}

      {sessionHistory.length > 0 && (
        <div>
          <div className="physique-panel-title">
            <div>
              <span>Linha do tempo</span>
              <h3>Atualizações concluídas</h3>
            </div>
            <History size={18}/>
          </div>

          <div className="physique-import-history">
            {sessionHistory.map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <small>
                  {item.file_count} arquivo(s) ·{" "}
                  {item.completed_at
                    ? new Date(item.completed_at).toLocaleDateString("pt-BR")
                    : new Date(item.created_at).toLocaleDateString("pt-BR")}
                </small>
                {item.ai_summary && <small>{item.ai_summary}</small>}
                {textValue(item.ai_payload, "comparison_with_previous") && (
                  <small>
                    Comparação:{" "}
                    {textValue(item.ai_payload, "comparison_with_previous")}
                  </small>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
