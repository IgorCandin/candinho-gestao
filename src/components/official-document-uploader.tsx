"use client";

import {
  FilePlus2,
  LoaderCircle,
  Route,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export function OfficialDocumentUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState("route");
  const [documentDate, setDocumentDate] =
    useState("");
  const [expiresOn, setExpiresOn] =
    useState("");
  const [routeRequired, setRouteRequired] =
    useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      setMessage("Escolha um PDF.");
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage(
        "Documentos oficiais devem ser enviados em PDF.",
      );
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMessage(
        "O PDF precisa ter no máximo 20 MB.",
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    let uploadedPath: string | null = null;

    try {
      const supabase = createClient();
      const { data: auth } =
        await supabase.auth.getUser();

      const userId = auth.user?.id;

      if (!userId) {
        throw new Error("Sessão expirada.");
      }

      uploadedPath = `official/${userId}/${crypto.randomUUID()}-${safeFilename(
        file.name,
      )}`;

      const storageResult =
        await supabase.storage
          .from("central-company-files")
          .upload(uploadedPath, file, {
            upsert: false,
            contentType: "application/pdf",
          });

      if (storageResult.error) {
        throw storageResult.error;
      }

      const finalTitle =
        title.trim() ||
        file.name.replace(/\.pdf$/i, "");

      const { error } = await supabase
        .from("central_official_documents")
        .insert({
          title: finalTitle,
          category,
          original_filename: file.name,
          mime_type: "application/pdf",
          storage_path: uploadedPath,
          document_date:
            documentDate || null,
          expires_on: expiresOn || null,
          route_required: routeRequired,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      setTitle("");
      setDocumentDate("");
      setExpiresOn("");
      setNotes("");
      setMessage(
        "Documento salvo no cofre da Central.",
      );

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      if (uploadedPath) {
        try {
          const supabase = createClient();
          await supabase.storage
            .from("central-company-files")
            .remove([uploadedPath]);
        } catch {
          // Limpeza de melhor esforço.
        }
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o documento.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="official-document-upload-form">
      <label>
        <span>Nome do documento</span>
        <input
          className="input"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="Ex.: Documento do veículo"
        />
      </label>

      <label>
        <span>Categoria</span>
        <select
          className="select"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
        >
          <option value="route">
            Rota / viagem
          </option>
          <option value="company">
            Empresa
          </option>
          <option value="tax">Fiscal</option>
          <option value="sanitary">
            Sanitário / regulatório
          </option>
          <option value="vehicle">
            Veículo
          </option>
          <option value="personal">
            Documento pessoal
          </option>
          <option value="supplier">
            Fornecedor
          </option>
          <option value="other">Outro</option>
        </select>
      </label>

      <label>
        <span>Data do documento</span>
        <input
          className="input"
          type="date"
          value={documentDate}
          onChange={(event) =>
            setDocumentDate(event.target.value)
          }
        />
      </label>

      <label>
        <span>Validade, se houver</span>
        <input
          className="input"
          type="date"
          value={expiresOn}
          onChange={(event) =>
            setExpiresOn(event.target.value)
          }
        />
      </label>

      <label className="official-document-checkbox">
        <input
          type="checkbox"
          checked={routeRequired}
          onChange={(event) =>
            setRouteRequired(event.target.checked)
          }
        />
        <span>
          <Route size={13} /> Preciso levar em
          rotas
        </span>
      </label>

      <label>
        <span>Observação</span>
        <textarea
          className="input"
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder="Ex.: manter atualizado antes de viagens."
        />
      </label>

      <label>
        <span>Arquivo PDF</span>
        <input
          ref={fileRef}
          className="input central-file-input"
          type="file"
          accept="application/pdf,.pdf"
          disabled={loading}
        />
      </label>

      <button
        className="button gold"
        type="button"
        onClick={upload}
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle
            className="spin"
            size={16}
          />
        ) : (
          <FilePlus2 size={16} />
        )}
        {loading
          ? "Salvando..."
          : "Adicionar documento"}
      </button>

      {message && (
        <p className="company-profile-update-message">
          {message}
        </p>
      )}
    </div>
  );
}
