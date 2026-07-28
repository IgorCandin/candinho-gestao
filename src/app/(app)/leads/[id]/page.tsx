/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FilePenLine,
  FileText,
  ImageIcon,
  MessageSquareText,
  Phone,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { LeadConvertButton } from "@/components/lead-convert-button";
import { LeadDeleteButton } from "@/components/lead-delete-button";
import { PageHeader } from "@/components/page-header";
import { getLeadDetails } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return <div className="sale-detail-line"><span>{label}</span><strong>{value}</strong></div>;
}

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [lead, flavorResult] = await Promise.all([
    getLeadDetails(id),
    supabase.from("sale_item_flavor_display").select("sale_item_id,flavor_summary").eq("sale_id", id),
  ]);

  if (!lead) notFound();
  if (flavorResult.error) throw flavorResult.error;

  const flavorByItem = new Map(
    (flavorResult.data ?? [])
      .filter((row) => typeof row.flavor_summary === "string" && row.flavor_summary)
      .map((row) => [String(row.sale_item_id), String(row.flavor_summary)]),
  );

  const converted = Boolean(
    lead.quote_sale_id || lead.lead_status === "Convertido" || lead.general_status === "finalized",
  );

  const action = (
    <div className="page-header-actions">
      {lead.quote_id && (
        <a className="button ghost" href={`/api/orcamentos/${lead.quote_id}/pdf`} target="_blank" rel="noreferrer">
          <FileText size={16} />Abrir PDF
        </a>
      )}

      {!converted && <LeadConvertButton leadId={lead.id} />}

      {lead.quote_sale_id && (
        <Link className="button gold" href={`/vendas/${lead.quote_sale_id}`}>
          <ShoppingBag size={16} />Ver venda
        </Link>
      )}

      {!converted && !lead.quote_id && (
        <Link className="button ghost" href={`/leads/${lead.id}/editar`}>
          <FilePenLine size={16} />Editar lead
        </Link>
      )}

      {!converted && <LeadDeleteButton leadId={lead.id} customerName={lead.customer_name} />}

      <Link className="button ghost" href="/leads"><ArrowLeft size={16} />Voltar</Link>
    </div>
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Lead"
        title={lead.customer_name}
        description="Informações do contato comercial, sabor de interesse e orçamento vinculado."
        action={action}
      />

      {!converted && (
        <article className="panel budget-conversion-banner">
          <div className="panel-body">
            <ShoppingBag size={20} />
            <div>
              <strong>Quando o cliente decidir comprar</strong>
              <span>
                Use “Converter em venda”. O sistema abre o fluxo de orçamento já com este lead como origem.
                O lead só sai da lista depois da confirmação final da venda.
              </span>
            </div>
          </div>
        </article>
      )}

      <section className="lead-details-layout">
        <div className="lead-details-main">
          {lead.quote_id && (
            <article className="panel">
              <div className="panel-head">
                <div><h2>Orçamento #{lead.quote_number}</h2><p>Cotação vinculada a este lead.</p></div>
                <FileText size={19} />
              </div>
              <div className="panel-body sale-detail-list">
                <Line label="Valor do orçamento" value={lead.quote_total_amount == null ? null : formatCurrency(lead.quote_total_amount)} />
                <Line label="Situação" value={<Badge value={lead.quote_status ?? "quoted"} />} />
              </div>
            </article>
          )}

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Produtos de interesse</h2>
                <p>Antes de existir orçamento, produto e sabor podem ser alterados pelo botão “Editar lead”.</p>
              </div>
              <strong>{lead.items.length}</strong>
            </div>

            <div className="panel-body lead-product-list">
              {lead.items.length > 0 ? lead.items.map((item) => {
                const flavor = flavorByItem.get(item.id);
                return (
                  <div className="lead-product-card" key={item.id}>
                    <div className="sale-item-image">
                      {item.product_image_url ? <img src={item.product_image_url} alt={item.product_name} /> : <ImageIcon size={30} />}
                    </div>
                    <div>
                      <Link className="cell-main table-link" href={`/produtos/${item.product_id}`}>{item.product_name}</Link>
                      <span>{[item.category, item.brand, flavor ? `Sabor ${flavor}` : null].filter(Boolean).join(" · ") || "Produto cadastrado"}</span>
                      <small>Quantidade: {item.quantity}</small>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty compact"><strong>Nenhum produto vinculado</strong>Revise o cadastro deste lead.</div>
              )}
            </div>
          </article>

          {lead.notes && (
            <article className="panel">
              <div className="panel-head"><div><h2>Observações</h2><p>Contexto do atendimento</p></div><MessageSquareText size={19} /></div>
              <div className="panel-body"><p className="sale-notes">{lead.notes}</p></div>
            </article>
          )}
        </div>

        <aside className="sale-details-side">
          <article className="panel">
            <div className="panel-head"><div><h2>Situação</h2><p>Etapa atual</p></div><CalendarDays size={19} /></div>
            <div className="panel-body sale-detail-list">
              <Line label="Data do lead" value={formatDate(lead.lead_at)} />
              <Line label="Status" value={<Badge value={lead.lead_status ?? lead.general_status} />} />
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Cliente</h2><p>Dados disponíveis</p></div><UserRound size={19} /></div>
            <div className="panel-body sale-detail-list">
              <Line label="Nome" value={lead.customer_id ? <Link className="table-link" href={`/clientes/${lead.customer_id}`}>{lead.customer_name}</Link> : lead.customer_name} />
              <Line label="Telefone" value={lead.phone ? <span className="detail-with-icon"><Phone size={14} />{lead.phone}</span> : null} />
              <Line label="Cidade" value={lead.city} />
              <Line label="Referência" value={lead.reference} />
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
