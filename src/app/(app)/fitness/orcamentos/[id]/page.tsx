import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  FileText,
  MessageSquareText,
  ShoppingBag,
  UserRound,
  UsersRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FitnessQuoteConvertForm } from "@/components/fitness-quote-convert-form";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";

type QuoteItemRow = {
  id: string;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

function statusLabel(value: string) {
  if (value === "quoted") return "Em orçamento";
  if (value === "confirmed") return "Convertido";
  if (value === "lost") return "Cliente não fechou";
  if (value === "cancelled") return "Cancelado";
  return value;
}

export default async function Page<T extends {
  params: Promise<{ id: string }>;
}>(props: T) {
  const { params } = props;
  const companyMode = Boolean((props as T & { companyMode?: boolean }).companyMode);
  const access = await getCurrentUserAccess();
  if (!access.canAccessFitness) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const supabase = await createClient();

  const [quoteResult, itemsResult] =
    await Promise.all([
      supabase
        .from("fitness_quotes_overview")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("fitness_quote_items_overview")
        .select("*")
        .eq("quote_id", id)
        .order("created_at"),
    ]);

  if (quoteResult.error) {
    throw quoteResult.error;
  }
  if (itemsResult.error) {
    throw itemsResult.error;
  }
  if (!quoteResult.data) notFound();

  const q = quoteResult.data;
  const rows = (
    itemsResult.data ?? []
  ) as QuoteItemRow[];

  if (companyMode) {
    return <>
      <PageHeader
        eyebrow="Company · Orçamentos · Fitness"
        title={`Orçamento #${q.quote_number}`}
        description={`${q.customer_name} · ${formatDateOnly(q.quoted_on)} · válido até ${formatDateOnly(q.valid_until)}`}
        action={<div className="page-header-actions">
          <Link className="button ghost" href="/company/orcamentos"><ArrowLeft size={16}/>Voltar aos orçamentos</Link>
          <a className="button gold" href={`/api/fitness/orcamentos/${id}/pdf`} target="_blank" rel="noreferrer"><FileText size={16}/>Abrir PDF</a>
        </div>}
      />
      <section className="sale-details-layout company-fitness-quote-detail">
        <div className="sale-details-main">
          <article className="panel">
            <div className="panel-head"><div><h2>Peças da proposta</h2><p>{rows.length} {rows.length === 1 ? "variação" : "variações"} · a disponibilidade será conferida ao confirmar</p></div><strong className="sale-total-highlight">{formatCurrency(q.total_amount)}</strong></div>
            <div className="panel-body sale-items-list">
              {rows.map((item) => <div className="company-fitness-quote-item" key={item.id}>
                <div><strong>{item.product_name}</strong><span>Tamanho {item.size} · {item.color}</span></div>
                <div><span>{item.quantity} {item.quantity === 1 ? "peça" : "peças"}</span><strong>{formatCurrency(item.total_price)}</strong><small>{formatCurrency(item.unit_price)} por peça</small></div>
              </div>)}
            </div>
          </article>
          {access.canWriteFitness && q.status === "quoted" && <FitnessQuoteConvertForm id={id} companyMode/>}
          {q.sale_id && <article className="panel"><div className="panel-head"><div><h2>Venda criada</h2><p>Continue o atendimento na venda já vinculada a este orçamento.</p></div></div><div className="panel-body"><Link className="button gold" href={`/company/concluir/fitness/${q.sale_id}`}>Abrir venda confirmada</Link></div></article>}
        </div>
        <aside className="sale-details-side">
          <article className="panel"><div className="panel-head"><div><h2>Situação</h2><p>Etapa atual da proposta</p></div><ShoppingBag size={19}/></div><div className="panel-body sale-detail-list"><div className="sale-detail-line"><span>Status</span><strong>{statusLabel(q.status)}</strong></div><div className="sale-detail-line"><span>Validade</span><strong>{formatDateOnly(q.valid_until)}</strong></div></div></article>
          <article className="panel"><div className="panel-head"><div><h2>Cliente</h2><p>Dados para continuar o atendimento</p></div><UserRound size={19}/></div><div className="panel-body sale-detail-list"><div className="sale-detail-line"><span>Nome</span><strong>{q.customer_name}</strong></div>{q.customer_phone && <div className="sale-detail-line"><span>Telefone</span><strong>{q.customer_phone}</strong></div>}{q.city && <div className="sale-detail-line"><span>Cidade</span><strong>{q.city}</strong></div>}</div></article>
          <article className="panel"><div className="panel-head"><div><h2>Datas e responsável</h2></div><CalendarDays size={19}/></div><div className="panel-body sale-detail-list"><div className="sale-detail-line"><span>Orçamento</span><strong>{formatDateOnly(q.quoted_on)}</strong></div>{q.responsible && <div className="sale-detail-line"><span>Responsável</span><strong>{q.responsible}</strong></div>}<div className="sale-detail-line"><span>Quantidade</span><strong>{q.total_units} peça(s)</strong></div></div></article>
          {q.notes && <article className="panel"><div className="panel-head"><div><h2>Observações</h2></div><MessageSquareText size={19}/></div><div className="panel-body"><p className="sale-notes">{q.notes}</p></div></article>}
          <article className="panel sale-total-panel"><CircleDollarSign size={22}/><div><span>Total da proposta</span><strong>{formatCurrency(q.total_amount)}</strong></div></article>
        </aside>
      </section>
    </>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor de Vendas"
        title={`Orçamento #${q.quote_number}`}
        description={`${q.customer_name} · válido até ${formatDateOnly(
          q.valid_until,
        )}`}
        action={
          <div className="panel-actions">
            <Link
              className="button ghost"
              href={companyMode ? "/company/vender" : "/fitness/vendas"}
            >
              <ShoppingBag size={16} />
              Setor de Vendas
            </Link>
            <a
              className="button gold"
              href={`/api/fitness/orcamentos/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={16} />
              Abrir PDF
            </a>
          </div>
        }
      />

      <section className="operation-home-kpis">
        <div>
          <span>Status</span>
          <strong>{statusLabel(q.status)}</strong>
          <small>{formatDateOnly(q.quoted_on)}</small>
        </div>
        <div>
          <span>Cliente</span>
          <strong>{q.customer_name}</strong>
          <small>{q.customer_phone || q.city || "Contato não informado"}</small>
        </div>
        <div>
          <span>Itens</span>
          <strong>{q.total_units}</strong>
          <small>{q.item_count} variação(ões)</small>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatCurrency(q.total_amount)}</strong>
          <small>Desconto {formatCurrency(q.discount_amount)}</small>
        </div>
      </section>

      <div className="fitness-quote-flow-strip">
        <div>
          <span>ETAPA 1</span>
          <strong>Proposta</strong>
          <small>Cliente, peças, tamanho, cor e valor.</small>
        </div>
        <div>
          <span>ETAPA 2</span>
          <strong>Decisão</strong>
          <small>PDF e negociação ficam no histórico deste orçamento.</small>
        </div>
        <div>
          <span>ETAPA 3</span>
          <strong>Venda</strong>
          <small>Pagamento, entrega e estoque são definidos ao fechar.</small>
        </div>
        <div>
          <span>ETAPA 4</span>
          <strong>Relacionamento</strong>
          <small>A cliente continua no histórico e no pós-venda Fitness.</small>
        </div>
      </div>

      <section className="dashboard-two-column">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Itens da proposta</h2>
              <p>
                Este é o retrato do que foi oferecido. A disponibilidade real será conferida na conversão.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tamanho</th>
                  <th>Cor</th>
                  <th>Qtd.</th>
                  <th>Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.size}</td>
                    <td>{item.color}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Contexto comercial</h2>
              <p>
                Dados que ajudam a continuar o atendimento sem procurar em outra tela.
              </p>
            </div>
            <UsersRound size={18} />
          </div>
          <div className="panel-body sale-detail-list">
            <div className="sale-detail-line">
              <span>Cliente</span>
              <strong>{q.customer_name}</strong>
            </div>
            <div className="sale-detail-line">
              <span>Telefone</span>
              <strong>{q.customer_phone || "—"}</strong>
            </div>
            <div className="sale-detail-line">
              <span>Cidade</span>
              <strong>{q.city || "—"}</strong>
            </div>
            <div className="sale-detail-line">
              <span>Responsável</span>
              <strong>{q.responsible || "—"}</strong>
            </div>
            <div className="sale-detail-line">
              <span>Resumo</span>
              <strong>{q.product_summary || "—"}</strong>
            </div>
          </div>
        </article>
      </section>

      {q.notes && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Observações do atendimento</h2>
              <p>Contexto preservado desde a origem da proposta.</p>
            </div>
            <MessageSquareText size={18} />
          </div>
          <div className="panel-body">
            <p style={{ whiteSpace: "pre-wrap" }}>{q.notes}</p>
          </div>
        </article>
      )}

      {access.canWriteFitness && q.status === "quoted" && (
        <FitnessQuoteConvertForm id={id} companyMode={companyMode} />
      )}

      {q.sale_id && (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Venda criada</h2>
              <p>
                Este orçamento já foi convertido. Continue a operação na venda, sem duplicar registro.
              </p>
            </div>
            <Link
              className="button gold"
              href={companyMode ? `/company/concluir/fitness/${q.sale_id}` : `/fitness/vendas/${q.sale_id}`}
            >
              Abrir venda convertida
            </Link>
          </div>
        </article>
      )}
    </>
  );
}
