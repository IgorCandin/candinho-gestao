"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Edit3,
  LoaderCircle,
  PackageCheck,
  Save,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import styles from "./operational-supplies-admin.module.css";

type OperationScope = "shared" | "supplements" | "fitness";
type UsageStage =
  | "inventory_receipt"
  | "sale_delivery_manual"
  | "sale_delivery_auto";
type SuggestionMode = "none" | "per_sale" | "capacity";

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
  notes: string | null;
  stock_value: number;
  stock_status: "healthy" | "low" | "negative" | "inactive";
  usage_stage: UsageStage;
  receipt_quantity_per_product_unit: number;
  delivery_suggestion_mode: SuggestionMode;
  delivery_default_quantity: number;
  delivery_capacity_product_units: number | null;
};

type SettingsDraft = {
  name: string;
  operation_scope: OperationScope;
  unit_name: string;
  min_quantity: string;
  usage_stage: UsageStage;
  receipt_quantity_per_product_unit: string;
  delivery_suggestion_mode: SuggestionMode;
  delivery_default_quantity: string;
  delivery_capacity_product_units: string;
  active: boolean;
  notes: string;
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scopeLabel(scope: OperationScope) {
  if (scope === "supplements") return "Suplementos";
  if (scope === "fitness") return "Fitness";
  return "Compartilhado";
}

function stageLabel(stage: UsageStage) {
  if (stage === "inventory_receipt") return "Quando o produto chega";
  if (stage === "sale_delivery_auto") return "Automático na entrega";
  return "Escolher na entrega";
}

function toDraft(supply: Supply): SettingsDraft {
  return {
    name: supply.name,
    operation_scope: supply.operation_scope,
    unit_name: supply.unit_name,
    min_quantity: String(supply.min_quantity),
    usage_stage: supply.usage_stage,
    receipt_quantity_per_product_unit: String(
      supply.receipt_quantity_per_product_unit,
    ),
    delivery_suggestion_mode: supply.delivery_suggestion_mode,
    delivery_default_quantity: String(supply.delivery_default_quantity),
    delivery_capacity_product_units:
      supply.delivery_capacity_product_units == null
        ? ""
        : String(supply.delivery_capacity_product_units),
    active: supply.active,
    notes: supply.notes ?? "",
  };
}

export function OperationalSuppliesAdmin({
  initialOperation = "supplements",
}: {
  initialOperation?: "supplements" | "fitness";
}) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [quantityCorrection, setQuantityCorrection] = useState("");
  const [costCorrection, setCostCorrection] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => supplies.find((item) => item.id === selectedId) ?? null,
    [selectedId, supplies],
  );

  async function load(preferredId?: string) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("operational_supplies_overview")
        .select(
          "id,operation_scope,name,sku,unit_name,quantity_on_hand,average_unit_cost,min_quantity,active,notes,stock_value,stock_status,usage_stage,receipt_quantity_per_product_unit,delivery_suggestion_mode,delivery_default_quantity,delivery_capacity_product_units",
        )
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      const mapped = ((data ?? []) as Array<Record<string, unknown>>).map(
        (row) => ({
          ...row,
          quantity_on_hand: n(row.quantity_on_hand),
          average_unit_cost: n(row.average_unit_cost),
          min_quantity: n(row.min_quantity),
          stock_value: n(row.stock_value),
          receipt_quantity_per_product_unit: n(
            row.receipt_quantity_per_product_unit,
          ),
          delivery_default_quantity: n(row.delivery_default_quantity),
          delivery_capacity_product_units:
            row.delivery_capacity_product_units == null
              ? null
              : n(row.delivery_capacity_product_units),
        }),
      ) as Supply[];
      setSupplies(mapped);
      const nextId =
        preferredId && mapped.some((item) => item.id === preferredId)
          ? preferredId
          : selectedId && mapped.some((item) => item.id === selectedId)
            ? selectedId
            : mapped.find(
                (item) =>
                  item.active &&
                  (item.operation_scope === initialOperation ||
                    item.operation_scope === "shared"),
              )?.id ?? mapped[0]?.id ?? "";
      setSelectedId(nextId);
      const next = mapped.find((item) => item.id === nextId) ?? null;
      if (next) {
        setDraft(toDraft(next));
        setQuantityCorrection(String(next.quantity_on_hand));
        setCostCorrection(String(next.average_unit_cost));
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os materiais.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(item: Supply) {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setQuantityCorrection(String(item.quantity_on_hand));
    setCostCorrection(String(item.average_unit_cost));
    setCorrectionReason("");
    setMessage(null);
  }

  function applyPreset(stage: UsageStage) {
    setDraft((current) => {
      if (!current) return current;
      if (stage === "inventory_receipt") {
        return {
          ...current,
          usage_stage: stage,
          receipt_quantity_per_product_unit:
            n(current.receipt_quantity_per_product_unit) > 0
              ? current.receipt_quantity_per_product_unit
              : "1",
          delivery_suggestion_mode: "none",
          delivery_default_quantity: "0",
          delivery_capacity_product_units: "",
        };
      }
      return {
        ...current,
        usage_stage: stage,
        receipt_quantity_per_product_unit: "0",
        delivery_suggestion_mode:
          stage === "sale_delivery_manual" ? "none" : "per_sale",
        delivery_default_quantity: "1",
        delivery_capacity_product_units: "",
      };
    });
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc(
        "update_operational_supply_settings",
        {
          p_supply_id: selected.id,
          p_name: draft.name,
          p_operation_scope: draft.operation_scope,
          p_unit_name: draft.unit_name,
          p_min_quantity: n(draft.min_quantity),
          p_usage_stage: draft.usage_stage,
          p_receipt_quantity_per_product_unit: n(
            draft.receipt_quantity_per_product_unit,
          ),
          p_delivery_suggestion_mode: draft.delivery_suggestion_mode,
          p_delivery_default_quantity: n(draft.delivery_default_quantity),
          p_delivery_capacity_product_units:
            draft.delivery_capacity_product_units.trim() === ""
              ? null
              : n(draft.delivery_capacity_product_units),
          p_active: draft.active,
          p_notes: draft.notes.trim() || null,
        },
      );
      if (error) throw error;
      await load(selected.id);
      setMessage("Material atualizado. A regra vale apenas para os próximos movimentos.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível atualizar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function correctValues(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc(
        "correct_operational_supply",
        {
          p_supply_id: selected.id,
          p_quantity_on_hand: n(quantityCorrection),
          p_average_unit_cost: n(costCorrection),
          p_reason: correctionReason,
        },
      );
      if (error) throw error;
      await load(selected.id);
      setCorrectionReason("");
      setMessage("Saldo e custo corrigidos com registro de auditoria.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível corrigir o material.",
      );
    } finally {
      setSaving(false);
    }
  }

  const visible = supplies.filter(
    (item) =>
      item.operation_scope === "shared" || item.operation_scope === initialOperation,
  );

  return (
    <section className={styles.shell}>
      <div className={styles.explainer}>
        <div>
          <Tag size={20} />
          <strong>Etiqueta</strong>
          <span>
            É usada quando o produto chega. Sai do estoque de etiquetas e entra no
            custo médio do produto.
          </span>
        </div>
        <div>
          <ShoppingBag size={20} />
          <strong>Sacola e cartão</strong>
          <span>
            Você informa a quantidade na entrega. Pode ser zero, uma ou várias por
            pedido.
          </span>
        </div>
        <div>
          <PackageCheck size={20} />
          <strong>Venda antiga</strong>
          <span>
            Não será recalculada. A nova lógica começa nos próximos recebimentos e
            entregas.
          </span>
        </div>
      </div>

      {message && (
        <div className={styles.message}>
          <CircleAlert size={16} /> {message}
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.listPanel}>
          <div className={styles.listHead}>
            <div>
              <span>Materiais cadastrados</span>
              <strong>{visible.length}</strong>
            </div>
            <small>Clique em um material para corrigir ou definir sua regra.</small>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <LoaderCircle className="spin" size={20} /> Carregando
            </div>
          ) : (
            <div className={styles.materialList}>
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.materialCard} ${
                    item.id === selectedId ? styles.selected : ""
                  }`}
                  onClick={() => choose(item)}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {scopeLabel(item.operation_scope)} · {stageLabel(item.usage_stage)}
                    </span>
                  </div>
                  <div className={styles.materialNumbers}>
                    <b>{item.quantity_on_hand}</b>
                    <small>{formatCurrency(item.average_unit_cost)} / {item.unit_name}</small>
                  </div>
                  {!item.active && <span className={styles.inactive}>Inativo</span>}
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className={styles.editor}>
          {!selected || !draft ? (
            <div className={styles.empty}>Selecione um material para editar.</div>
          ) : (
            <>
              <form className={styles.panel} onSubmit={saveSettings}>
                <div className={styles.panelHead}>
                  <div>
                    <span>Cadastro e regra</span>
                    <h2>{selected.name}</h2>
                    <p>
                      Alterar esta regra não mexe nas vendas antigas. Ela passa a valer
                      para os próximos movimentos.
                    </p>
                  </div>
                  <Edit3 size={20} />
                </div>

                <div className={styles.presets}>
                  <button type="button" onClick={() => applyPreset("inventory_receipt")}>
                    <Tag size={16} /> É etiqueta / uso quando produto chega
                  </button>
                  <button type="button" onClick={() => applyPreset("sale_delivery_manual")}>
                    <ShoppingBag size={16} /> É sacola/cartão / escolher na entrega
                  </button>
                </div>

                <div className={styles.grid}>
                  <label className={styles.wide}>
                    <span>Nome</span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Operação</span>
                    <select
                      value={draft.operation_scope}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          operation_scope: event.target.value as OperationScope,
                        })
                      }
                    >
                      <option value="shared">Compartilhado</option>
                      <option value="supplements">Suplementos</option>
                      <option value="fitness">Fitness</option>
                    </select>
                  </label>
                  <label>
                    <span>Unidade</span>
                    <select
                      value={draft.unit_name}
                      onChange={(event) =>
                        setDraft({ ...draft, unit_name: event.target.value })
                      }
                    >
                      <option value="unidade">Unidade</option>
                      <option value="pacote">Pacote</option>
                      <option value="rolo">Rolo</option>
                      <option value="folha">Folha</option>
                      <option value="metro">Metro</option>
                    </select>
                  </label>
                  <label>
                    <span>Estoque mínimo</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={draft.min_quantity}
                      onChange={(event) =>
                        setDraft({ ...draft, min_quantity: event.target.value })
                      }
                    />
                  </label>
                  <label className={styles.wide}>
                    <span>Quando esse material é consumido?</span>
                    <select
                      value={draft.usage_stage}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          usage_stage: event.target.value as UsageStage,
                        })
                      }
                    >
                      <option value="inventory_receipt">
                        Quando um produto novo entra no estoque
                      </option>
                      <option value="sale_delivery_manual">
                        Na entrega — eu escolho a quantidade
                      </option>
                      <option value="sale_delivery_auto">
                        Na entrega — automático em toda venda
                      </option>
                    </select>
                  </label>
                </div>

                {draft.usage_stage === "inventory_receipt" && (
                  <div className={styles.ruleBox}>
                    <Tag size={18} />
                    <div>
                      <strong>Material de entrada do produto</strong>
                      <p>
                        Ex.: etiqueta. Se entrarem 20 suplementos e a regra for 1,
                        serão baixadas 20 etiquetas e o custo de cada uma entra no
                        custo médio dos produtos recebidos.
                      </p>
                    </div>
                    <label>
                      <span>Quantidade por produto recebido</span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={draft.receipt_quantity_per_product_unit}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            receipt_quantity_per_product_unit: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                )}

                {draft.usage_stage === "sale_delivery_manual" && (
                  <div className={styles.ruleBox}>
                    <ShoppingBag size={18} />
                    <div>
                      <strong>Material escolhido na entrega</strong>
                      <p>
                        Ideal para sacola e cartão. Ao marcar a venda como entregue,
                        você decide se usou zero, uma ou várias unidades.
                      </p>
                    </div>
                    <label>
                      <span>Sugestão automática</span>
                      <select
                        value={draft.delivery_suggestion_mode}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            delivery_suggestion_mode:
                              event.target.value as SuggestionMode,
                          })
                        }
                      >
                        <option value="none">Não sugerir quantidade</option>
                        <option value="per_sale">Sugerir uma quantidade por pedido</option>
                        <option value="capacity">Sugerir pela quantidade de produtos</option>
                      </select>
                    </label>
                    {draft.delivery_suggestion_mode !== "none" && (
                      <label>
                        <span>Quantidade base</span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={draft.delivery_default_quantity}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              delivery_default_quantity: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {draft.delivery_suggestion_mode === "capacity" && (
                      <label>
                        <span>Quantos produtos cabem em 1?</span>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={draft.delivery_capacity_product_units}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              delivery_capacity_product_units:
                                event.target.value,
                            })
                          }
                          placeholder="Ex.: 2"
                        />
                      </label>
                    )}
                  </div>
                )}

                <label className={styles.notes}>
                  <span>Observação</span>
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft({ ...draft, notes: event.target.value })
                    }
                    placeholder="Ex.: sacola personalizada pequena"
                  />
                </label>

                <div className={styles.footerActions}>
                  <label className={styles.activeToggle}>
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(event) =>
                        setDraft({ ...draft, active: event.target.checked })
                      }
                    />
                    {draft.active ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                    {draft.active ? "Material ativo" : "Material arquivado"}
                  </label>
                  <button className="button gold" disabled={saving} type="submit">
                    {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                    Salvar cadastro
                  </button>
                </div>
              </form>

              <form className={`${styles.panel} ${styles.correction}`} onSubmit={correctValues}>
                <div className={styles.panelHead}>
                  <div>
                    <span>Correção auditada</span>
                    <h2>Preenchi errado</h2>
                    <p>
                      Use esta área para corrigir o saldo ou o custo médio que foi
                      informado por engano. O motivo fica registrado.
                    </p>
                  </div>
                  <CircleAlert size={20} />
                </div>
                <div className={styles.grid}>
                  <label>
                    <span>Quantidade correta agora</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={quantityCorrection}
                      onChange={(event) => setQuantityCorrection(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Custo médio correto por unidade</span>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={costCorrection}
                      onChange={(event) => setCostCorrection(event.target.value)}
                    />
                  </label>
                  <label className={styles.wide}>
                    <span>Por que está corrigindo?</span>
                    <input
                      value={correctionReason}
                      onChange={(event) => setCorrectionReason(event.target.value)}
                      placeholder="Ex.: cadastrei R$ 1,16, mas o custo correto era R$ 0,89"
                      required
                    />
                  </label>
                </div>
                <div className={styles.correctionSummary}>
                  <span>Valor atual guardado</span>
                  <strong>{formatCurrency(selected.stock_value)}</strong>
                  <span>Após a correção</span>
                  <strong>
                    {formatCurrency(n(quantityCorrection) * n(costCorrection))}
                  </strong>
                </div>
                <div className={styles.footerActions}>
                  <span />
                  <button className="button ghost" disabled={saving} type="submit">
                    Corrigir saldo e custo
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
