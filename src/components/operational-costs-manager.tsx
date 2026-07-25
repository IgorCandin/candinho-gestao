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
  ArrowRight,
  Lightbulb,
  ShoppingBag,
  Tag,
  Package,
  CircleHelp,
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

type SupplyDraft = {
  name: string;
  operation_scope: OperationScope;
  unit_name: string;
  min_quantity: string;
  opening_quantity: string;
  opening_total_cost: string;
  notes: string;
};

const emptySupplyDraft: SupplyDraft = {
  name: "",
  operation_scope: "shared",
  unit_name: "unidade",
  min_quantity: "0",
  opening_quantity: "",
  opening_total_cost: "",
  notes: "",
};

const supplySuggestions: Array<{
  title: string;
  description: string;
  icon: typeof ShoppingBag;
  draft: SupplyDraft;
}> = [
  {
    title: "Sacola Suplementos",
    description: "Uma sacola usada na maioria das vendas da loja.",
    icon: ShoppingBag,
    draft: { ...emptySupplyDraft, name: "Sacola Suplementos", operation_scope: "supplements", min_quantity: "20" },
  },
  {
    title: "Etiqueta",
    description: "Normalmente consumida por produto ou unidade vendida.",
    icon: Tag,
    draft: { ...emptySupplyDraft, name: "Etiqueta", operation_scope: "shared", min_quantity: "50" },
  },
  {
    title: "Cartão de agradecimento",
    description: "Material colocado uma vez em cada pedido.",
    icon: ReceiptText,
    draft: { ...emptySupplyDraft, name: "Cartão de agradecimento", operation_scope: "shared", min_quantity: "20" },
  },
  {
    title: "Sacola Fitness",
    description: "Embalagem usada somente nas vendas da Candinho Fitness.",
    icon: Package,
    draft: { ...emptySupplyDraft, name: "Sacola Fitness", operation_scope: "fitness", min_quantity: "15" },
  },
];

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
  const [supplyDraft, setSupplyDraft] = useState<SupplyDraft>(emptySupplyDraft);
  const [showSupplyForm, setShowSupplyForm] = useState(false);

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
      setSupplyDraft(emptySupplyDraft);
      setShowSupplyForm(false);
      await load();
      notify("Material cadastrado. Agora você pode registrar compras e definir onde ele é usado.");
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

  const configuredProfiles = snapshot.profiles.filter((profile) => profile.items.length > 0).length;
  const setupComplete = snapshot.supplies.length > 0 && configuredProfiles > 0;
  const estimatedOpeningUnitCost =
    numberValue(supplyDraft.opening_quantity) > 0
      ? numberValue(supplyDraft.opening_total_cost) / numberValue(supplyDraft.opening_quantity)
      : 0;

  function chooseSupplySuggestion(draft: SupplyDraft) {
    setSupplyDraft(draft);
    setShowSupplyForm(true);
    setTab("overview");
    window.setTimeout(() => {
      document.getElementById("novo-insumo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function renderSupplyForm() {
    return (
      <form id="novo-insumo" className={styles.guidedForm} onSubmit={createSupply}>
        <div className={styles.formSectionHead}>
          <span className={styles.stepBubble}>1</span>
          <div>
            <strong>Qual material você comprou?</strong>
            <small>Cadastre o material e informe o saldo que já existe hoje.</small>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.wide}`}>
            <span>Nome do material</span>
            <input
              className={styles.input}
              name="name"
              required
              value={supplyDraft.name}
              onChange={(event) => setSupplyDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex.: Sacola Suplementos"
            />
          </label>
          <label className={styles.field}>
            <span>Onde ele é usado?</span>
            <select
              className={styles.select}
              name="operation_scope"
              value={supplyDraft.operation_scope}
              onChange={(event) => setSupplyDraft((current) => ({ ...current, operation_scope: event.target.value as OperationScope }))}
            >
              <option value="shared">Nas duas operações</option>
              <option value="supplements">Somente Suplementos</option>
              <option value="fitness">Somente Fitness</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Como você conta?</span>
            <select
              className={styles.select}
              name="unit_name"
              value={supplyDraft.unit_name}
              onChange={(event) => setSupplyDraft((current) => ({ ...current, unit_name: event.target.value }))}
            >
              <option value="unidade">Unidade</option>
              <option value="metro">Metro</option>
              <option value="folha">Folha</option>
              <option value="rolo">Rolo</option>
              <option value="pacote">Pacote</option>
            </select>
          </label>
        </div>

        <div className={styles.formSectionHead}>
          <span className={styles.stepBubble}>2</span>
          <div>
            <strong>Quanto você tem e quanto custou?</strong>
            <small>O sistema divide o valor total pela quantidade e calcula o custo de cada unidade.</small>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Quantidade atual</span>
            <input className={styles.input} name="opening_quantity" type="number" min="0" step="0.001" value={supplyDraft.opening_quantity} onChange={(event) => setSupplyDraft((current) => ({ ...current, opening_quantity: event.target.value }))} placeholder="Ex.: 100" />
          </label>
          <label className={styles.field}>
            <span>Valor total dessa quantidade</span>
            <input className={styles.input} name="opening_total_cost" type="number" min="0" step="0.01" value={supplyDraft.opening_total_cost} onChange={(event) => setSupplyDraft((current) => ({ ...current, opening_total_cost: event.target.value }))} placeholder="Ex.: 100,00" />
          </label>
          <label className={styles.field}>
            <span>Avise quando chegar a</span>
            <input className={styles.input} name="min_quantity" type="number" min="0" step="0.001" value={supplyDraft.min_quantity} onChange={(event) => setSupplyDraft((current) => ({ ...current, min_quantity: event.target.value }))} />
          </label>
          <div className={styles.liveCalculation}>
            <span>Custo calculado por {supplyDraft.unit_name || "unidade"}</span>
            <strong>{formatCurrency(estimatedOpeningUnitCost)}</strong>
            <small>Ex.: R$ 100,00 ÷ 100 = R$ 1,00</small>
          </div>
          <label className={`${styles.field} ${styles.wide}`}>
            <span>Observação opcional</span>
            <textarea className={styles.textarea} name="notes" value={supplyDraft.notes} onChange={(event) => setSupplyDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Fornecedor, tamanho, modelo ou qualquer detalhe útil..." />
          </label>
        </div>

        <div className={styles.formFooter}>
          <button className={styles.button} type="button" onClick={() => { setShowSupplyForm(false); setSupplyDraft(emptySupplyDraft); }}>Cancelar</button>
          <button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            Salvar material
          </button>
        </div>
      </form>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <LoaderCircle className="spin" size={26} />
        <strong>Preparando seus custos...</strong>
        <span>Carregando materiais, receitas e resultados.</span>
      </div>
    );
  }

  const tabItems = [
    { value: "overview" as const, step: "1", label: "Materiais", description: "Sacolas, etiquetas e embalagens", icon: Boxes },
    { value: "purchase" as const, step: "2", label: "Compras", description: "Reposição e custo médio", icon: PackagePlus },
    { value: "profiles" as const, step: "3", label: "Uso por venda", description: "O que cada canal consome", icon: Settings2 },
    { value: "products" as const, step: "4", label: "Exceções", description: "Custos exclusivos de produtos", icon: Calculator },
    { value: "results" as const, step: "5", label: "Resultado real", description: "Margem após os materiais", icon: TrendingUp },
  ];

  return (
    <div className={styles.workspace}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Custo real, sem complicação</span>
          <h2>Descubra quanto sobra de verdade em cada venda</h2>
          <p>Cadastre os materiais, diga como são usados e pronto: a baixa acontece automaticamente quando a venda é entregue.</p>
        </div>
        <div className={styles.heroFormula}>
          <div><span>Venda</span><strong>R$ 70,00</strong></div>
          <b>−</b>
          <div><span>Produto</span><strong>R$ 30,00</strong></div>
          <b>−</b>
          <div><span>Sacola + etiqueta</span><strong>R$ 1,50</strong></div>
          <b>=</b>
          <div className={styles.heroResult}><span>Margem real</span><strong>R$ 38,50</strong></div>
        </div>
      </section>

      {message && (
        <div className={`${styles.message} ${success ? styles.success : ""}`}>
          {success ? <CheckCircle2 size={17} /> : <CircleHelp size={17} />}
          <span>{message}</span>
        </div>
      )}

      {!setupComplete && (
        <section className={styles.setupPanel}>
          <div className={styles.setupIntro}>
            <span className={styles.eyebrow}>Primeira configuração</span>
            <h3>Faça isso uma vez. Depois o sistema trabalha sozinho.</h3>
            <p>Não precisa preencher tudo hoje. Comece pela sacola e pela etiqueta que você já usa.</p>
          </div>
          <div className={styles.setupSteps}>
            <button className={`${styles.setupStep} ${snapshot.supplies.length > 0 ? styles.setupDone : styles.setupCurrent}`} type="button" onClick={() => setTab("overview")}>
              <span>{snapshot.supplies.length > 0 ? <CheckCircle2 size={18}/> : "1"}</span>
              <div><strong>Cadastrar materiais</strong><small>{snapshot.supplies.length > 0 ? `${snapshot.supplies.length} material(is) cadastrado(s)` : "Sacola, etiqueta, cartão..."}</small></div>
              <ArrowRight size={17}/>
            </button>
            <button className={`${styles.setupStep} ${configuredProfiles > 0 ? styles.setupDone : snapshot.supplies.length > 0 ? styles.setupCurrent : ""}`} type="button" onClick={() => setTab("profiles")}>
              <span>{configuredProfiles > 0 ? <CheckCircle2 size={18}/> : "2"}</span>
              <div><strong>Dizer quando usa</strong><small>{configuredProfiles > 0 ? `${configuredProfiles} receita(s) configurada(s)` : "Ex.: 1 sacola por venda"}</small></div>
              <ArrowRight size={17}/>
            </button>
            <button className={`${styles.setupStep} ${snapshot.recent_sales.length > 0 ? styles.setupDone : ""}`} type="button" onClick={() => setTab("results")}>
              <span>{snapshot.recent_sales.length > 0 ? <CheckCircle2 size={18}/> : "3"}</span>
              <div><strong>Acompanhar o resultado</strong><small>Aparece após uma venda entregue</small></div>
              <ArrowRight size={17}/>
            </button>
          </div>
        </section>
      )}

      <nav className={styles.tabs} aria-label="Etapas dos custos operacionais">
        {tabItems.map(({ value, step, label, description, icon: Icon }) => (
          <button className={`${styles.tab} ${tab === value ? styles.tabActive : ""}`} key={value} type="button" onClick={() => setTab(value)}>
            <span className={styles.tabStep}>{step}</span>
            <Icon size={17} />
            <span><strong>{label}</strong><small>{description}</small></span>
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          {snapshot.supplies.length > 0 && (
            <div className={styles.grid}>
              <div className={styles.stat}><span>Materiais cadastrados</span><strong>{snapshot.summary.active_supplies}</strong><small>ativos no controle</small></div>
              <div className={styles.stat}><span>Valor guardado</span><strong>{formatCurrency(snapshot.summary.stock_value)}</strong><small>patrimônio em materiais</small></div>
              <div className={`${styles.stat} ${snapshot.summary.low_stock > 0 ? styles.statAttention : ""}`}><span>Precisam comprar</span><strong>{snapshot.summary.low_stock}</strong><small>no mínimo ou abaixo</small></div>
              <div className={styles.stat}><span>Usado nas vendas</span><strong>{formatCurrency(snapshot.summary.operational_cost_this_month)}</strong><small>neste mês</small></div>
            </div>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Etapa 1</span>
                <h2>Materiais usados para entregar os pedidos</h2>
                <p>Aqui entram sacolas, etiquetas, cartões, lacres, potes, rótulos e outros materiais que têm custo.</p>
              </div>
              {snapshot.supplies.length > 0 && (
                <button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={() => setShowSupplyForm((current) => !current)}>
                  <Plus size={16}/> Novo material
                </button>
              )}
            </div>
            <div className={styles.panelBody}>
              {snapshot.supplies.length === 0 && !showSupplyForm && (
                <div className={styles.firstStep}>
                  <div className={styles.firstStepCopy}>
                    <Lightbulb size={24}/>
                    <h3>Por onde começar?</h3>
                    <p>Escolha uma sugestão. Você só precisa informar quantas unidades possui e quanto pagou no total.</p>
                  </div>
                  <div className={styles.suggestionGrid}>
                    {supplySuggestions.map(({ title, description, icon: Icon, draft }) => (
                      <button className={styles.suggestionCard} type="button" key={title} onClick={() => chooseSupplySuggestion(draft)}>
                        <span><Icon size={20}/></span>
                        <div><strong>{title}</strong><small>{description}</small></div>
                        <ArrowRight size={17}/>
                      </button>
                    ))}
                    <button className={`${styles.suggestionCard} ${styles.suggestionCustom}`} type="button" onClick={() => chooseSupplySuggestion(emptySupplyDraft)}>
                      <span><Plus size={20}/></span>
                      <div><strong>Outro material</strong><small>Cadastrar algo diferente das sugestões.</small></div>
                      <ArrowRight size={17}/>
                    </button>
                  </div>
                </div>
              )}

              {showSupplyForm && renderSupplyForm()}

              {snapshot.supplies.length > 0 && (
                <>
                  {showSupplyForm && <div className={styles.formDivider}/>}
                  <div className={styles.cards}>
                    {snapshot.supplies.map((supply) => <SupplyCard key={supply.id} supply={supply} saving={saving} onCount={countSupply}/>)}
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "purchase" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.eyebrow}>Etapa 2</span><h2>Registrar uma nova compra</h2><p>Informe a quantidade e o valor total. O custo médio é recalculado automaticamente.</p></div>
            <ReceiptText size={22}/>
          </div>
          <div className={styles.panelBody}>
            {snapshot.supplies.length === 0 ? (
              <div className={styles.blockedState}><Boxes size={30}/><h3>Primeiro cadastre um material</h3><p>Depois você poderá registrar as reposições e acompanhar o custo médio.</p><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={() => setTab("overview")}>Cadastrar material <ArrowRight size={16}/></button></div>
            ) : (
              <form className={styles.guidedForm} onSubmit={receiveSupply}>
                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.wide}`}><span>O que você comprou?</span><select className={styles.select} name="supply_id" required><option value="">Selecione o material</option>{snapshot.supplies.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name} · saldo atual {row.quantity_on_hand} {row.unit_name}</option>)}</select></label>
                  <label className={styles.field}><span>Quantidade recebida</span><input className={styles.input} name="quantity" type="number" min="0.001" step="0.001" required placeholder="Ex.: 100"/></label>
                  <label className={styles.field}><span>Valor total da compra</span><input className={styles.input} name="total_cost" type="number" min="0" step="0.01" required placeholder="Ex.: 100,00"/></label>
                  <label className={styles.field}><span>Data</span><input className={styles.input} name="received_on" type="date" defaultValue={todayBrazil()} required/></label>
                  <label className={styles.field}><span>Fornecedor opcional</span><input className={styles.input} name="supplier_name" placeholder="Ex.: Embalagens Carangola"/></label>
                </div>
                <div className={styles.bankChoice}>
                  <div><CircleDollarSign size={20}/><strong>Essa compra deve aparecer no Bank?</strong><small>Escolha a situação financeira da compra.</small></div>
                  <label className={styles.field}><span>Situação</span><select className={styles.select} name="financial_status" defaultValue="not_informed"><option value="not_informed">Não lançar agora</option><option value="paid">Já foi pago</option><option value="payable">Ficou a pagar</option></select></label>
                  <label className={styles.field}><span>Vencimento, se ficou a pagar</span><input className={styles.input} name="due_on" type="date"/></label>
                  <label className={styles.field}><span>Conta, se já foi pago</span><select className={styles.select} name="payment_account_id"><option value="">Não informar</option>{accounts.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
                </div>
                <label className={styles.field}><span>Observação opcional</span><textarea className={styles.textarea} name="notes" placeholder="Número do pedido, condição, detalhe do material..."/></label>
                <div className={styles.explanation}><Lightbulb size={18}/><div><strong>O dinheiro sai agora, mas o custo da venda só aparece quando o material é usado.</strong><span>Assim o sistema não desconta a mesma compra duas vezes.</span></div></div>
                <div className={styles.formFooter}><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<PackagePlus size={16}/>} Registrar compra</button></div>
              </form>
            )}
            {snapshot.recent_receipts.length>0&&<div className={styles.historyBlock}><h3>Compras recentes</h3><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Data</th><th>Material</th><th>Quantidade</th><th>Total</th><th>Custo por unidade</th><th>Bank</th></tr></thead><tbody>{snapshot.recent_receipts.map(row=><tr key={row.id}><td>{formatDateOnly(row.received_on)}</td><td><strong>{row.supply_name}</strong><br/><small>{row.supplier_name??"Sem fornecedor"}</small></td><td>{row.quantity} {row.unit_name}</td><td>{formatCurrency(row.total_cost)}</td><td>{formatCurrency(row.unit_cost)}</td><td>{row.financial_status==="paid"?"Pago":row.financial_status==="payable"?"A pagar":"Não lançado"}</td></tr>)}</tbody></table></div></div>}
          </div>
        </section>
      )}

      {tab === "profiles" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>Etapa 3</span><h2>O que cada tipo de venda utiliza?</h2><p>Monte uma receita simples. Exemplo: uma venda normal usa 1 sacola; cada produto vendido usa 1 etiqueta.</p></div><Settings2 size={22}/></div>
          <div className={styles.panelBody}>
            {snapshot.supplies.length===0 ? (
              <div className={styles.blockedState}><Settings2 size={30}/><h3>Cadastre os materiais primeiro</h3><p>Sem materiais, ainda não existe nada para vincular às vendas.</p><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={()=>setTab("overview")}>Ir para materiais <ArrowRight size={16}/></button></div>
            ) : snapshot.profiles.length===0 ? <div className={styles.empty}>Nenhum tipo de venda disponível.</div> : <>
              <div className={styles.profileChooser}>
                {snapshot.profiles.map((profile) => (
                  <button className={`${styles.profileChoice} ${profile.id===profileId?styles.profileChoiceActive:""}`} key={profile.id} type="button" onClick={()=>selectProfile(profile)}>
                    <span>{profile.operation_scope==="supplements"?"SUP":"FIT"}</span>
                    <div><strong>{profile.name}</strong><small>{profile.items.length ? `${profile.items.length} material(is) configurado(s)` : "Ainda não configurado"}</small></div>
                    {profile.items.length>0&&<CheckCircle2 size={17}/>}
                  </button>
                ))}
              </div>
              <div className={styles.recipeEditor}>
                <div className={styles.recipeHeader}><div><strong>{profileName}</strong><small>{selectedProfile?.channel==="partner"?"Venda registrada com parceiro":selectedProfile?.channel==="consignment"?"Venda proveniente de consignação":"Venda direta ao cliente"}</small></div><span className={styles.badge}>{scopeLabel(selectedProfile?.operation_scope??initialOperation)}</span></div>
                <label className={styles.field}><span>Observação do tipo de venda</span><input className={styles.input} value={profileNotes} onChange={event=>setProfileNotes(event.target.value)} placeholder="Ex.: retirar sacola quando o cliente levar somente um item pequeno"/></label>
                <div className={styles.usageLegend}>
                  <div><strong>Por venda</strong><small>Usa uma vez no pedido. Ex.: sacola.</small></div>
                  <div><strong>Por produto diferente</strong><small>Usa uma vez por linha. Ex.: cartão de instrução.</small></div>
                  <div><strong>Por unidade vendida</strong><small>Multiplica pela quantidade. Ex.: etiqueta.</small></div>
                </div>
                <div className={styles.profileItems}>{profileRows.map((row,index)=><div className={styles.profileRow} key={`${index}-${row.supply_id}`}><label className={styles.field}><span>Material</span><select className={styles.select} value={row.supply_id} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,supply_id:event.target.value}:item))}><option value="">Selecione</option>{compatibleSupplies.map(supply=><option key={supply.id} value={supply.id}>{supply.name} · {formatCurrency(supply.average_unit_cost)}/{supply.unit_name}</option>)}</select></label><label className={styles.field}><span>Quando usar?</span><select className={styles.select} value={row.usage_basis} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,usage_basis:event.target.value as ProfileItem["usage_basis"]}:item))}><option value="per_sale">Uma vez por venda</option><option value="per_line">Por produto diferente</option><option value="per_unit">Por unidade vendida</option></select></label><label className={styles.field}><span>Quantidade</span><input className={styles.input} type="number" min="0.001" step="0.001" value={row.quantity} onChange={event=>setProfileRows(current=>current.map((item,i)=>i===index?{...item,quantity:numberValue(event.target.value)}:item))}/></label><button className={`${styles.iconDanger}`} type="button" aria-label="Remover material" onClick={()=>setProfileRows(current=>current.filter((_,i)=>i!==index))}><Trash2 size={17}/></button></div>)}</div>
                {profileRows.length===0&&<div className={styles.recipeEmpty}><Lightbulb size={20}/><div><strong>Exemplo recomendado</strong><span>Adicione “Sacola Suplementos” como uma vez por venda e “Etiqueta” por unidade vendida.</span></div></div>}
                <div className={styles.formFooter}><button className={styles.button} type="button" onClick={()=>setProfileRows(current=>[...current,{supply_id:"",usage_basis:"per_sale",quantity:1}])}><Plus size={15}/> Adicionar material</button><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={saveProfile} disabled={saving}><Save size={15}/> Salvar uso por venda</button></div>
                <div className={styles.costPreviewLine}><span>Custo estimado em uma venda com 1 produto</span><strong>{formatCurrency(selectedProfile?.estimated_one_item_cost??0)}</strong></div>
              </div>
            </>}
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>Etapa 4 · Opcional</span><h2>Custos que existem somente em alguns produtos</h2><p>Use para pote, lacre, rótulo ou embalagem exclusiva. A maioria dos produtos não precisa desta etapa.</p></div><Calculator size={22}/></div>
          <div className={styles.panelBody}>
            {snapshot.supplies.length===0 ? <div className={styles.blockedState}><Calculator size={30}/><h3>Cadastre os materiais primeiro</h3><p>Depois vincule materiais exclusivos aos produtos que realmente os utilizam.</p><button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={()=>setTab("overview")}>Ir para materiais <ArrowRight size={16}/></button></div> : <>
              <div className={styles.optionalNote}><Lightbulb size={18}/><div><strong>Use apenas quando for uma exceção.</strong><span>Sacola e etiqueta comuns devem ficar em “Uso por venda”, não aqui.</span></div></div>
              <form className={styles.guidedForm} onSubmit={saveRequirement}>
                <div className={styles.formGrid}>
                  <label className={styles.field}><span>Operação</span><select className={styles.select} value={requirementOperation} onChange={event=>{const operation=event.target.value as BusinessOperation;setRequirementOperation(operation);setRequirementProductId("");setPreview(null)}}><option value="supplements">Suplementos</option><option value="fitness">Fitness</option></select></label>
                  <label className={styles.field}><span>Produto</span><select className={styles.select} name="product_id" required value={requirementProductId} onChange={event=>void loadPreview(requirementOperation,event.target.value)}><option value="">Selecione o produto</option>{requirementProducts.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
                  <label className={styles.field}><span>Material exclusivo</span><select className={styles.select} name="supply_id" required><option value="">Selecione o material</option>{requirementSupplies.map(row=><option key={row.id} value={row.id}>{row.name} · {formatCurrency(row.average_unit_cost)}</option>)}</select></label>
                  <label className={styles.field}><span>Quantidade usada por unidade</span><input className={styles.input} name="quantity_per_unit" type="number" min="0.001" step="0.001" defaultValue="1" required/></label>
                  <label className={`${styles.field} ${styles.wide}`}><span>Observação opcional</span><input className={styles.input} name="notes" placeholder="Ex.: 1 rótulo exclusivo por pote"/></label>
                </div>
                {preview&&<div className={styles.preview}><div><span>Custo do produto</span><strong>{formatCurrency(preview.acquisition_cost)}</strong></div><div><span>Materiais padrão</span><strong>{formatCurrency(preview.default_operational_cost)}</strong></div><div><span>Materiais exclusivos</span><strong>{formatCurrency(preview.product_specific_cost)}</strong></div><div className={styles.previewHighlight}><span>Margem estimada</span><strong className={preview.estimated_contribution_margin>=0?styles.positive:styles.negativeText}>{formatCurrency(preview.estimated_contribution_margin)}</strong></div></div>}
                <div className={styles.formFooter}><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={saving}><Plus size={15}/> Adicionar ao produto</button></div>
              </form>
              <div className={styles.historyBlock}><h3>Custos exclusivos configurados</h3><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Operação</th><th>Produto</th><th>Material</th><th>Uso por unidade</th><th>Custo adicional</th><th/></tr></thead><tbody>{snapshot.requirements.map(row=><tr key={row.id}><td>{scopeLabel(row.operation_scope)}</td><td><strong>{row.product_name}</strong></td><td>{row.supply_name}</td><td>{row.quantity_per_unit} {row.unit_name}</td><td>{formatCurrency(row.cost_per_product_unit)}</td><td><button className={styles.iconDanger} type="button" aria-label="Remover custo" onClick={()=>void removeRequirement(row.id)} disabled={saving}><Trash2 size={16}/></button></td></tr>)}{snapshot.requirements.length===0&&<tr><td colSpan={6}>Nenhuma exceção configurada. Isso é normal para a maioria dos produtos.</td></tr>}</tbody></table></div></div>
            </>}
          </div>
        </section>
      )}

      {tab === "results" && (
        <>
          <div className={styles.grid}><div className={styles.stat}><span>Vendas com custo completo</span><strong>{snapshot.summary.costed_sales_this_month}</strong><small>neste mês</small></div><div className={styles.stat}><span>Materiais utilizados</span><strong>{formatCurrency(snapshot.summary.operational_cost_this_month)}</strong><small>reconhecidos nas entregas</small></div><div className={styles.stat}><span>Margem de contribuição</span><strong>{formatCurrency(snapshot.summary.contribution_margin_this_month)}</strong><small>após produto e materiais</small></div><div className={`${styles.stat} ${snapshot.summary.negative_stock>0?styles.statAttention:""}`}><span>Saldo negativo</span><strong>{snapshot.summary.negative_stock}</strong><small>material(is) para conferir</small></div></div>
          <section className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>Etapa 5</span><h2>Quanto realmente sobrou nas vendas?</h2><p>O cálculo considera o custo da mercadoria e os materiais usados no momento da entrega.</p></div></div><div className={styles.panelBody}>
            {snapshot.recent_sales.length===0 ? <div className={styles.resultsEmpty}><TrendingUp size={34}/><h3>O resultado aparecerá depois da primeira venda entregue</h3><p>Configure “Uso por venda”. Quando uma nova venda for entregue, o custo será congelado automaticamente.</p>{configuredProfiles>0?<div className={styles.pendingActions}><span>Já configurou agora?</span><button className={styles.button} type="button" disabled={saving} onClick={()=>void processPending("supplements")}>Processar vendas pendentes</button></div>:<button className={`${styles.button} ${styles.buttonPrimary}`} type="button" onClick={()=>setTab("profiles")}>Configurar uso por venda <ArrowRight size={16}/></button>}</div> : <>
              <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Entrega</th><th>Operação / cliente</th><th>Venda</th><th>Custo do produto</th><th>Lucro bruto</th><th>Materiais</th><th>Margem real</th></tr></thead><tbody>{snapshot.recent_sales.map(row=><tr key={row.snapshot_id}><td>{row.delivered_on?formatDateOnly(row.delivered_on):"—"}</td><td><strong>{scopeLabel(row.operation_scope)}</strong><br/><small>{row.customer_name}</small></td><td>{formatCurrency(row.revenue_total)}</td><td>{formatCurrency(row.merchandise_cost_total)}</td><td>{formatCurrency(row.gross_profit)}</td><td className={row.negative_supply_count>0?styles.negativeText:""}>{formatCurrency(row.operational_cost_total)}{row.negative_supply_count>0?" ⚠":""}</td><td className={row.contribution_margin>=0?styles.positive:styles.negativeText}><strong>{formatCurrency(row.contribution_margin)}</strong></td></tr>)}</tbody></table></div>
              <div className={styles.pendingActions}><span>Configurou novos materiais agora?</span><button className={styles.button} type="button" disabled={saving} onClick={()=>void processPending("supplements")}>Processar Suplementos</button><button className={styles.button} type="button" disabled={saving} onClick={()=>void processPending("fitness")}>Processar Fitness</button></div>
            </>}
          </div></section>
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
