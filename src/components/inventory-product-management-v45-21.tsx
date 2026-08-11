import {
  Boxes,
  CheckCircle2,
  Image as ImageIcon,
  PackageCheck,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";
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

const TOTAL_RAW_QUALITY_FIELDS = 15;

const ALWAYS_IGNORED_QUALITY_FIELDS = new Set([
  "Estoque mínimo",
  "Estoque ideal",
]);

function isAccessoryCategory(category: string) {
  return category.toLocaleLowerCase("pt-BR").includes("acess");
}

export async function InventoryProductManagementV4521() {
  const supabase = await createClient();

  const [access, products, rawQuality, intelligenceResult] =
    await Promise.all([
      getCurrentUserAccess(),
      getProductCatalog(),
      getProductDataQuality(),
      supabase
        .from("product_sales_category_intelligence")
        .select("*")
        .order("units_90d", { ascending: false })
        .order("units_30d", { ascending: false })
        .order("product_name", { ascending: true }),
    ]);

  if (intelligenceResult.error) throw intelligenceResult.error;

  const quality = rawQuality.map((row) => {
    const ignoredFields = new Set(ALWAYS_IGNORED_QUALITY_FIELDS);

    if (isAccessoryCategory(row.category)) {
      ignoredFields.add("Marca");
      ignoredFields.add("Duração/doses");
    }

    const missingFields = row.missing_fields.filter(
      (field) => !ignoredFields.has(field),
    );

    const totalRelevantFields =
      TOTAL_RAW_QUALITY_FIELDS - ignoredFields.size;

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
    <section
      className="v4521-stock-management"
      id="gestao-produtos"
    >
      <div className="section-heading">
        <div>
          <span>Estoque e compras · Gestão</span>
          <h2>Saúde dos produtos</h2>
          <p>
            Giro, qualidade do cadastro e sinais que influenciam estoque e
            compra ficam aqui. Produtos permanece somente como catálogo e
            cadastro.
          </p>
        </div>
      </div>

      <section className="stats-grid product-stats-grid">
        <StatCard
          href="/suplementos/produtos"
          label="Produtos ativos"
          value={String(active.length)}
          note={`${products.length} cadastrados`}
          icon={Boxes}
        />

        <StatCard
          label="Unidades disponíveis"
          value={String(available)}
          note="Saldo livre para vendas"
          icon={PackageCheck}
        />

        <StatCard
          href="/suplementos/pedidos-fornecedor"
          label="Unidades a caminho"
          value={String(incoming)}
          note="Pedidos de fornecedor"
          icon={PackagePlus}
        />

        <StatCard
          href="/suplementos/estoque#gestao-produtos"
          label="Sem miniatura"
          value={String(missingPhotos)}
          note="Precisam de foto principal"
          icon={ImageIcon}
        />

        <StatCard
          href="/suplementos/estoque#gestao-produtos"
          label="Cadastros incompletos"
          value={String(incomplete)}
          note="Somente campos aplicáveis"
          icon={TriangleAlert}
        />

        <StatCard
          href="/suplementos/estoque#gestao-produtos"
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
              Esta lista está dentro de Estoque e compras porque qualidade,
              giro e reposição se influenciam. Abra o produto somente para
              corrigir o cadastro.
            </p>
          </div>
        </div>
      </article>

      <ProductDataQualityTable rows={quality} />
    </section>
  );
}
