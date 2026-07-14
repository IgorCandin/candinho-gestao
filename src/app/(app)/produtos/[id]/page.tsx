import Link from "next/link";
import { ArrowLeft, BadgeInfo, CalendarDays, CheckCircle2, CircleDollarSign, Edit3, PackageCheck, PackagePlus, Tags, Warehouse } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { getProductDetails } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return <div className="product-detail-item"><span>{label}</span><strong>{value}</strong></div>;
}

function CopyItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div><span>{label}</span><p>{value}</p></div>;
}

function stockState(status: string) {
  if (status === "healthy") return { label: "Disponível", tone: "green" };
  if (status === "incoming" || status === "incoming_only") return { label: "A caminho", tone: "blue" };
  if (status === "below_minimum" || status === "fully_reserved") return { label: status === "fully_reserved" ? "Todo reservado" : "Estoque baixo", tone: "orange" };
  if (status === "inactive") return { label: "Inativo", tone: "gray" };
  return { label: "Sem estoque", tone: "red" };
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetails(id);
  if (!product) notFound();
  const state = stockState(product.stock_status);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Catálogo"
        title={product.name}
        description="Informações comerciais, fotos leves e situação atual do produto."
        action={<div className="page-header-action-group"><Link className="button gold" href={`/produtos/${product.id}/editar`}><Edit3 size={16} />Editar produto</Link><Link className="button ghost" href={`/estoque/${product.id}`}><Warehouse size={16} />Ver estoque</Link><Link className="button ghost" href="/produtos"><ArrowLeft size={16} />Voltar</Link></div>}
      />

      <section className="product-stock-summary">
        <article><PackageCheck size={18} /><div><span>Físico</span><strong>{product.physical_quantity}</strong></div></article>
        <article><Warehouse size={18} /><div><span>Reservado</span><strong>{product.reserved_quantity}</strong></div></article>
        <article><CheckCircle2 size={18} /><div><span>Disponível</span><strong>{product.available_quantity}</strong></div></article>
        <article><PackagePlus size={18} /><div><span>A caminho</span><strong>{product.incoming_quantity}</strong></div></article>
        <article><CalendarDays size={18} /><div><span>Vendas aguardando</span><strong>{product.awaiting_sales_quantity}</strong></div></article>
        <article><span className={`badge ${state.tone}`}><span className="dot" />{state.label}</span></article>
      </section>

      <section className="product-details-layout">
        <article className="panel product-images-panel">
          <div className="panel-head"><div><h2>Fotos do produto</h2><p>As listas usam miniaturas leves. A imagem maior só abre nesta página.</p></div></div>
          <div className="panel-body">
            <ProductImageUploader
              productId={product.id}
              initialImageUrl={product.image_url}
              initialThumbnailUrl={product.thumbnail_url}
              initialSecondaryImageUrl={product.secondary_image_url}
              initialSecondaryThumbnailUrl={product.secondary_thumbnail_url}
            />
          </div>
        </article>

        <div className="product-details-side">
          <article className="panel">
            <div className="panel-head">
              <div><h2>Resumo comercial</h2><p>Informações seguras para consultar durante o atendimento.</p></div>
              <span className={`badge ${product.active ? "green" : "gray"}`}><span className="dot" />{product.active ? "Ativo" : "Inativo"}</span>
            </div>
            <div className="panel-body">
              <div className="product-price-grid">
                <div className="product-price-card"><CircleDollarSign size={18} /><span>Preço à vista</span><strong>{formatCurrency(product.sale_price)}</strong></div>
                <div className="product-price-card"><CalendarDays size={18} /><span>Preço a prazo</span><strong>{formatCurrency(product.installment_price)}</strong></div>
              </div>
              <div className="product-detail-grid">
                <DetailItem label="Categoria" value={product.category} />
                <DetailItem label="Marca" value={product.brand} />
                <DetailItem label="Nível" value={product.level} />
                <DetailItem label="Categoria de vendas" value={product.sales_category} />
                <DetailItem label="Duração" value={product.duration_days ? `${product.duration_days} dias/doses` : null} />
              </div>
            </div>
          </article>

          {(product.description || product.objective || product.ideal_profile || product.information || product.quick_message) && <article className="panel">
            <div className="panel-head"><div><h2>Características</h2><p>Argumentos e orientações para apresentar o produto.</p></div><BadgeInfo size={19} /></div>
            <div className="panel-body product-copy-list">
              <CopyItem label="Descrição" value={product.description} />
              <CopyItem label="Objetivo" value={product.objective} />
              <CopyItem label="Perfil ideal" value={product.ideal_profile} />
              <CopyItem label="Informativo" value={product.information} />
              <CopyItem label="Mensagem rápida" value={product.quick_message} />
            </div>
          </article>}

          {product.keywords && <article className="panel">
            <div className="panel-head"><div><h2>Palavras-chave</h2><p>Facilitam a consulta e o atendimento.</p></div><Tags size={19} /></div>
            <div className="panel-body"><div className="keyword-list">{product.keywords.split(",").map((keyword) => <span key={keyword.trim()}><CheckCircle2 size={14} />{keyword.trim()}</span>)}</div></div>
          </article>}
        </div>
      </section>
    </>
  );
}
