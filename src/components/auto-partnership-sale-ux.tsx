"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type NetworkResponse = {
  network?: {
    autoPartner?: {
      partner_id: string;
      partner_name: string;
      relation_type: string;
      relation_label: string | null;
    } | null;
  };
};

function partnerRelationLabel(type: string, custom?: string | null) {
  if (custom) return custom;

  const labels: Record<string, string> = {
    student_of_partner: "Aluno(a)",
    client_of_partner: "Cliente da parceria",
    referred_by_partner: "Indicado(a)",
    team_of_partner: "Equipe / funcionário(a)",
    family_of_partner: "Familiar",
    other: "Vínculo cadastrado",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

export function AutoPartnershipSaleUX({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || pathname !== "/vendas/nova") return;

    let disposed = false;
    let currentCustomer = "";
    let controller: AbortController | null = null;

    const removeHint = () => {
      document.querySelector(".nexus-auto-partner-hint")?.remove();
    };

    const findPartnershipPanel = () =>
      Array.from(document.querySelectorAll("article.panel")).find(
        (panel) =>
          panel.querySelector("h2")?.textContent?.trim().toLocaleLowerCase("pt-BR") ===
          "parceria",
      ) as HTMLElement | undefined;

    const restorePanel = () => {
      const panel = findPartnershipPanel();
      if (panel) {
        panel.style.removeProperty("display");
        panel.removeAttribute("data-nexus-auto-partner-hidden");
      }
      removeHint();
    };

    const renderHint = async () => {
      if (disposed) return;

      // Ao revisar orçamento já salvo, preservamos a interface manual para não
      // alterar um parceiro que já fazia parte da proposta original.
      if (document.querySelector(".budget-conversion-banner")) {
        restorePanel();
        return;
      }

      const root = document.querySelector(
        '.customer-combobox[data-customer-combobox="true"]',
      ) as HTMLElement | null;
      const panel = findPartnershipPanel();
      if (!root || !panel) return;

      panel.style.display = "none";
      panel.setAttribute("data-nexus-auto-partner-hidden", "true");

      const customerId = root.dataset.customerId ?? "";
      if (customerId === currentCustomer && document.querySelector(".nexus-auto-partner-hint")) {
        return;
      }

      currentCustomer = customerId;
      controller?.abort();
      controller = new AbortController();
      removeHint();

      const hint = document.createElement("div");
      hint.className = "nexus-auto-partner-hint";
      root.insertAdjacentElement("afterend", hint);

      const setHint = (title: string, detail: string, href?: string) => {
        hint.replaceChildren();

        const strong = document.createElement("strong");
        strong.textContent = title;
        hint.appendChild(strong);

        const span = document.createElement("span");
        span.textContent = detail;

        if (href) {
          span.appendChild(document.createTextNode(" "));
          const link = document.createElement("a");
          link.href = href;
          link.textContent = "Abrir cliente";
          span.appendChild(link);
        }

        hint.appendChild(span);
      };

      if (!customerId) {
        setHint(
          "Parceria automática",
          "Selecione o cliente. A parceria vem dos vínculos do CRM, sem checkbox extra na venda.",
        );
        return;
      }

      setHint(
        "Parceria automática",
        "Consultando os vínculos do cliente...",
      );

      try {
        const response = await fetch(`/api/customers/${customerId}/relationships?compact=1`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("network");
        const payload = (await response.json()) as NetworkResponse;
        if (disposed || currentCustomer !== customerId) return;

        const auto = payload.network?.autoPartner;
        if (auto) {
          hint.classList.add("active");
          setHint(
            `Parceria automática: ${auto.partner_name}`,
            `${partnerRelationLabel(
              auto.relation_type,
              auto.relation_label,
            )} · a venda será contabilizada sem marcar nada aqui.`,
          );
        } else {
          setHint(
            "Sem parceria automática",
            "Se esta pessoa deve contar para algum parceiro, cadastre o vínculo na ficha do cliente.",
            `/clientes/${customerId}`,
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHint(
          "Parceria automática",
          "Não foi possível conferir o vínculo agora. O banco ainda preserva qualquer parceiro explicitamente informado.",
        );
      }
    };

    const observer = new MutationObserver(() => {
      void renderHint();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-customer-id"],
    });

    const timer = window.setTimeout(() => void renderHint(), 80);

    return () => {
      disposed = true;
      controller?.abort();
      observer.disconnect();
      window.clearTimeout(timer);
      restorePanel();
    };
  }, [enabled, pathname]);

  return null;
}
