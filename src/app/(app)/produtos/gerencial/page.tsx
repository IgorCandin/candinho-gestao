import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Image,
  PackageCheck,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import {
  ProductSalesCategoryIntelligence,
  type ProductSalesCategoryIntelligenceRow,
} from "@/components/product-sales-category-intelligence";
import { ProductDataQualityTable } from "@/components/product-data-quality-table";
import { StatCard } from "@/components/stat-card";
import {
  getCurrentUserAccess,
  getProductCatalog,
  getProductDataQuality,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const IGNORED_QUALITY_FIELDS = new Set([
  "Estoque mínimo",
  "Estoque ideal",
]);

export default async function ProductManagementPage() {
  const supabase = await createClient();

  const [
    access,
    products,
    rawQuality,
    intelligenceResult,
  ] = await Promise.all([
    getCurrentUserAccess(),
    getProductCatalog(),
    getProductDataQuality(),
    supabase
      .from("product_sales_category_intelligence")
      .select("*")
      .order("units_90d", {
        ascending: false,
      })
      .order("units_30d", {
        ascending: false,
      })
      .order("product_name", {
        ascending: true,
      }),
  ]);

  if (intelligenceResult.error) {
    throw intelligenceResult.error;
  }

  const quality = rawQuality.map((row) => {
    const missingFields = row.missing_fields.filter(
      (field) => !IGNORED_QUALITY_FIELDS.has(field),
    );

    const totalRelevantFields = 13;

    return {
      ...row,
      missing_fields: missingFields,
      completion_pct: Math.round(
        ((totalRelevantFields - missingFields.length) /
          totalRelevantFields) *
          100,
      ),
    };
  });

  const active = products.filter((product) => product.active);

  const available = active.reduce(
    (sum, product) => sum + product.available_quantity,
    0,
  );

  const incoming = active.reduce(
    (sum, product) => sum + product.incoming_quantity,
    0,
  );

  const missingPhotos = active.filter(
    (product) => !product.thumbnail_url,
  ).length;

  const incomplete = quality.filter(
    (product) => product.missing_fields.length > 0,
  ).length;

  const avg = quality.length
    ? Math.round(
        quality.reduce(
          (sum, product) => sum + product.completion_pct,
          0,
        ) / quality.length,
      )
    : 100;

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Produtos"
        title="Área Gerencial"
        description="Qualidade dos cadastros e atualização da curva de giro. Estoque mínimo e ideal não contam mais como pendência cadastral."
        action={
          <Link className="button ghost" href="/produtos">
            <ArrowLeft size={16} />
            Voltar aos produtos
          </Link>
        }
      />

      <section className="stats-grid product-stats-grid">
        <StatCard
          href="/produtos"
          label="Produtos ativos"
          value={String(active.length)}
          note={`${products.length} cadastrados`}
          icon={Boxes}
        />

        <StatCard
          href="/estoque"
          label="Unidades disponíveis"
          value={String(available)}
          note="Saldo livre para vendas"
          icon={PackageCheck}
        />

        <StatCard
          href="/pedidos-fornecedor"
          label="Unidades a caminho"
          value={String(incoming)}
          note="Pedidos de fornecedor"
          icon={PackagePlus}
        />

        <StatCard
          href="/produtos/gerencial"
          label="Sem miniatura"
          value={String(missingPhotos)}
          note="Precisam de foto principal"
          icon={Image}
        />

        <StatCard
          href="/produtos/gerencial"
          label="Cadastros incompletos"
          value={String(incomplete)}
          note="Sem contar estoque mínimo/ideal"
          icon={TriangleAlert}
        />

        <StatCard
          href="/produtos/gerencial"
          label="Qualidade média"
          value={`${avg}%`}
          note="Preenchimento útil do catálogo"
          icon={CheckCircle2}
        />
      </section>

      <ProductSalesCategoryIntelligence
        rows={
          (intelligenceResult.data ??
            []) as ProductSalesCategoryIntelligenceRow[]
        }
        canUpdate={access.canWriteSupplements}
      />

      <article className="panel product-quality-note">
        <div className="panel-head">
          <div>
            <h2>Cadastros para revisar</h2>
            <p>
              Marcas que eram nomes de fornecedores foram corrigidas ou
              limpas. Os casos realmente ambíguos ficam aqui para você
              abrir o produto e usar “Completar informações” individualmente.
            </p>
          </div>
        </div>
      </article>

      <ProductDataQualityTable rows={quality} />
    </>
  );
}
