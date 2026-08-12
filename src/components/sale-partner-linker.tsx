"use client";

import {
  Handshake,
  LoaderCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Partner = {
  id: string;
  name: string;
  city: string | null;
  partner_type: string | null;
};

export function SalePartnerLinker({
  saleIds,
  embedded = false,
  onLinked,
}: {
  saleIds: string[];
  embedded?: boolean;
  onLinked?: () => void;
}) {
  const router = useRouter();
  const [partners, setPartners] =
    useState<Partner[]>([]);
  const [partnerId, setPartnerId] =
    useState("");
  const [loadingOptions, setLoadingOptions] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const validSaleIds = useMemo(
    () => saleIds.filter(Boolean),
    [saleIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("partners")
        .select(
          "id,name,city,partner_type",
        )
        .eq("active", true)
        .neq("partner_type", "supplier")
        .order("name");

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
      } else {
        setPartners(
          (data ?? []).map((row) => ({
            id: String(row.id),
            name: String(row.name ?? "Parceiro"),
            city:
              typeof row.city === "string"
                ? row.city
                : null,
            partner_type:
              typeof row.partner_type === "string"
                ? row.partner_type
                : null,
          })),
        );
      }

      setLoadingOptions(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function linkPartner() {
    if (
      saving ||
      !partnerId ||
      validSaleIds.length === 0
    ) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "link_sales_to_partner_v1",
        {
          p_sale_ids: validSaleIds,
          p_partner_id: partnerId,
          p_update_quotes: true,
        },
      );

      if (error) throw error;

      const result =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};

      const count = Number(
        result.sales_updated ??
          validSaleIds.length,
      );

      setMessage(
        `${count} venda${
          count === 1 ? "" : "s"
        } vinculada${
          count === 1 ? "" : "s"
        } à parceria.`,
      );

      onLinked?.();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível vincular a parceria.",
      );
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div
      style={{
        display: "grid",
        gap: 9,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Handshake size={16} />
            Vincular parceria
          </strong>
          <small
            style={{
              display: "block",
              marginTop: 4,
              color: "var(--muted)",
            }}
          >
            {validSaleIds.length === 1
              ? "Corrige a atribuição da venda sem alterar valor, ticket ou estoque."
              : `${validSaleIds.length} vendas selecionadas. A alteração também acompanha o orçamento ligado.`}
          </small>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1fr) auto",
          gap: 8,
        }}
      >
        <select
          className="select"
          disabled={
            loadingOptions ||
            saving ||
            validSaleIds.length === 0
          }
          value={partnerId}
          onChange={(event) =>
            setPartnerId(event.target.value)
          }
        >
          <option value="">
            {loadingOptions
              ? "Carregando parceiros..."
              : "Selecione o parceiro"}
          </option>
          {partners.map((partner) => (
            <option
              key={partner.id}
              value={partner.id}
            >
              {partner.name}
              {partner.city
                ? ` · ${partner.city}`
                : ""}
            </option>
          ))}
        </select>

        <button
          className="button gold"
          type="button"
          disabled={
            saving ||
            !partnerId ||
            validSaleIds.length === 0
          }
          onClick={() => void linkPartner()}
        >
          {saving ? (
            <LoaderCircle
              className="spin"
              size={15}
            />
          ) : (
            <Handshake size={15} />
          )}
          {saving ? "Vinculando..." : "Vincular"}
        </button>
      </div>

      {message && (
        <p className="form-message">
          {message}
        </p>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <article className="panel">
      <div className="panel-body">
        {content}
      </div>
    </article>
  );
}

export function QuotePartnerLinker({
  quoteId,
}: {
  quoteId: string;
}) {
  const [saleId, setSaleId] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales_quotes")
        .select("sale_id")
        .eq("id", quoteId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
      } else {
        setSaleId(
          typeof data?.sale_id === "string"
            ? data.sale_id
            : null,
        );
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  if (loading) {
    return (
      <span className="form-help">
        Carregando vínculo da venda...
      </span>
    );
  }

  if (!saleId) {
    return (
      <span className="form-help">
        {message ??
          "Este orçamento ainda não possui venda vinculada. Quando for confirmado, a parceria poderá ser ajustada aqui mesmo."}
      </span>
    );
  }

  return (
    <SalePartnerLinker
      saleIds={[saleId]}
      embedded
    />
  );
}
