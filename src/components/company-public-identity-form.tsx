"use client";

import { Building2, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompanyPublicIdentity } from "@/lib/company-profile-v45";
import styles from "./company-profile-v45.module.css";

export function CompanyPublicIdentityForm({
  initial,
}: {
  initial: CompanyPublicIdentity;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("central_company_public_identity")
        .update({
          trade_name: draft.trade_name.trim(),
          cnpj: draft.cnpj?.trim() || null,
          opened_on: draft.opened_on || null,
          city: draft.city?.trim() || null,
          state: draft.state?.trim().toUpperCase().slice(0, 2) || null,
          legal_status: draft.legal_status?.trim() || null,
          company_size: draft.company_size?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;

      setMessage("Dados legais públicos atualizados.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados legais.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.adminBox} onSubmit={submit}>
      <div className="company-profile-ai-guard">
        <Building2 size={18} />
        <span>
          Estes dados são públicos e estruturados. O CNPJ fica fora dos textos
          livres do Nexus e aparece de forma controlada na apresentação.
        </span>
      </div>

      <div className={styles.formGrid}>
        <label className="field">
          <span>Nome público</span>
          <input
            className="input"
            value={draft.trade_name}
            onChange={(event) =>
              setDraft({ ...draft, trade_name: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>CNPJ</span>
          <input
            className="input"
            value={draft.cnpj ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, cnpj: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Data de abertura</span>
          <input
            className="input"
            type="date"
            value={draft.opened_on ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, opened_on: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Porte</span>
          <input
            className="input"
            value={draft.company_size ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, company_size: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Cidade</span>
          <input
            className="input"
            value={draft.city ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, city: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>UF</span>
          <input
            className="input"
            maxLength={2}
            value={draft.state ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, state: event.target.value })
            }
          />
        </label>

        <label className={`field ${styles.wide}`}>
          <span>Situação pública</span>
          <input
            className="input"
            value={draft.legal_status ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, legal_status: event.target.value })
            }
          />
        </label>
      </div>

      <button className="button gold" type="submit" disabled={saving}>
        {saving ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Save size={16} />
        )}
        {saving ? "Salvando" : "Salvar dados públicos"}
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </form>
  );
}
