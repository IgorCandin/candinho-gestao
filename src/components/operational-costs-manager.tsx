"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  LoaderCircle,
  PackagePlus,
  Plus,
  ReceiptText,
  Save,
  Settings2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import styles from "./operational-costs-manager.module.css";

type OperationScope = "shared" | "supplements" | "fitness";
type BusinessOperation = "supplements" | "fitness";
type Tab = "overview" | "purchase" | "profiles" | "products" | "results";
type Supply = {
  id: string;
  operation_scope: OperationScope;
  name: string;
  sku: string | null;
  unit_name: string;
  quantity_on_hand: number;
  average_unit_cost: number;
  min_quantity: number;
  active: boolean;
  stock_value: number;
  stock_status: "healthy" | "low" | "negative" | "inactive";
  consumed_this_month: number;
  last_received_on: string | null;
};
type ProfileItem = {
  id?: string;
  supply_id: string;
  supply_name?: string;
  usage_basis: "per_sale" | "per_line" | "per_unit";
  quantity: number;
  unit_cost?: number;
};
type Profile = {
  id: string;
  operation_scope: BusinessOperation;
  channel: "retail" | "delivery" | "partner" | "consignment";
  name: string;
  is_default: boolean;
  active: boolean;
  notes: string | null;
  items: ProfileItem[];
  estimated_one_item_cost: number;
};
type Requirement = {
  id: string;
  operation_scope: BusinessOperation;
  product_id: string | null;
  fitness_product_id: string | null;
  product_name: string;
  supply_id: string;
  supply_name: string;
  unit_name: string;
  quantity_per_unit: number;
  average_unit_cost: number;
  cost_per_product_unit: number;
  active: boolean;
};
type CostedSale = {
  operation_scope: BusinessOperation;
  snapshot_id: string;
  sale_id: string;
  customer_name: string;
  delivered_on: string | null;
  profile_name: string | null;
  revenue_total: number;
  merchandise_cost_total: number;
  operational_cost_total: number;
  gross_profit: number;
  contribution_margin: number;
  negative_supply_count: number;
  status: string;
};
type Receipt = {
  id: string;
  supply_id: string;
  supply_name: string;
  unit_name: string;
  received_on: string;
  quantity: number;
  total_cost: number;
  unit_cost: number;
  supplier_name: string | null;
  financial_status: string;
  bank_charge_id: string | null;
};
type ProductOption = { id: string; name: string; category: string | null };
type AccountOption = { id: string; name: string };
type Summary = {
  active_supplies: number;
  stock_value: number;
  low_stock: number;
  negative_stock: number;
  profiles: number;
  costed_sales_this_month: number;
  operational_cost_this_month: number;
  contribution_margin_this_month: number;
};
type Snapshot = {
  summary: Summary;
  supplies: Supply[];
  profiles: Profile[];
  requirements: Requirement[];
  recent_sales: CostedSale[];
  recent_receipts: Receipt[];
};
type ProductPreview = {
  acquisition_cost: number;
  default_operational_cost: number;
  product_specific_cost: number;
  estimated_operational_cost: number;
  estimated_variable_cost: number;
  sale_price: number;
  estimated_contribution_margin: number;
};

const emptySnapshot: Snapshot = {
  summary: {
    active_supplies: 0,
    stock_value: 0,
    low_stock: 0,
    negative_stock: 0,
    profiles: 0,
    costed_sales_this_month: 0,
    operational_cost_this_month: 0,
    contribution_margin_this_month: 0,
  },
  supplies: [],
  profiles: [],
  requirements: [],
  recent_sales: [],
  recent_receipts: [],
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusLabel(status: Supply["stock_status"]) {
  if (status === "healthy") return "Saudável";
  if (status === "negative") return "Saldo negativo";
  if (status === "low") return "Estoque baixo";
  return "Inativo";
}

function scopeLabel(scope: OperationScope) {
  if (scope === "supplements") return "Suplementos";
  if (scope === "fitness") return "Fitness";
  return "Compartilhado";
}

function basisLabel(basis: ProfileItem["usage_basis"]) {
  if (basis === "per_line") return "Por produto diferente";
  if (basis === "per_unit") return "Por unidade vendida";
  return "Por venda";
}

export function OperationalCostsManager({
  initialOperation = "supplements",
}: {
  initialOperation?: BusinessOperation;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [fitnessProducts, setFitnessProducts] = useState<ProductOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [profileId, setProfileId] = useState("");
  const [profileRows, setProfileRows] = useState<ProfileItem[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileNotes, setProfileNotes] = useState("");

  const [requirementOperation, setRequirementOperation] =
    useState<BusinessOperation>(initialOperation);
  const [requirementProductId, setRequirementProductId] = useState("");
  const [preview, setPreview] = useState<ProductPreview | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const [dashboard, supplementProducts, fitnessRows, accountRows] =
        await Promise.all([
          supabase.rpc("operational_cost_dashboard_snapshot"),
          supabase
            .from("products")
            .select("id,name,category")
            .eq("active", true)
            .order("name"),
          supabase
            .from("fitness_products")
            .select("id,name,category")
            .eq("active", true)
            .order("name"),
          supabase
            .from("bank_accounts")
            .select("id,name")
            .eq("is_active", true)
            .order("display_order")
            .order("name"),
        ]);

      const error =
        dashboard.error ||
        supplementProducts.error ||
        fitnessRows.error ||
        accountRows.error;
      if (error) throw error;

      const raw = (dashboard.data ?? {}) as Record<string, unknown>;
      const rawSummary = (raw.summary ?? {}) as Record<string, unknown>;
      const mapped: Snapshot = {
        summary: {
          active_supplies: numberValue(rawSummary.active_supplies),
          stock_value: numberValue(rawSummary.stock_value),
          low_stock: numberValue(rawSummary.low_stock),
          negative_stock: numberValue(rawSummary.negative_stock),
          profiles: numberValue(rawSummary.profiles),
          costed_sales_this_month: numberValue(
            rawSummary.costed_sales_this_month,
          ),
          operational_cost_this_month: numberValue(
            rawSummary.operational_cost_this_month,
          ),
          contribution_margin_this_month: numberValue(
            rawSummary.contribution_margin_this_month,
          ),
        },
        supplies: Array.isArray(raw.supplies)
          ? (raw.supplies as Supply[]).map((row) => ({
              ...row,
              quantity_on_hand: numberValue(row.quantity_on_hand),
              average_unit_cost: numberValue(row.average_unit_cost),
              min_quantity: numberValue(row.min_quantity),
              stock_value: numberValue(row.stock_value),
              consumed_this_month: numberValue(row.consumed_this_month),
            }))
          : [],
        profiles: Array.isArray(raw.profiles)
          ? (raw.profiles as Profile[]).map((row) => ({
              ...row,
              items: Array.isArray(row.items)
                ? row.items.map((item) => ({
                    ...item,
                    quantity: numberValue(item.quantity),
                    unit_cost: numberValue(item.unit_cost),
                  }))
                : [],
              estimated_one_item_cost: numberValue(
                row.estimated_one_item_cost,
              ),
            }))
          : [],
        requirements: Array.isArray(raw.requirements)
          ? (raw.requirements as Requirement[]).map((row) => ({
              ...row,
              quantity_per_unit: numberValue(row.quantity_per_unit),
              average_unit_cost: numberValue(row.average_unit_cost),
              cost_per_product_unit: numberValue(row.cost_per_product_unit),
            }))
          : [],
        recent_sales: Array.isArray(raw.recent_sales)
          ? (raw.recent_sales as CostedSale[]).map((row) => ({
              ...row,
              revenue_total: numberValue(row.revenue_total),
              merchandise_cost_total: numberValue(row.merchandise_cost_total),
              operational_cost_total: numberValue(row.operational_cost_total),
              gross_profit: numberValue(row.gross_profit),
              contribution_margin: numberValue(row.contribution_margin),
              negative_supply_count: numberValue(row.negative_supply_count),
            }))
          : [],
        recent_receipts: Array.isArray(raw.recent_receipts)
          ? (raw.recent_receipts as Receipt[]).map((row) => ({
              ...row,
              quantity: numberValue(row.quantity),
              total_cost: numberValue(row.total_cost),
              unit_cost: numberValue(row.unit_cost),
            }))
          : [],
      };

      setSnapshot(mapped);
      setProducts((supplementProducts.data ?? []) as ProductOption[]);
      setFitnessProducts((fitnessRows.data ?? []) as ProductOption[]);
      setAccounts((accountRows.data ?? []) as AccountOption[]);

      const selectedProfile = mapped.profiles.find(
        (row) => row.id === profileId,
      );
      if (!profileId && mapped.profiles.length) {
        selectProfile(mapped.profiles[0]);
      } else if (selectedProfile) {
        selectProfile(selectedProfile);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os custos operacionais.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notify(text: string) {
    setSuccess(true);
    setMessage(text);
    window.setTimeout(() => setSuccess(false), 3500);
  }

  function selectProfile(profile: Profile) {
    setProfileId(profile.id);
    setProfileName(profile.name);
    setProfileNotes(profile.notes ?? "");
    setProfileRows(
      profile.items.map((item) => ({
        supply_id: item.supply_id,
        usage_basis: item.usage_basis,
        quantity: numberValue(item.quantity),
      })),
    );
  }

  const selectedProfile = useMemo(
    () => snapshot.profiles.find((row) => row.id === profileId) ?? null,
    [profileId, snapshot.profiles],
  );

  const compatibleSupplies = useMemo(() => {
    const scope = selectedProfile?.operation_scope ?? initialOperation;
    return snapshot.supplies.filter(
      (row) =>
        row.active &&
        (row.operation_scope === "shared" || row.operation_scope === scope),
    );
  }, [initialOperation, selectedProfile, snapshot.supplies]);

  const requirementProducts =
    requirementOperation === "fitness" ? fitnessProducts : products;
  const requirementSupplies = snapshot.supplies.filter(
    (row) =>
      row.active &&
      (row.operation_scope === "shared" ||
        row.operation_scope === requirementOperation),
  );

  async function createSupply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("create_operational_supply", {
        p_operation_scope: String(form.get("operation_scope") ?? "shared"),
        p_name: String(form.get("name") ?? ""),
        p_unit_name: String(form.get("unit_name") ?? "unidade"),
        p_sku: String(form.get("sku") ?? "") || null,
        p_min_quantity: numberValue(form.get("min_quantity")),
        p_opening_quantity: numberValue(form.get("opening_quantity")),
        p_opening_total_cost: numberValue(form.get("opening_total_cost")),
        p_notes: String(form.get("notes") ?? "") || null,
      });
      if (error) throw error;
      formElement.reset();
      await load();
      notify("Insumo cadastrado. O custo unitário inicial foi calculado automaticamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar o insumo.");
    } finally {
      setSaving(false);
    }
  }

  async function receiveSupply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const financialStatus = String(
      form.get("financial_status") ?? "not_informed",
    );
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("receive_operational_supply", {
        p_supply_id: String(form.get("supply_id") ?? ""),
        p_received_on: String(form.get("received_on") ?? todayBrazil()),
        p_quantity: numberValue(form.get("quantity")),
        p_total_cost: numberValue(form.get("total_cost")),
        p_supplier_name: String(form.get("supplier_name") ?? "") || null,
        p_financial_status: financialStatus,
        p_due_on:
          financialStatus === "payable"
            ? String(form.get("due_on") ?? "") || null
            : null,
        p_payment_account_id: String(form.get("payment_account_id") ?? "") || null,
        p_notes: String(form.get("notes") ?? "") || null,
      });
      if (error) throw error;
      formElement.reset();
      await load();
      setTab("overview");
      notify(
        financialStatus === "not_informed"
          ? "Compra registrada no estoque de insumos."
          : "Compra registrada no estoque e integrada às cobranças do Bank.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a compra.");
    } finally {
      setSaving(false);
    }
  }

  async function countSupply(supplyId: string, value: string) {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("count_operational_supply", {
        p_supply_id: supplyId,
        p_counted_quantity: numberValue(value),
        p_notes: "Contagem física registrada pela área de Custos e Insumos",
      });
      if (error) throw error;
      await load();
      notify("Contagem conciliada e auditada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível conciliar o saldo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!selectedProfile) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("save_operational_cost_profile", {
        p_profile_id: selectedProfile.id,
        p_operation_scope: selectedProfile.operation_scope,
        p_channel: selectedProfile.channel,
        p_name: profileName,
        p_is_default: selectedProfile.is_default,
        p_active: selectedProfile.active,
        p_items: profileRows
          .filter((row) => row.supply_id && row.quantity > 0)
          .map((row) => ({
            supply_id: row.supply_id,
            usage_basis: row.usage_basis,
            quantity: row.quantity,
          })),
        p_notes: profileNotes || null,
      });
      if (error) throw error;
      await load();
      notify("Receita operacional salva. As próximas vendas entregues usarão esse padrão.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRequirement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(
        "save_product_operational_requirement",
        {
          p_operation_scope: requirementOperation,
          p_product_id: String(form.get("product_id") ?? ""),
          p_supply_id: String(form.get("supply_id") ?? ""),
          p_quantity_per_unit: numberValue(form.get("quantity_per_unit")),
          p_active: true,
          p_notes: String(form.get("notes") ?? "") || null,
        },
      );
      if (error) throw error;
      formElement.reset();
      setRequirementProductId("");
      setPreview(null);
      await load();
      notify("Insumo específico vinculado ao produto.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível vincular o insumo.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRequirement(id: string) {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(
        "remove_product_operational_requirement",
        { p_requirement_id: id },
      );
      if (error) throw error;
      await load();
      notify("Vínculo removido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o vínculo.");
    } finally {
      setSaving(false);
    }
  }

  async function processPending(operation: BusinessOperation) {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "process_pending_operational_cost_sales",
        { p_operation_scope: operation, p_limit: 100 },
      );
      if (error) throw error;
      await load();
      notify(
        `${numberValue(data)} venda(s) pendente(s) de ${scopeLabel(operation)} foram custeadas.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível processar as vendas pendentes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadPreview(operation: BusinessOperation, productId: string) {
    setRequirementProductId(productId);
    setPreview(null);
    if (!productId) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "operational_cost_product_preview",
      { p_operation_scope: operation, p_product_id: productId },
    );
    if (error) {
      setMessage(error.message);
      return;
    }
    const row = (data ?? {}) as Record<string, unknown>;
    setPreview({
      acquisition_cost: numberValue(row.acquisition_cost),
      default_operational_cost: numberValue(row.default_operational_cost),
      product_specific_cost: numberValue(row.product_specific_cost),
      estimated_operational_cost: numberValue(row.estimated_operational_cost),
      estimated_variable_cost: numberValue(row.estimated_variable_cost),
      sale_price: numberValue(row.sale_price),
      estimated_contribution_margin: numberValue(row.estimated_contribution_margin),
    });
  }

  if (loading) {
    return (
      <div className={styles.empty}>
        <LoaderCircle className="spin" size={24} />
        <p>Carregando custos e insumos...</p>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.intro}>
        <div className={styles.introCard}>
          <span>Dinheiro comprado</span>
          <strong>vira estoque de insumos</strong>
        </div>
        <div className={styles.introCard}>
          <span>Insumo utilizado</span>
          <strong>vira custo da venda</strong>
        </div>
        <div className={styles.introCard}>
          <span>Resultado correto</span>
          <strong>vira margem de contribuição</strong>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${success ? styles.success : ""}`}>
          {success && <CheckCircle2 size={15} />} {message}
        </div>
      )}

      <div className={styles.tabs}>
        {([
          ["overview", "Insumos", Boxes],
          ["purchase", "Registrar compra", PackagePlus],
          ["profiles", "Receitas de uso", Settings2],
          ["products", "Produtos especiais", Calculator],
          ["results", "Margem real", TrendingUp],
        ] as const).map(([value, label, Icon]) => (
          <button
            className={`${styles.tab} ${tab === value ? styles.tabActive : ""}`}
            key={value}
            type="button"
            onClick={() => setTab(value)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className={styles.grid}>
            <div className={styles.stat}>
              <span>Insumos ativos</span>
              <strong>{snapshot.summary.active_supplies}</strong>
            </div>
            <div className={styles.stat}>
              <span>Patrimônio em insumos</span>
              <strong>{formatCurrency(snapshot.summary.stock_value)}</strong>
            </div>
            <div className={styles.stat}>
              <span>Precisam de atenção</span>
              <strong>{snapshot.summary.low_stock}</strong>
            </div>
            <div className={styles.stat}>
              <span>Custo usado neste mês</span>
              <strong>
                {formatCurrency(snapshot.summary.operational_cost_this_month)}
              </strong>
            </div>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>Estoque de sacolas, etiquetas e materiais</h2>
                <p>
                  O custo médio muda a cada compra. A baixa ocorre somente quando
                  uma venda entregue realmente utiliza o material.
                </p>
              </div>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                type="button"
                onClick={() => setTab("purchase")}
              >
                <PackagePlus size={15} /> Registrar compra
              </button>
            </div>
            <div className={styles.panelBody}>
              {snapshot.supplies.length === 0 ? (
                <form className={styles.formGrid} onSubmit={createSupply}>
                  <div className={`${styles.help} ${styles.wide}`}>
                    Comece cadastrando os materiais reais. Exemplo: “Sacola
                    Suplementos”, quantidade 100 e custo total R$ 100,00. O
                    sistema calculará R$ 1,00 por sacola.
                  </div>
                  <label className={styles.field}>
                    <span>Nome do insumo</span>
                    <input className={styles.input} name="name" required />
                  </label>
                  <label className={styles.field}>
                    <span>Operação</span>
                    <select className={styles.select} name="operation_scope" defaultValue="shared">
                      <option value="shared">Compartilhado</option>
                      <option value="supplements">Suplementos</option>
                      <option value="fitness">Fitness</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Unidade</span>
                    <input className={styles.input} name="unit_name" defaultValue="unidade" />
                  </label>
                  <label className={styles.field}>
                    <span>Estoque mínimo</span>
                    <input className={styles.input} name="min_quantity" type="number" min="0" step="0.001" defaultValue="0" />
                  </label>
                  <label className={styles.field}>
                    <span>Quantidade inicial</span>
                    <input className={styles.input} name="opening_quantity" type="number" min="0" step="0.001" defaultValue="0" />
                  </label>
                  <label className={styles.field}>
                    <span>Custo total da quantidade inicial</span>
                    <input className={styles.input} name="opening_total_cost" type="number" min="0" step="0.01" defaultValue="0" />
                  </label>
                  <label className={`${styles.field} ${styles.wide}`}>
                    <span>Observação</span>
                    <textarea className={styles.textarea} name="notes" />
                  </label>
                  <div className={`${styles.actions} ${styles.wide}`}>
                    <button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}>
                      <Plus size={15} /> Cadastrar primeiro insumo
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.cards}>
                    {snapshot.supplies.map((supply) => (
                      <SupplyCard
                        key={supply.id}
                        supply={supply}
                        saving={saving}
                        onCount={countSupply}
                      />
                    ))}
                  </div>
                  <details style={{ marginTop: 16 }}>
                    <summary className={styles.button}>+ Cadastrar outro insumo</summary>
                    <form className={styles.formGrid} onSubmit={createSupply} style={{ marginTop: 14 }}>
                      <label className={styles.field}><span>Nome</span><input className={styles.input} name="name" required /></label>
                      <label className={styles.field}><span>Operação</span><select className={styles.select} name="operation_scope" defaultValue="shared"><option value="shared">Compartilhado</option><option value="supplements">Suplementos</option><option value="fitness">Fitness</option></select></label>
                      <label className={styles.field}><span>Unidade</span><input className={styles.input} name="unit_name" defaultValue="unidade" /></label>
                      <label className={styles.field}><span>Estoque mínimo</span><input className={styles.input} name="min_quantity" type="number" min="0" step="0.001" defaultValue="0" /></label>
                      <label className={styles.field}><span>Quantidade inicial</span><input className={styles.input} name="opening_quantity" type="number" min="0" step="0.001" defaultValue="0" /></label>
                      <label className={styles.field}><span>Custo total inicial</span><input className={styles.input} name="opening_total_cost" type="number" min="0" step="0.01" defaultValue="0" /></label>
                      <div className={`${styles.actions} ${styles.wide}`}><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}><Save size={15}/> Salvar insumo</button></div>
                    </form>
                  </details>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "purchase" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Registrar compra de insumo</h2><p>Atualiza o custo médio e, quando informado, cria a saída a pagar ou paga no Candinho Bank.</p></div>
            <ReceiptText size={20}/>
          </div>
          <div className={styles.panelBody}>
            {snapshot.supplies.length === 0 ? (
              <div className={styles.empty}>Cadastre um insumo antes de registrar compras.</div>
            ) : (
              <form className={styles.formGrid} onSubmit={receiveSupply}>
                <label className={styles.field}><span>Insumo</span><select className={styles.select} name="supply_id" required><option value="">Selecione</option>{snapshot.supplies.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name} · atual {row.quantity_on_hand} {row.unit_name}</option>)}</select></label>
                <label className={styles.field}><span>Data da compra/recebimento</span><input className={styles.input} name="received_on" type="date" defaultValue={todayBrazil()} required /></label>
                <label className={styles.field}><span>Quantidade comprada</span><input className={styles.input} name="quantity" type="number" min="0.001" step="0.001" required /></label>
                <label className={styles.field}><span>Valor total pago ou contratado</span><input className={styles.input} name="total_cost" type="number" min="0" step="0.01" required /></label>
                <label className={styles.field}><span>Fornecedor</span><input className={styles.input} name="supplier_name" placeholder="Ex.: Embalagens Carangola" /></label>
                <label className={styles.field}><span>Situação no Bank</span><select className={styles.select} name="financial_status" defaultValue="not_informed"><option value="not_informed">Não lançar no Bank agora</option><option value="paid">Já foi pago</option><option value="payable">Ficou a pagar</option></select></label>
                <label className={styles.field}><span>Vencimento, quando ficou a pagar</span><input className={styles.input} name="due_on" type="date" /></label>
                <label className={styles.field}><span>Conta utilizada, quando pago</span><select className={styles.select} name="payment_account_id"><option value="">Não informar</option>{accounts.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
                <label className={`${styles.field} ${styles.wide}`}><span>Observação</span><textarea className={styles.textarea} name="notes" placeholder="Número do pedido, material, condição de compra..." /></label>
                <div className={`${styles.help} ${styles.wide}`}>A compra reduz seu dinheiro no Bank, mas não reduz o lucro imediatamente: ela vira patrimônio em insumos. O custo só entra na margem quando a sacola, etiqueta ou material for consumido por uma venda entregue.</div>
                <div className={`${styles.actions} ${styles.wide}`}><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:<PackagePlus size={15}/>} Registrar compra</button></div>
              </form>
            )}
            {snapshot.recent_receipts.length>0&&<div className={styles.tableWrap} style={{marginTop:18}}><table className={styles.table}><thead><tr><th>Data</th><th>Insumo</th><th>Quantidade</th><th>Total</th><th>Custo unitário</th><th>Bank</th></tr></thead><tbody>{snapshot.recent_receipts.map(row=><tr key={row.id}><td>{formatDateOnly(row.received_on)}</td><td><strong>{row.supply_name}</strong><br/><small>{row.supplier_name??"Sem fornecedor"}</small></td><td>{row.quantity} {row.unit_name}</td><td>{formatCurrency(row.total_cost)}</td><td>{formatCurrency(row.unit_cost)}</td><td>{row.financial_status==="paid"?"Pago":row.financial_status==="payable"?"A pagar":"Não lançado"}</td></tr>)}</tbody></table></div>}
          </div>
        </section>
      )}

      {tab === "profiles" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>Receitas de uso por canal</h2><p>Defina o que uma venda normalmente consome. Uma sacola costuma ser por venda; etiqueta pode ser por unidade.</p></div><Settings2 size={20}/></div>
          <div className={styles.panelBody}>
            {snapshot.profiles.length===0?<div className={styles.empty}>Nenhum perfil disponível.</div>:<>
              <div className={styles.profileSelect}><select className={styles.select} value={profileId} onChange={event=>{const profile=snapshot.profiles.find(row=>row.id===event.target.value);if(profile)selectProfile(profile)}}>{snapshot.profiles.map(row=><option key={row.id} value={row.id}>{scopeLabel(row.operation_scope)} · {row.name}</option>)}</select><span className={styles.badge}>{selectedProfile?.channel??"canal"}</span></div>
              <div className={styles.formGrid} style={{marginTop:14}}><label className={styles.field}><span>Nome do perfil</span><input className={styles.input} value={profileName} onChange={event=>setProfileName(event.target.value)}/></label><label className={`${styles.field} ${styles.wide}`}><span>Observação</span><textarea className={styles.textarea} value={profileNotes} onChange={event=>setProfileNotes(event.target.value)}/></label></div>
              <div className={styles.profileItems}>{profileRows.map((row,index)=><div className={styles.profileRow} key={`${index}-${row.supply_id}`}><label className={styles.field}><span>Insumo</span><select className={styles.select} value={row.supply_id} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,supply_id:event.target.value}:item))}><option value="">Selecione</option>{compatibleSupplies.map(supply=><option key={supply.id} value={supply.id}>{supply.name} · {formatCurrency(supply.average_unit_cost)}/{supply.unit_name}</option>)}</select></label><label className={styles.field}><span>Base de consumo</span><select className={styles.select} value={row.usage_basis} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,usage_basis:event.target.value as ProfileItem["usage_basis"]}:item))}><option value="per_sale">Por venda</option><option value="per_line">Por produto diferente</option><option value="per_unit">Por unidade vendida</option></select></label><label className={styles.field}><span>Quantidade</span><input className={styles.input} type="number" min="0.001" step="0.001" value={row.quantity} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,quantity:numberValue(event.target.value)}:item))}/></label><button className={`${styles.button} ${styles.buttonDanger}`} type="button" onClick={()=>setProfileRows(current=>current.filter((_,i)=>i!==index))}><Trash2 size={15}/></button></div>)}</div>
              <div className={styles.actions}><button className={styles.button} type="button" onClick={()=>setProfileRows(current=>[...current,{supply_id:"",usage_basis:"per_sale",quantity:1}])}><Plus size={15}/> Adicionar insumo</button><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={saveProfile} disabled={saving}><Save size={15}/> Salvar receita</button></div>
              <div className={styles.help} style={{marginTop:14}}>{selectedProfile?.estimated_one_item_cost?`Custo estimado atual para uma venda com 1 produto e 1 unidade: ${formatCurrency(selectedProfile.estimated_one_item_cost)}.`:"Esse perfil ainda não consome insumos. Cadastre os materiais primeiro e adicione-os aqui."}</div>
            </>}
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>Insumos específicos de produtos</h2><p>Use somente quando um produto consome algo além do padrão da venda, como pote, lacre, rótulo ou embalagem exclusiva.</p></div><Calculator size={20}/></div>
          <div className={styles.panelBody}>
            <form className={styles.formGrid} onSubmit={saveRequirement}>
              <label className={styles.field}><span>Operação</span><select className={styles.select} value={requirementOperation} onChange={event=>{const operation=event.target.value as BusinessOperation;setRequirementOperation(operation);setRequirementProductId("");setPreview(null)}}><option value="supplements">Suplementos</option><option value="fitness">Fitness</option></select></label>
              <label className={styles.field}><span>Produto</span><select className={styles.select} name="product_id" required value={requirementProductId} onChange={event=>void loadPreview(requirementOperation,event.target.value)}><option value="">Selecione</option>{requirementProducts.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
              <label className={styles.field}><span>Insumo adicional</span><select className={styles.select} name="supply_id" required><option value="">Selecione</option>{requirementSupplies.map(row=><option key={row.id} value={row.id}>{row.name} · {formatCurrency(row.average_unit_cost)}</option>)}</select></label>
              <label className={styles.field}><span>Quantidade por unidade do produto</span><input className={styles.input} name="quantity_per_unit" type="number" min="0.001" step="0.001" defaultValue="1" required/></label>
              <label className={`${styles.field} ${styles.wide}`}><span>Observação</span><input className={styles.input} name="notes" placeholder="Ex.: 1 rótulo exclusivo por pote"/></label>
              <div className={`${styles.actions} ${styles.wide}`}><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}><Plus size={15}/> Vincular ao produto</button></div>
            </form>
            {preview&&<div className={styles.preview}><div><span>Custo de aquisição</span><strong>{formatCurrency(preview.acquisition_cost)}</strong></div><div><span>Operação padrão</span><strong>{formatCurrency(preview.default_operational_cost)}</strong></div><div><span>Custos exclusivos</span><strong>{formatCurrency(preview.product_specific_cost)}</strong></div><div><span>Margem estimada</span><strong className={preview.estimated_contribution_margin>=0?styles.positive:styles.negativeText}>{formatCurrency(preview.estimated_contribution_margin)}</strong></div></div>}
            <div className={styles.tableWrap} style={{marginTop:18}}><table className={styles.table}><thead><tr><th>Operação</th><th>Produto</th><th>Insumo</th><th>Qtd./unidade</th><th>Custo adicional</th><th/></tr></thead><tbody>{snapshot.requirements.map(row=><tr key={row.id}><td>{scopeLabel(row.operation_scope)}</td><td><strong>{row.product_name}</strong></td><td>{row.supply_name}</td><td>{row.quantity_per_unit} {row.unit_name}</td><td>{formatCurrency(row.cost_per_product_unit)}</td><td><button className={`${styles.button} ${styles.buttonDanger}`} type="button" onClick={()=>void removeRequirement(row.id)} disabled={saving}><Trash2 size={14}/> Remover</button></td></tr>)}{snapshot.requirements.length===0&&<tr><td colSpan={6}>Nenhum custo exclusivo configurado. Isso é normal para a maioria dos produtos.</td></tr>}</tbody></table></div>
          </div>
        </section>
      )}

      {tab === "results" && (
        <>
          <div className={styles.grid}><div className={styles.stat}><span>Vendas custeadas no mês</span><strong>{snapshot.summary.costed_sales_this_month}</strong></div><div className={styles.stat}><span>Insumos consumidos</span><strong>{formatCurrency(snapshot.summary.operational_cost_this_month)}</strong></div><div className={styles.stat}><span>Margem de contribuição</span><strong>{formatCurrency(snapshot.summary.contribution_margin_this_month)}</strong></div><div className={styles.stat}><span>Alertas de saldo negativo</span><strong>{snapshot.summary.negative_stock}</strong></div></div>
          <section className={styles.panel}><div className={styles.panelHead}><div><h2>Vendas com custo completo</h2><p>Vendas antigas continuam como lucro bruto histórico. A partir da configuração, novas entregas congelam o custo real daquele momento.</p></div><div className={styles.actions} style={{marginTop:0}}><button className={styles.button} type="button" disabled={saving} onClick={()=>void processPending("supplements")}>Processar pendentes de Suplementos</button><button className={styles.button} type="button" disabled={saving} onClick={()=>void processPending("fitness")}>Processar pendentes Fitness</button></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Entrega</th><th>Operação / cliente</th><th>Receita</th><th>Mercadoria</th><th>Lucro bruto</th><th>Insumos</th><th>Margem de contribuição</th></tr></thead><tbody>{snapshot.recent_sales.map(row=><tr key={row.snapshot_id}><td>{row.delivered_on?formatDateOnly(row.delivered_on):"—"}</td><td><strong>{scopeLabel(row.operation_scope)}</strong><br/><small>{row.customer_name}</small></td><td>{formatCurrency(row.revenue_total)}</td><td>{formatCurrency(row.merchandise_cost_total)}</td><td>{formatCurrency(row.gross_profit)}</td><td className={row.negative_supply_count>0?styles.negativeText:""}>{formatCurrency(row.operational_cost_total)}{row.negative_supply_count>0?" ⚠":""}</td><td className={row.contribution_margin>=0?styles.positive:styles.negativeText}>{formatCurrency(row.contribution_margin)}</td></tr>)}{snapshot.recent_sales.length===0&&<tr><td colSpan={7}>Nenhuma venda nova foi custeada ainda. Configure os perfis; a próxima venda entregue será registrada automaticamente.</td></tr>}</tbody></table></div></section>
        </>
      )}
    </div>
  );
}

function SupplyCard({
  supply,
  saving,
  onCount,
}: {
  supply: Supply;
  saving: boolean;
  onCount: (id: string, value: string) => Promise<void>;
}) {
  const [count, setCount] = useState(String(supply.quantity_on_hand));
  useEffect(() => setCount(String(supply.quantity_on_hand)), [supply.quantity_on_hand]);
  return (
    <article className={styles.supplyCard}>
      <div className={styles.supplyHead}>
        <div><h3>{supply.name}</h3><small>{scopeLabel(supply.operation_scope)} · {supply.unit_name}</small></div>
        <span className={`${styles.badge} ${styles[supply.stock_status]}`}>{statusLabel(supply.stock_status)}</span>
      </div>
      <div className={styles.supplyMetrics}>
        <div className={styles.metric}><span>Saldo</span><strong>{supply.quantity_on_hand}</strong></div>
        <div className={styles.metric}><span>Custo médio</span><strong>{formatCurrency(supply.average_unit_cost)}</strong></div>
        <div className={styles.metric}><span>Valor em estoque</span><strong>{formatCurrency(supply.stock_value)}</strong></div>
        <div className={styles.metric}><span>Consumido no mês</span><strong>{supply.consumed_this_month}</strong></div>
      </div>
      <div className={styles.countRow}>
        <input className={styles.input} type="number" min="0" step="0.001" value={count} onChange={event=>setCount(event.target.value)} aria-label={`Contagem de ${supply.name}`}/>
        <button className={styles.button} type="button" disabled={saving||numberValue(count)===supply.quantity_on_hand} onClick={()=>void onCount(supply.id,count)}><ClipboardCheck size={14}/> Contar</button>
      </div>
    </article>
  );
}
