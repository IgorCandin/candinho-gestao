import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Handshake } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PartnerHealth = {
  partner_id: string;
  partner_name: string;
  partner_type: string;
  city: string | null;
  status: string | null;
  setup_fields_done: number;
  pending_setup: string[] | null;
  commercial_investment_cost: number | string;
  commercial_units_invested: number;
};

export default async function PartnerSetupPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_setup_health_v1")
    .select("*")
    .order("setup_fields_done")
    .order("partner_name");

  if (error) throw new Error(error.message);
  const partners = (data ?? []) as PartnerHealth[];

  return (
    <>
      <PageHeader
        eyebrow="Parcerias · Implantação"
        title="Parcerias em configuração"
        description="A parceria pode começar antes de todas as regras estarem definidas. O ERP mostra o que ainda falta combinar sem obrigar cadastro fictício."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/clientes/radar">
              <ArrowLeft size={15} /> Radar
            </Link>
            <Link className="button gold" href="/parceiros">
              <Handshake size={15} /> Parceiros
            </Link>
          </div>
        }
      />

      <div className="partner-setup-grid-v45">
        {partners.map((partner) => {
          const pending = partner.pending_setup ?? [];
          const complete = pending.length === 0;

          return (
            <article className={`partner-setup-card-v45 ${complete ? "complete" : ""}`} key={partner.partner_id}>
              <header>
                <span className={`badge ${complete ? "green" : "orange"}`}>
                  {complete ? "Configurada" : `${pending.length} pendência(s)`}
                </span>
                <Link href={`/parceiros/${partner.partner_id}`}>{partner.partner_name}</Link>
                <small>{partner.city || partner.partner_type}</small>
              </header>

              <div className="partner-setup-checks-v45">
                {complete ? (
                  <div><CheckCircle2 size={15} /><span>Regras principais cadastradas.</span></div>
                ) : (
                  pending.map((item) => (
                    <div key={item}><CircleDashed size={15} /><span>{item}</span></div>
                  ))
                )}
              </div>

              <footer>
                <span>
                  <small>Investimento comercial</small>
                  <strong>{formatCurrency(Number(partner.commercial_investment_cost ?? 0))}</strong>
                </span>
                <span>
                  <small>Produtos destinados</small>
                  <strong>{partner.commercial_units_invested ?? 0} un.</strong>
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}
