import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  ExternalLink,
  Link2,
  UserRound,
} from "lucide-react";
import { getPhysiqueAthleteDetails } from "@/lib/physique-data";

export default async function PhysiqueAthleteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getPhysiqueAthleteDetails(id);
  if (!details) notFound();

  const { athlete, plans } = details;

  return (
    <section className="physique-page">
      <header className="physique-subpage-header">
        <Link href="/physique/atletas"><ArrowLeft size={16} /> Atletas</Link>
        <div>
          <span>{athlete.status}</span>
          <h1>{athlete.display_name}</h1>
          <p>{athlete.primary_goal ?? "Objetivo ainda não informado."}</p>
        </div>
      </header>

      <div className="physique-profile-grid">
        <article className="physique-panel">
          <UserRound size={19} />
          <h2>Perfil</h2>
          <dl>
            <div><dt>Telefone</dt><dd>{athlete.phone ?? "—"}</dd></div>
            <div><dt>E-mail</dt><dd>{athlete.email ?? "—"}</dd></div>
            <div><dt>Instagram</dt><dd>{athlete.instagram_username ?? "—"}</dd></div>
            <div><dt>Objetivo</dt><dd>{athlete.primary_goal ?? "—"}</dd></div>
          </dl>
        </article>

        <article className="physique-panel">
          <Link2 size={19} />
          <h2>Vínculos no ERP</h2>
          <div className="physique-linked-actions vertical">
            <Link href="/central/clientes">Abrir Central de Clientes <ExternalLink size={13} /></Link>
            {athlete.supplements_customer_id && (
              <Link href={`/clientes/${athlete.supplements_customer_id}`}>
                {athlete.supplements_customer_name ?? "Cliente Suplementos"} <ExternalLink size={13} />
              </Link>
            )}
            {athlete.fitness_customer_id && (
              <Link href={`/fitness/clientes/${athlete.fitness_customer_id}`}>
                {athlete.fitness_customer_name ?? "Cliente Fitness"} <ExternalLink size={13} />
              </Link>
            )}
          </div>
        </article>
      </div>

      <article className="physique-panel">
        <div className="physique-panel-title">
          <div>
            <span>Histórico</span>
            <h2>Fichas de treino</h2>
          </div>
          <b>{plans.length}</b>
        </div>

        {plans.length === 0 ? (
          <div className="physique-empty compact">
            <Dumbbell size={23} />
            <strong>Nenhuma ficha criada</strong>
          </div>
        ) : (
          <div className="physique-plan-list">
            {plans.map((plan) => (
              <Link href={`/physique/fichas/${plan.id}`} key={plan.id}>
                <div>
                  <small>{plan.status} · {plan.source_type}</small>
                  <strong>{plan.title}</strong>
                  <span>{plan.goal ?? "Sem objetivo descrito"}</span>
                </div>
                <ExternalLink size={15} />
              </Link>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
