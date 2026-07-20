import Link from "next/link";
import {
  ArrowLeft,
  PackageSearch,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import {
  LotInventoryManager,
  type LotDashboardSnapshot,
} from "@/components/lot-inventory-manager";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

function number(value: unknown) {
  return Number(value ?? 0);
}

function nullableString(value: unknown) {
  return typeof value === "string"
    ? value
    : null;
}

function normalizeSnapshot(
  source: Record<string, unknown>,
): LotDashboardSnapshot {
  const summary =
    source.summary &&
    typeof source.summary === "object"
      ? (source.summary as Record<string, unknown>)
      : {};

  const lotRows = Array.isArray(source.lots)
    ? source.lots
    : [];

  const coverageRows = Array.isArray(
    source.coverage,
  )
    ? source.coverage
    : [];

  const productRows = Array.isArray(
    source.products,
  )
    ? source.products
    : [];

  const traceRows = Array.isArray(
    source.recent_trace,
  )
    ? source.recent_trace
    : [];

  return {
    generated_at:
      typeof source.generated_at === "string"
        ? source.generated_at
        : null,

    summary: {
      tracking_products: number(
        summary.tracking_products,
      ),
      active_lots: number(
        summary.active_lots,
      ),
      tracked_units: number(
        summary.tracked_units,
      ),
      expired_units: number(
        summary.expired_units,
      ),
      expires_30_units: number(
        summary.expires_30_units,
      ),
      expires_60_units: number(
        summary.expires_60_units,
      ),
      expires_90_units: number(
        summary.expires_90_units,
      ),
      quarantined_units: number(
        summary.quarantined_units,
      ),
      untracked_units: number(
        summary.untracked_units,
      ),
      tracking_mismatches: number(
        summary.tracking_mismatches,
      ),
    },

    lots: lotRows.map((value) => {
      const row =
        value as Record<string, unknown>;

      return {
        id: String(row.id ?? ""),
        product_id: String(
          row.product_id ?? "",
        ),
        product_name: String(
          row.product_name ?? "Produto",
        ),
        category: String(
          row.category ?? "",
        ),
        brand: nullableString(row.brand),
        flavor_id:
          nullableString(row.flavor_id),
        flavor_name:
          nullableString(row.flavor_name),
        location_id: String(
          row.location_id ?? "",
        ),
        location_code: String(
          row.location_code ?? "",
        ),
        location_name: String(
          row.location_name ?? "",
        ),
        lot_number: String(
          row.lot_number ?? "",
        ),
        expires_on:
          nullableString(row.expires_on),
        received_on:
          nullableString(row.received_on),
        unit_cost:
          row.unit_cost === null ||
          row.unit_cost === undefined
            ? null
            : Number(row.unit_cost),
        supplier_id:
          nullableString(row.supplier_id),
        supplier_name:
          nullableString(row.supplier_name),
        quantity_on_hand: number(
          row.quantity_on_hand,
        ),
        status: String(
          row.status ?? "active",
        ),
        notes:
          nullableString(row.notes),
        expiry_status: String(
          row.expiry_status ?? "ok",
        ),
        days_to_expiry:
          row.days_to_expiry === null ||
          row.days_to_expiry === undefined
            ? null
            : Number(row.days_to_expiry),
        created_at: String(
          row.created_at ?? "",
        ),
        updated_at: String(
          row.updated_at ?? "",
        ),
      };
    }),

    coverage: coverageRows.map(
      (value) => {
        const row =
          value as Record<string, unknown>;

        return {
          product_id: String(
            row.product_id ?? "",
          ),
          product_name: String(
            row.product_name ?? "Produto",
          ),
          flavor_id:
            nullableString(row.flavor_id),
          flavor_name:
            nullableString(row.flavor_name),
          location_id: String(
            row.location_id ?? "",
          ),
          location_code: String(
            row.location_code ?? "",
          ),
          location_name: String(
            row.location_name ?? "",
          ),
          physical_quantity: number(
            row.physical_quantity,
          ),
          tracked_quantity: number(
            row.tracked_quantity,
          ),
          untracked_quantity: number(
            row.untracked_quantity,
          ),
          tracking_difference: number(
            row.tracking_difference,
          ),
          tracking_status: String(
            row.tracking_status ?? "empty",
          ),
        };
      },
    ),

    products: productRows.map((value) => {
      const row =
        value as Record<string, unknown>;

      return {
        id: String(row.id ?? ""),
        name: String(
          row.name ?? "Produto",
        ),
        category: String(
          row.category ?? "",
        ),
        brand:
          nullableString(row.brand),
        lot_tracking_enabled: Boolean(
          row.lot_tracking_enabled,
        ),
        flavor_tracking_enabled:
          Boolean(
            row.flavor_tracking_enabled,
          ),
        physical_quantity: number(
          row.physical_quantity,
        ),
      };
    }),

    recent_trace: traceRows.map(
      (value) => {
        const row =
          value as Record<string, unknown>;

        return {
          lot_movement_id: String(
            row.lot_movement_id ?? "",
          ),
          lot_id:
            nullableString(row.lot_id),
          lot_number:
            nullableString(row.lot_number),
          expires_on:
            nullableString(row.expires_on),
          product_id: String(
            row.product_id ?? "",
          ),
          product_name: String(
            row.product_name ?? "Produto",
          ),
          flavor_id:
            nullableString(row.flavor_id),
          flavor_name:
            nullableString(row.flavor_name),
          location_id: String(
            row.location_id ?? "",
          ),
          location_code: String(
            row.location_code ?? "",
          ),
          quantity_delta: number(
            row.quantity_delta,
          ),
          allocation_kind: String(
            row.allocation_kind ??
              "untracked",
          ),
          movement_type: String(
            row.movement_type ?? "",
          ),
          sale_id:
            nullableString(row.sale_id),
          sale_at:
            nullableString(row.sale_at),
          customer_id:
            nullableString(row.customer_id),
          customer_name:
            nullableString(row.customer_name),
          customer_phone:
            nullableString(row.customer_phone),
          transfer_group_id:
            nullableString(
              row.transfer_group_id,
            ),
          created_at: String(
            row.created_at ?? "",
          ),
        };
      },
    ),
  };
}

export default async function LotsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "inventory_lot_dashboard_snapshot",
  );

  if (error) throw error;

  const source =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const snapshot =
    normalizeSnapshot(source);

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Estoque · Rastreabilidade"
        title="Lotes e validades"
        description="Controle lote, validade, FEFO, quarentena e rastreie quais clientes receberam cada lote."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href="/estoque"
            >
              <ArrowLeft size={16} />
              Estoque
            </Link>

            <Link
              className="button ghost"
              href="/pedidos-fornecedor"
            >
              <PackageSearch size={16} />
              Pedidos
            </Link>
          </div>
        }
      />

      <LotInventoryManager
        snapshot={snapshot}
      />
    </>
  );
}
