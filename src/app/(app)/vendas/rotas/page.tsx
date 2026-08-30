import { CalendarDays, MapPinned } from "lucide-react";
import { CommercialNav } from "@/components/commercial-nav";
import {
  CommercialRouteManager,
  type CommercialRouteQueueRow,
  type CommercialRouteSummary,
} from "@/components/commercial-route-manager";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function CommercialRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Preparação automática na véspera/no dia. A RPC é idempotente.
  await supabase.rpc("commercial_prepare_due_routes_v1");

  const { data: routeRows, error: routeError } = await supabase
    .from("commercial_route_schedule_overview_v1")
    .select(
      "id,route_on,city,status,notes,prepared_at,customer_count,pending_count,notified_count,skipped_count",
    )
    .order("route_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (routeError) {
    throw new Error(`Não foi possível carregar as rotas: ${routeError.message}`);
  }

  const routes = (routeRows ?? []) as CommercialRouteSummary[];
  const today = todayInSaoPaulo();
  const requestedRoute = params.route?.trim() || "";

  const selectedRouteId =
    routes.find((route) => route.id === requestedRoute)?.id ??
    routes.find(
      (route) =>
        route.route_on >= today &&
        route.status !== "cancelled" &&
        route.status !== "completed",
    )?.id ??
    routes.at(-1)?.id ??
    null;

  let queue: CommercialRouteQueueRow[] = [];

  if (selectedRouteId) {
    // Também prepara explicitamente a rota aberta. Rodar novamente não duplica.
    await supabase.rpc("commercial_prepare_route_v1", {
      p_route_id: selectedRouteId,
    });

    const { data: queueRows, error: queueError } = await supabase
      .from("commercial_route_queue_v1")
      .select(
        "route_id,route_on,route_city,route_status,route_customer_id,status,prepared_at,notified_at,skipped_at,last_action_at,notes,customer_id,customer_name,phone,customer_city,reference,last_contact_at,last_contact_outcome",
      )
      .eq("route_id", selectedRouteId);

    if (queueError) {
      throw new Error(
        `Não foi possível carregar a fila da rota: ${queueError.message}`,
      );
    }

    queue = (queueRows ?? []) as CommercialRouteQueueRow[];
  }

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial"
        title="Rotas"
        description="Agende uma cidade, prepare automaticamente os clientes do CRM e avise cada pessoa sem misturar esta fila com a Fila Comercial."
        action={
          <span className="badge">
            <MapPinned size={15} />
            Data + cidade
          </span>
        }
      />

      <CommercialNav active="routes" />

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon">
            <CalendarDays size={18} />
          </div>
          <div>
            <span>Rotas cadastradas</span>
            <strong>{routes.length}</strong>
            <small>Histórico e próximas visitas</small>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon">
            <MapPinned size={18} />
          </div>
          <div>
            <span>Próxima rota</span>
            <strong>
              {routes.find(
                (route) =>
                  route.route_on >= today &&
                  !["completed", "cancelled"].includes(route.status),
              )?.city ?? "Nenhuma"}
            </strong>
            <small>Preparada ao abrir o ERP na véspera/dia</small>
          </div>
        </article>
      </section>

      <CommercialRouteManager
        routes={routes}
        selectedRouteId={selectedRouteId}
        queue={queue}
        today={today}
      />
    </>
  );
}
