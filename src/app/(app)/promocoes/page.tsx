import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  FileDown,
  PackageOpen,
} from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import {
  getPromotionShowcase,
  type PromotionShowcaseItem,
} from "@/lib/promotion-showcase-data";

function ProductCard({
  item,
}: {
  item: PromotionShowcaseItem;
}) {
  const hasDiscount =
    item.promotional_price < item.current_price;

  return (
    <Link
      className="promotion-showcase-card"
      href={`/promocoes/${item.id}`}
    >
      <div className="promotion-showcase-image">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_label}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <PackageOpen size={38} />
        )}

        {item.promotion_status === "scheduled" && (
          <span className="promotion-showcase-status">
            Em breve
          </span>
        )}

        {hasDiscount && item.discount_pct > 0 && (
          <span className="promotion-showcase-discount">
            -{item.discount_pct}%
          </span>
        )}
      </div>

      <div className="promotion-showcase-card-copy">
        <small>{item.promotion_name}</small>
        <strong>{item.item_label}</strong>

        <div className="promotion-showcase-price">
          {hasDiscount && (
            <span>
              {formatCurrency(item.current_price)}
            </span>
          )}
          <b>
            {formatCurrency(item.promotional_price)}
          </b>
        </div>

        {item.ends_on && (
          <em>
            Até {formatDateOnly(item.ends_on)}
          </em>
        )}
      </div>
    </Link>
  );
}

function PromotionBlock({
  title,
  items,
}: {
  title: string;
  items: PromotionShowcaseItem[];
}) {
  return (
    <section className="promotion-showcase-block">
      <div className="promotion-showcase-block-head">
        <div>
          <span>Promoções</span>
          <h2>{title}</h2>
        </div>
        <b>{items.length}</b>
      </div>

      {items.length === 0 ? (
        <div className="promotion-showcase-empty">
          <BadgePercent size={24} />
          <strong>
            Nenhum produto promocional agora
          </strong>
        </div>
      ) : (
        <div className="promotion-showcase-gallery">
          {items.map((item) => (
            <ProductCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PromotionsShowcasePage() {
  const access = await getCurrentUserAccess();

  const canView =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canView) redirect("/dashboard");

  const data = await getPromotionShowcase();
  const company = BRAND_ASSETS.company.complete;

  return (
    <div className="promotion-showcase-page">
      <header className="promotion-showcase-header">
        <Link
          className="promotion-showcase-back"
          href="/dashboard"
        >
          <ArrowLeft size={18} />
          Operações
        </Link>

        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />

        <div>
          <span>Candinho Company</span>
          <h1>Promoções</h1>
          <p>
            Produtos em campanha, organizados por operação.
          </p>

          <Link
            className="promotion-showcase-export-link"
            href="/promocoes/exportar"
          >
            <FileDown size={15} />
            Selecionar produtos e gerar PDF
          </Link>
        </div>
      </header>

      <main className="promotion-showcase-content">
        <PromotionBlock
          title="Suplementos"
          items={data.supplements}
        />

        <PromotionBlock
          title="Fitness"
          items={data.fitness}
        />
      </main>
    </div>
  );
}
