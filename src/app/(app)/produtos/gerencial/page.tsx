import Link from "next/link";
import { ArrowLeft, Boxes, CheckCircle2, Image, PackageCheck, PackagePlus, TriangleAlert } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { ProductDataQualityTable } from "@/components/product-data-quality-table";
import { StatCard } from "@/components/stat-card";
import { getProductCatalog, getProductDataQuality } from "@/lib/data";

export default async function ProductManagementPage() {
  const [products,quality]=await Promise.all([getProductCatalog(),getProductDataQuality()]);
  const active=products.filter((p)=>p.active);
  const available=active.reduce((sum,p)=>sum+p.available_quantity,0);
  const incoming=active.reduce((sum,p)=>sum+p.incoming_quantity,0);
  const missingPhotos=active.filter((p)=>!p.thumbnail_url).length;
  const incomplete=quality.filter((p)=>p.missing_fields.length>0).length;
  const avg=quality.length?Math.round(quality.reduce((sum,p)=>sum+p.completion_pct,0)/quality.length):100;
  return <>
    <DemoBanner/>
    <PageHeader eyebrow="Produtos" title="Área Gerencial" description="Indicadores internos e panorama do que ainda falta preencher no catálogo." action={<Link className="button ghost" href="/produtos"><ArrowLeft size={16}/>Voltar aos produtos</Link>}/>
    <section className="stats-grid product-stats-grid">
      <StatCard href="/produtos" label="Produtos ativos" value={String(active.length)} note={`${products.length} cadastrados`} icon={Boxes}/>
      <StatCard href="/estoque" label="Unidades disponíveis" value={String(available)} note="Saldo livre para vendas" icon={PackageCheck}/>
      <StatCard href="/pedidos-fornecedor" label="Unidades a caminho" value={String(incoming)} note="Pedidos de fornecedor" icon={PackagePlus}/>
      <StatCard href="/produtos/gerencial" label="Sem miniatura" value={String(missingPhotos)} note="Precisam de foto" icon={Image}/>
      <StatCard href="/produtos/gerencial" label="Cadastros incompletos" value={String(incomplete)} note="Produtos com algum campo faltando" icon={TriangleAlert}/>
      <StatCard href="/produtos/gerencial" label="Qualidade média" value={`${avg}%`} note="Preenchimento do catálogo" icon={CheckCircle2}/>
    </section>
    <ProductDataQualityTable rows={quality}/>
  </>;
}
