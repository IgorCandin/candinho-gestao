"use client";

import { FilePlus2, LoaderCircle, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export function MarketingIdeaUploader({ openByDefault = false }: { openByDefault?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(openByDefault);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file && !title.trim() && !idea.trim()) {
      setMessage("Escreva uma ideia ou escolha um PDF.");
      return;
    }
    if (file && file.type !== "application/pdf") {
      setMessage("Nesta primeira automação do Marketing, o processamento inteligente aceita PDF.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessão expirada.");

      if (!file) {
        const fallbackTitle = title.trim() || idea.trim().slice(0, 70) || "Nova ideia";
        const inserted = await supabase
          .from("marketing_projects")
          .insert({
            title: fallbackTitle,
            summary: idea.trim() || null,
            script_text: idea.trim() || null,
            processing_status: "ready",
            status: "idea",
          })
          .select("id")
          .single();

        if (inserted.error || !inserted.data) throw inserted.error ?? new Error("Não foi possível criar a ideia.");
        router.push(`/marketing/ideias/${inserted.data.id}`);
        return;
      }

      const path = `marketing/${userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const upload = await supabase.storage.from("central-media").upload(path, file, {
        upsert: false,
        contentType: "application/pdf",
      });
      if (upload.error) throw upload.error;

      const asset = await supabase
        .from("central_media_assets")
        .insert({
          operation_scope: "marketing",
          storage_path: path,
          original_filename: file.name,
          mime_type: "application/pdf",
          source: "marketing_upload",
          search_text: [file.name, title.trim(), idea.trim()].filter(Boolean).join(" "),
        })
        .select("id")
        .single();

      if (asset.error || !asset.data) {
        await supabase.storage.from("central-media").remove([path]);
        throw asset.error ?? new Error("Não foi possível registrar o PDF.");
      }

      const fallbackTitle = title.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      const project = await supabase
        .from("marketing_projects")
        .insert({
          media_asset_id: asset.data.id,
          title: fallbackTitle,
          summary: idea.trim() || null,
          processing_status: "pending",
          status: "idea",
        })
        .select("id")
        .single();

      if (project.error || !project.data) throw project.error ?? new Error("Não foi possível criar a página do roteiro.");

      setMessage("PDF enviado. O Nexus está interpretando o material e montando a página do roteiro...");

      const processing = await supabase.functions.invoke("marketing-pdf-ingest", {
        body: { asset_id: asset.data.id },
      });

      if (processing.error || processing.data?.error) {
        setMessage("A página foi criada, mas a interpretação automática ficou pendente. Ela poderá ser processada novamente na Caixa de ideias.");
        router.push(`/marketing/ideias/${project.data.id}`);
        return;
      }

      const projectId = processing.data?.project_id || project.data.id;
      router.push(`/marketing/ideias/${projectId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a ideia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <div>
          <h2>Entrada do Marketing</h2>
          <p>Escreva uma ideia ou envie um PDF. O material fica no Marketing e ganha uma página própria.</p>
        </div>
        <button className="button gold" type="button" onClick={() => setOpen((value) => !value)}>
          <FilePlus2 size={16}/>{open ? "Fechar" : "Nova ideia / PDF"}
        </button>
      </div>

      {open && (
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          <label className="field">
            <span>Título opcional</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Campanha Creatina Candinho"/>
          </label>

          <label className="field">
            <span>Ideia / contexto</span>
            <textarea className="textarea" rows={4} value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Anote sua ideia. Se houver PDF, este texto vira contexto adicional."/>
          </label>

          <label className="field">
            <span>PDF opcional</span>
            <input ref={fileRef} className="input central-file-input" type="file" accept="application/pdf"/>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: 10 }}>
              <Sparkles size={14}/>PDFs são interpretados automaticamente pelo Nexus.
            </span>
            <button className="button gold" type="button" onClick={submit} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16}/> : <UploadCloud size={16}/>}
              {loading ? "Processando..." : "Registrar no Marketing"}
            </button>
          </div>

          {message && <p className="central-action-message">{message}</p>}
        </div>
      )}
    </article>
  );
}
