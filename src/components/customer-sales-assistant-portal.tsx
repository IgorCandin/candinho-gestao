"use client";

import Link from "next/link";
import { Bot, LoaderCircle, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { SalesOpportunityCard } from "@/components/sales-opportunity-card";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

export function CustomerSalesAssistantPortal({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const customerId = useMemo(() => {
    const match = pathname?.match(
      /^\/clientes\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i,
    );
    return match?.[1] ?? null;
  }, [pathname]);

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<SalesOpportunity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTarget(null);
    setRows([]);

    if (!enabled || !customerId) return;

    const anchor = document.createElement("div");
    anchor.className = "customer-sales-assistant-anchor-v45";

    const network = document.querySelector(".customer-relationships-portal-anchor");
    const profile = document.querySelector(".customer-profile-grid");

    if (network?.parentElement) {
      network.parentElement.insertBefore(anchor, network.nextSibling);
    } else if (profile?.parentElement) {
      profile.parentElement.insertBefore(anchor, profile.nextSibling);
    } else {
      document.querySelector("main")?.appendChild(anchor);
    }

    setTarget(anchor);
    return () => anchor.remove();
  }, [customerId, enabled]);

  useEffect(() => {
    if (!customerId || !target) return;

    setLoading(true);
    fetch(`/api/customers/${customerId}/sales-opportunities`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          opportunities?: SalesOpportunity[];
        };
        setRows(response.ok ? payload.opportunities ?? [] : []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [customerId, target]);

  if (!enabled || !customerId || !target) return null;

  const content = (
    <section className="customer-sales-assistant-v45">
      <header>
        <div>
          <span className="eyebrow">Nexus Comercial</span>
          <h2><Bot size={18} /> O que vender para este cliente?</h2>
          <p>Histórico + janela de recompra + produtos já usados + estoque atual.</p>
        </div>
        <Link className="button ghost compact-button" href="/clientes/radar">
          Ver Radar
        </Link>
      </header>

      {loading ? (
        <div className="empty compact">
          <LoaderCircle className="spin" size={20} /> Analisando histórico...
        </div>
      ) : rows.length ? (
        <div className="customer-sales-assistant-list-v45">
          {rows.slice(0, 3).map((row, index) => (
            <SalesOpportunityCard
              key={`${row.opportunity_group}-${row.recommended_product_id}-${index}`}
              opportunity={row}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="customer-sales-assistant-clear-v45">
          <Sparkles size={16} />
          <span>
            <strong>Nenhuma oferta óbvia agora.</strong>
            Melhor preservar o relacionamento do que empurrar um produto aleatório.
          </span>
        </div>
      )}
    </section>
  );

  return createPortal(content, target);
}
