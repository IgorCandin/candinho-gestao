"use client";

import {
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

async function edgeErrorMessage(
  error: unknown,
) {
  const fallback =
    error instanceof Error
      ? error.message
      : "Não foi possível excluir a mídia.";

  const context =
    error &&
    typeof error === "object" &&
    "context" in error
      ? (
          error as {
            context?: unknown;
          }
        ).context
      : null;

  if (context instanceof Response) {
    try {
      const payload =
        await context
          .clone()
          .json();

      if (
        payload &&
        typeof payload.error ===
          "string"
      ) {
        return payload.error;
      }
    } catch {
      // Mantém a mensagem padrão.
    }
  }

  return fallback;
}

export function CentralMediaDeleteButton({
  assetId,
  filename,
}: {
  assetId: string;
  filename: string;
}) {
  const router = useRouter();
  const [loading, setLoading] =
    useState(false);
  const [feedback, setFeedback] =
    useState<string | null>(
      null,
    );

  async function remove() {
    const confirmed =
      window.confirm(
        `Excluir definitivamente "${filename}" da biblioteca?\n\nO arquivo armazenado também será removido. Projetos de Marketing que usavam esta mídia preservam o projeto, mas perdem o vínculo com o arquivo.`,
      );

    if (!confirmed) return;

    setLoading(true);
    setFeedback(null);

    try {
      const {
        data,
        error,
      } =
        await createClient().functions.invoke(
          "central-media-delete",
          {
            body: {
              asset_id: assetId,
            },
          },
        );

      if (error) {
        throw new Error(
          await edgeErrorMessage(
            error,
          ),
        );
      }

      if (data?.error) {
        throw new Error(
          String(data.error),
        );
      }

      router.push(
        "/central/midia",
      );
      router.refresh();
    } catch (error) {
      setFeedback(
        await edgeErrorMessage(
          error,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <button
        className="button ghost"
        type="button"
        disabled={loading}
        onClick={remove}
      >
        {loading ? (
          <LoaderCircle
            className="spin"
            size={15}
          />
        ) : (
          <Trash2 size={15} />
        )}

        {loading
          ? "Excluindo"
          : "Excluir mídia"}
      </button>

      {feedback && (
        <small className="form-help">
          {feedback}
        </small>
      )}
    </div>
  );
}
