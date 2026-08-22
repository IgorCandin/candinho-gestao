"use client";

import {
  CheckCircle2,
  PackageCheck,
  Save,
  Truck,
  WalletCards,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SALE_DELIVERY_DRAFT_KEY = "candinho:sale:delivery-attribution:v1";

type PartnerOption = {
  id: string;
  name: string;
  partner_type: string | null;
};

type LocationOption = {
  id: string;
  code: string;
  name: string;
};

type DebtOverview = {
  id: string;
  name: string;
  remaining_amount: number;
};

function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function moneyForInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "";
}

function parseMoney(value: string) {
  const compact = value.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!compact) return Number.NaN;

  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;

  return Number(normalized);
}

function messageFromError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}


function operationFavicon(pathname: string) {
  const starts = (route: string) => pathname === route || pathname.startsWith(`${route}/`);

  if (starts("/bank")) return "/favicons/cb.png";
  if (starts("/fitness")) return "/favicons/cf.png";
  if (starts("/central") || starts("/nexus") || starts("/marketing")) {
    return "/favicons/cce.png";
  }
  if (starts("/suplementos") || starts("/parceiro")) return "/favicons/cs.png";

  const supplementRoots = [
    "/agenda",
    "/cadastros",
    "/clientes",
    "/estoque",
    "/fornecedores",
    "/leads",
    "/movimentacoes",
    "/orcamentos",
    "/painel-cs",
    "/parceiros",
    "/pedidos-fornecedor",
    "/pedidos-pendentes",
    "/pos-venda",
    "/produtos",
    "/trocas",
    "/vendas",
  ];

  if (supplementRoots.some(starts)) return "/favicons/cs.png";
  return "/favicons/cc.png";
}

function isUuid(value: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export function ErpPendingFixesBridge() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const isNewSale = /^\/(?:suplementos\/)?vendas\/nova\/?$/.test(pathname);
  const correctionMatch = pathname.match(
    /^\/(?:suplementos\/)?vendas\/([0-9a-f-]{36})\/corrigir\/?$/i,
  );
  const correctionSaleId = correctionMatch?.[1] ?? null;
  const debtId = pathname === "/bank/emprestimos" ? searchParams.get("detalhes") : null;

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [deliveryPanelOpen, setDeliveryPanelOpen] = useState(true);
  const [newSalePartnerId, setNewSalePartnerId] = useState("");
  const [newSaleDeliveryText, setNewSaleDeliveryText] = useState("");

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionLocationId, setCorrectionLocationId] = useState("");
  const [correctionPartnerId, setCorrectionPartnerId] = useState("");
  const [correctionDeliveryText, setCorrectionDeliveryText] = useState("");
  const [correctionSaving, setCorrectionSaving] = useState(false);

  const [debt, setDebt] = useState<DebtOverview | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceValue, setBalanceValue] = useState("");
  const [balanceDate, setBalanceDate] = useState(brazilToday());
  const [balanceNotes, setBalanceNotes] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);

  const [feedback, setFeedback] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  // Mantém o ícone da aba preso à operação mesmo quando o Next altera o <head>.
  useEffect(() => {
    const href = `${operationFavicon(pathname)}?v=45.39.0`;

    const apply = () => {
      let stable = document.getElementById("candinho-route-favicon") as HTMLLinkElement | null;
      if (!stable) {
        stable = document.createElement("link");
        stable.id = "candinho-route-favicon";
        stable.rel = "icon";
        stable.type = "image/png";
        document.head.appendChild(stable);
      }

      const icons = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          'link[rel="icon"], link[rel="shortcut icon"]',
        ),
      );

      if (!icons.includes(stable)) icons.push(stable);

      icons.forEach((icon) => {
        if (icon.getAttribute("href") !== href) icon.setAttribute("href", href);
      });
    };

    apply();
    const delayed = window.setTimeout(apply, 80);
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "rel"],
    });

    return () => {
      window.clearTimeout(delayed);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // O campo da Nova Venda é propositalmente efêmero: só vale para a venda atual.
  useEffect(() => {
    if (!isNewSale) return;

    window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
    setNewSalePartnerId("");
    setNewSaleDeliveryText("");
    setDeliveryPanelOpen(true);

    return () => {
      // Na confirmação o wrapper do Supabase remove a chave primeiro.
      // Se o usuário sair sem confirmar (ex.: salvar só orçamento), limpamos aqui.
      window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
    };
  }, [isNewSale]);

  useEffect(() => {
    if (!isNewSale) return;

    const partnerId = newSalePartnerId.trim();
    const text = newSaleDeliveryText.trim();

    if (!partnerId && !text) {
      window.sessionStorage.removeItem(SALE_DELIVERY_DRAFT_KEY);
      return;
    }

    window.sessionStorage.setItem(
      SALE_DELIVERY_DRAFT_KEY,
      JSON.stringify({
        partnerId: partnerId || undefined,
        text: partnerId ? undefined : text || undefined,
        savedAt: Date.now(),
      }),
    );
  }, [isNewSale, newSalePartnerId, newSaleDeliveryText]);

  useEffect(() => {
    if (!isNewSale && !correctionSaleId) return;

    let cancelled = false;
    setLoadingOptions(true);

    void (async () => {
      const partnerRequest = supabase
        .from("sale_partner_options")
        .select("id,name,partner_type")
        .order("name");

      const locationRequest = correctionSaleId
        ? supabase
            .from("locations")
            .select("id,code,name")
            .eq("active", true)
            .eq("tracks_inventory", true)
            .order("code")
        : Promise.resolve({ data: [], error: null });

      const [partnerResult, locationResult] = await Promise.all([
        partnerRequest,
        locationRequest,
      ]);

      if (cancelled) return;

      if (partnerResult.error) {
        setFeedback({
          tone: "error",
          text: messageFromError(
            partnerResult.error,
            "Não foi possível carregar os parceiros.",
          ),
        });
      } else {
        setPartners(
          (partnerResult.data ?? []).map((row) => ({
            id: String(row.id),
            name: String(row.name ?? "Parceiro"),
            partner_type: row.partner_type == null ? null : String(row.partner_type),
          })),
        );
      }

      if (locationResult.error) {
        setFeedback({
          tone: "error",
          text: messageFromError(
            locationResult.error,
            "Não foi possível carregar os estoques.",
          ),
        });
      } else {
        setLocations(
          (locationResult.data ?? []).map((row) => ({
            id: String(row.id),
            code: String(row.code ?? ""),
            name: String(row.name ?? "Estoque"),
          })),
        );
      }

      setLoadingOptions(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [correctionSaleId, isNewSale, supabase]);

  useEffect(() => {
    if (!correctionSaleId) {
      setCorrectionOpen(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("location_id,delivered_by_partner_id,delivered_by_text")
        .eq("id", correctionSaleId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setFeedback({
          tone: "error",
          text: messageFromError(error, "Não foi possível carregar a logística da venda."),
        });
        return;
      }

      setCorrectionLocationId(String(data.location_id ?? ""));
      setCorrectionPartnerId(String(data.delivered_by_partner_id ?? ""));
      setCorrectionDeliveryText(String(data.delivered_by_text ?? ""));
    })();

    return () => {
      cancelled = true;
    };
  }, [correctionSaleId, supabase]);

  useEffect(() => {
    if (!isUuid(debtId)) {
      setDebt(null);
      setBalanceOpen(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("bank_debts_overview")
        .select("id,name,remaining_amount")
        .eq("id", debtId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setDebt(null);
        return;
      }

      const nextDebt: DebtOverview = {
        id: String(data.id),
        name: String(data.name ?? "Pendência"),
        remaining_amount: Number(data.remaining_amount ?? 0),
      };

      setDebt(nextDebt);
      setBalanceValue(moneyForInput(nextDebt.remaining_amount));
      setBalanceDate(brazilToday());
      setBalanceNotes("");
    })();

    return () => {
      cancelled = true;
    };
  }, [debtId, supabase]);

  // Sem mexer na regra financeira existente: "skipped" continua sem cobrança,
  // mas a interface passa a usar a linguagem operacional pedida: Adiar / Adiada.
  useEffect(() => {
    if (pathname !== "/bank/mensalidades") return;

    const relabel = () => {
      document.querySelectorAll<HTMLElement>(".bank-weekly-heading span").forEach((node) => {
        if (node.textContent?.trim() === "Marque cada semana como paga ou não realizada.") {
          node.textContent = "Marque cada semana como paga ou adiada.";
        }
      });

      document.querySelectorAll<HTMLElement>(".bank-weekly-result .badge").forEach((node) => {
        if (node.textContent?.trim() === "Não aconteceu") {
          node.textContent = "Adiada";
        }
      });

      document.querySelectorAll<HTMLButtonElement>(".bank-weekly-actions button").forEach((button) => {
        if (button.textContent?.trim() === "Não aconteceu") {
          button.textContent = "Adiar";
          button.title = "Sem cobrança nesta semana; a próxima semana continua normalmente.";
        }
      });
    };

    relabel();
    const observer = new MutationObserver(relabel);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  async function saveCorrection() {
    if (!correctionSaleId || !correctionLocationId) return;

    setCorrectionSaving(true);
    setFeedback(null);

    const { error } = await supabase.rpc("sale_update_logistics_v1", {
      p_sale_id: correctionSaleId,
      p_location_id: correctionLocationId,
      p_delivered_by_partner_id: correctionPartnerId || null,
      p_delivered_by_text: correctionPartnerId
        ? null
        : correctionDeliveryText.trim() || null,
      p_reason: "Correção manual na tela Corrigir venda",
    });

    setCorrectionSaving(false);

    if (error) {
      setFeedback({
        tone: "error",
        text: messageFromError(error, "Não foi possível corrigir a logística da venda."),
      });
      return;
    }

    setCorrectionOpen(false);
    setFeedback({ tone: "ok", text: "Estoque / entrega da venda corrigidos." });
    router.refresh();
  }

  async function saveCurrentBalance() {
    if (!debt) return;

    const amount = parseMoney(balanceValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setFeedback({ tone: "error", text: "Informe um saldo atual válido." });
      return;
    }

    setBalanceSaving(true);
    setFeedback(null);

    const { error } = await supabase.rpc("bank_set_debt_current_balance", {
      p_debt_id: debt.id,
      p_current_balance: amount,
      p_balance_on: balanceDate || brazilToday(),
      p_notes: balanceNotes.trim() || null,
    });

    setBalanceSaving(false);

    if (error) {
      setFeedback({
        tone: "error",
        text: messageFromError(error, "Não foi possível atualizar o saldo do dia."),
      });
      return;
    }

    setDebt({ ...debt, remaining_amount: amount });
    setBalanceOpen(false);
    setFeedback({ tone: "ok", text: "Saldo atual atualizado sem apagar o histórico pago." });
    router.refresh();
  }

  return (
    <>
      {feedback && (
        <div className={`erp-fix-toast ${feedback.tone === "error" ? "is-error" : "is-ok"}`}>
          {feedback.tone === "ok" && <CheckCircle2 size={17} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {isNewSale && (
        <div className={`erp-fix-floating-card ${deliveryPanelOpen ? "is-open" : "is-collapsed"}`}>
          {deliveryPanelOpen ? (
            <>
              <div className="erp-fix-card-head">
                <div>
                  <strong>
                    <Truck size={17} /> Entregue por
                  </strong>
                  <span>Opcional · não altera o estoque de origem.</span>
                </div>
                <button
                  className="erp-fix-icon-button"
                  type="button"
                  aria-label="Recolher campo Entregue por"
                  onClick={() => setDeliveryPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <label className="erp-fix-field">
                <span>Parceiro / ponto</span>
                <select
                  value={newSalePartnerId}
                  disabled={loadingOptions}
                  onChange={(event) => {
                    setNewSalePartnerId(event.target.value);
                    if (event.target.value) setNewSaleDeliveryText("");
                  }}
                >
                  <option value="">Não informar parceiro</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                      {partner.partner_type ? ` · ${partner.partner_type}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="erp-fix-field">
                <span>Ou local / pessoa livre</span>
                <input
                  value={newSaleDeliveryText}
                  disabled={Boolean(newSalePartnerId)}
                  placeholder="Ex.: Posto Marechal / Loja da Graça"
                  onChange={(event) => {
                    setNewSaleDeliveryText(event.target.value);
                    if (event.target.value) setNewSalePartnerId("");
                  }}
                />
              </label>

              <small className="erp-fix-help">
                Será gravado automaticamente quando você confirmar a venda.
              </small>
            </>
          ) : (
            <button
              className="erp-fix-collapsed-button"
              type="button"
              onClick={() => setDeliveryPanelOpen(true)}
            >
              <Truck size={17} />
              Entregue por
            </button>
          )}
        </div>
      )}

      {correctionSaleId && (
        <button
          className="erp-fix-context-button erp-fix-sale-button"
          type="button"
          onClick={() => setCorrectionOpen(true)}
        >
          <PackageCheck size={17} />
          Corrigir estoque / entrega
        </button>
      )}

      {debt && (
        <button
          className="erp-fix-context-button erp-fix-bank-button"
          type="button"
          onClick={() => {
            setBalanceValue(moneyForInput(debt.remaining_amount));
            setBalanceOpen(true);
          }}
        >
          <WalletCards size={17} />
          Atualizar saldo do dia
        </button>
      )}

      {correctionOpen && correctionSaleId && (
        <div className="erp-fix-modal-backdrop" role="presentation" onMouseDown={() => setCorrectionOpen(false)}>
          <section
            className="erp-fix-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="erp-correction-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="erp-fix-modal-head">
              <div>
                <strong id="erp-correction-title">Corrigir estoque / entrega</strong>
                <span>A origem física e quem entregou são dados independentes.</span>
              </div>
              <button className="erp-fix-icon-button" type="button" onClick={() => setCorrectionOpen(false)}>
                <X size={17} />
              </button>
            </div>

            <label className="erp-fix-field">
              <span>Estoque de origem correto</span>
              <select
                value={correctionLocationId}
                onChange={(event) => setCorrectionLocationId(event.target.value)}
              >
                <option value="">Selecione</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
              </select>
              <small>
                Se a baixa já aconteceu, o ERP estorna o estoque anterior e baixa no novo em uma única transação.
              </small>
            </label>

            <label className="erp-fix-field">
              <span>Entregue por parceiro / ponto</span>
              <select
                value={correctionPartnerId}
                onChange={(event) => {
                  setCorrectionPartnerId(event.target.value);
                  if (event.target.value) setCorrectionDeliveryText("");
                }}
              >
                <option value="">Não informar parceiro</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="erp-fix-field">
              <span>Ou local / pessoa livre</span>
              <input
                value={correctionDeliveryText}
                disabled={Boolean(correctionPartnerId)}
                placeholder="Ex.: Ingrid / Posto Marechal"
                onChange={(event) => {
                  setCorrectionDeliveryText(event.target.value);
                  if (event.target.value) setCorrectionPartnerId("");
                }}
              />
            </label>

            <div className="erp-fix-modal-actions">
              <button className="button ghost" type="button" onClick={() => setCorrectionOpen(false)}>
                Cancelar
              </button>
              <button
                className="button gold"
                type="button"
                disabled={correctionSaving || !correctionLocationId}
                onClick={() => void saveCorrection()}
              >
                <Save size={16} />
                {correctionSaving ? "Salvando..." : "Salvar correção"}
              </button>
            </div>
          </section>
        </div>
      )}

      {balanceOpen && debt && (
        <div className="erp-fix-modal-backdrop" role="presentation" onMouseDown={() => setBalanceOpen(false)}>
          <section
            className="erp-fix-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="erp-balance-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="erp-fix-modal-head">
              <div>
                <strong id="erp-balance-title">Atualizar saldo do dia</strong>
                <span>{debt.name}</span>
              </div>
              <button className="erp-fix-icon-button" type="button" onClick={() => setBalanceOpen(false)}>
                <X size={17} />
              </button>
            </div>

            <label className="erp-fix-field">
              <span>Quanto ainda falta pagar hoje?</span>
              <input
                inputMode="decimal"
                value={balanceValue}
                placeholder="0,00"
                onChange={(event) => setBalanceValue(event.target.value)}
              />
              <small>
                Você informa só o saldo atual. Os pagamentos já registrados continuam preservados no histórico.
              </small>
            </label>

            <label className="erp-fix-field">
              <span>Data do saldo</span>
              <input type="date" value={balanceDate} onChange={(event) => setBalanceDate(event.target.value)} />
            </label>

            <label className="erp-fix-field">
              <span>Observação (opcional)</span>
              <input
                value={balanceNotes}
                placeholder="Ex.: saldo informado pela loja"
                onChange={(event) => setBalanceNotes(event.target.value)}
              />
            </label>

            <div className="erp-fix-modal-actions">
              <button className="button ghost" type="button" onClick={() => setBalanceOpen(false)}>
                Cancelar
              </button>
              <button
                className="button gold"
                type="button"
                disabled={balanceSaving}
                onClick={() => void saveCurrentBalance()}
              >
                <Save size={16} />
                {balanceSaving ? "Atualizando..." : "Atualizar saldo"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
