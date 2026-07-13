import { History, Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getMovements } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function MovementsPage() {
  const movements = await getMovements();
  return <><DemoBanner /><PageHeader eyebrow="Auditoria" title="Movimentações" description="Toda entrada, saída, transferência, ajuste e estorno fica registrado." action={<button className="button gold"><Plus size={16} />Novo ajuste</button>} />
    <article className="panel"><div className="table-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Local</th><th>Quantidade</th><th>Observação</th></tr></thead><tbody>
      {movements.map((movement) => <tr key={movement.id}><td>{formatDateTime(movement.created_at)}</td><td><div className="cell-main">{movement.product_name}</div></td><td><Badge value={movement.movement_type === "sale" ? "sale_movement" : movement.movement_type} /></td><td>{movement.location_code}</td><td className={`amount ${movement.quantity_delta > 0 ? "positive" : "negative"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</td><td>{movement.notes ?? "—"}</td></tr>)}
    </tbody></table></div><div className="panel-body" style={{ color: "var(--muted)", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}><History size={15} />Os registros de estoque são imutáveis: correções geram um novo movimento, nunca apagam o histórico.</div></article></>;
}
