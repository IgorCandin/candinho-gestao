import Link from "next/link";
import { ArrowLeft, BadgeInfo, CalendarDays, CheckCircle2, CircleDollarSign, Tags } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductImageUploader } from "@/components/product-image-uploader";
import { getProductDetails } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="product-detail-item">
      <span>{label}</span>
      <strong>{value === null || value === undefined || value === "" ? "—" : value}</strong>
    </div>
  );
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetails(id);
  if (!product) notFound();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Catálogo"
        title={product.name}
        description="Informações comerciais essenciais do produto, sem exibir custo ou margem."
        action={<Link className="button ghost" href="/produtos"><ArrowLeft size={16} />Voltar aos produtos</Link>}
      />

      <section className="product-details-layout">
        <article className="panel product-images-panel">
          <div className="panel-head"><div><h2>Fotos do produto</h2><p>Adicione ou troque as imagens usadas no catálogo.</p></div></div>
          <div className="panel-body">
            <ProductImageUploader
              productId={product.id}
              initialImageUrl={product.image_url}
              initialSecondaryImageUrl={product.secondary_image_url}
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
                <DetailItem label="Status" value={product.active ? "Ativo" : "Inativo"} />
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Características</h2><p>Argumentos e orientações para apresentar o produto.</p></div><BadgeInfo size={19} /></div>
            <div className="panel-body product-copy-list">
              <div><span>Descrição</span><p>{product.description ?? "—"}</p></div>
              <div><span>Objetivo</span><p>{product.objective ?? "—"}</p></div>
              <div><span>Perfil ideal</span><p>{product.ideal_profile ?? "—"}</p></div>
              <div><span>Informativo</span><p>{product.information ?? "—"}</p></div>
              <div><span>Mensagem rápida</span><p>{product.quick_message ?? "—"}</p></div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head"><div><h2>Palavras-chave</h2><p>Facilitam a consulta e o atendimento.</p></div><Tags size={19} /></div>
            <div className="panel-body">
              {product.keywords ? (
                <div className="keyword-list">{product.keywords.split(",").map((keyword) => <span key={keyword.trim()}><CheckCircle2 size={14} />{keyword.trim()}</span>)}</div>
              ) : (
                <div className="empty compact"><strong>Sem palavras-chave</strong>Este produto ainda não possui palavras-chave cadastradas.</div>
              )}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
