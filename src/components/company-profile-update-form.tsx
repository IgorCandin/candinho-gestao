"use client";

import {
  FileUp,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Result = {
  summary?: string;
  updated_sections?: number;
  ignored_sensitive?: string[];
  error?: string;
};

export function CompanyProfileUpdateForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(
    null,
  );

  async function updateProfile() {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      setResult({
        error: "Escolha um arquivo primeiro.",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setResult({
        error:
          "O arquivo precisa ter no máximo 20 MB.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = new FormData();
      data.set("file", file);

      const response = await fetch(
        "/api/central/apresentacao/atualizar",
        {
          method: "POST",
          body: data,
        },
      );

      const payload =
        (await response.json()) as Result;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Não foi possível atualizar a apresentação.",
        );
      }

      setResult(payload);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      setResult({
        error:
          error instanceof Error
            ? error.message
            : "Falha ao consultar o Nexus.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="company-profile-update-form">
      <div className="company-profile-ai-guard">
        <ShieldCheck size={18} />
        <span>
          O Nexus recebe o arquivo em área privada e
          só pode atualizar a apresentação com
          informações institucionais seguras.
          CPF/CNPJ, endereço completo, telefone,
          e-mail, dados bancários, credenciais,
          faturamento, custos, margem e outros
          dados internos devem ser ignorados.
        </span>
      </div>

      <label>
        <span>
          PDF, TXT, Markdown, JPEG, PNG ou WebP
        </span>
        <input
          ref={fileRef}
          className="input central-file-input"
          type="file"
          accept=".pdf,.txt,.md,image/jpeg,image/png,image/webp"
          disabled={loading}
        />
      </label>

      <button
        className="button gold"
        type="button"
        onClick={updateProfile}
        disabled={loading}
      >
        {loading ? (
          <LoaderCircle
            className="spin"
            size={16}
          />
        ) : (
          <Sparkles size={16} />
        )}
        {loading
          ? "Nexus analisando..."
          : "Atualizar informações"}
      </button>

      {result?.error && (
        <p className="company-profile-update-message error">
          {result.error}
        </p>
      )}

      {!result?.error && result && (
        <p className="company-profile-update-message">
          <FileUp size={13} />{" "}
          {result.summary ??
            "Informações atualizadas."}
          {" · "}
          {result.updated_sections ?? 0} seção(ões)
          atualizada(s).
        </p>
      )}
    </div>
  );
}
