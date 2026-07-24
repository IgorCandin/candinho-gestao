import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  ImageIcon,
  Tag,
  XCircle,
} from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPromotionShowcaseItem } from "@/lib/promotion-showcase-data";

export default async function PromotionShowcaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getCurrentUserAccess();
  const canView =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness ||
    access.canWriteMarketing;

  if (!canView) redirect("/dashboard");

  const { id } = await params;
  const item = await getPromotionShowcaseItem(id);
  if (!item) notFound();

  const company = BRAND_ASSETS.company.complete;
  const hasDiscount = item.promotional_price < item.current_price;
  const economy = Math.max(item.current_price - item.promotional_price, 0);
  const soldOut = item.stock_status === "sold_out";

  return (
    <div className="promotion-ux-showcase-page">
      <header className="promotion-ux-detail-topbar">
        <Link href="/promocoes">
          <ArrowLeft size={16} /> Promoções
        </Link>
        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </header>

      <main className={`promotion-ux-detail ${soldOut ? "sold-out" : ""}`}>
        <div className="promotion-ux-detail-image">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.item_label} />
          ) : (
            <ImageIcon size={56} />
          )}

          {hasDiscount && item.discount_pct > 0 && !soldOut && (
            <span>-{item.discount_pct}%</span>
          )}

          {soldOut && (
            <div className="promotion-ux-sold-out-overlay large">
              <XCircle size={68} />
              <strong>Estoque zerado</strong>
            </div>
          )}
        </div>

        <article className="promotion-ux-detail-copy">
          <span className="promotion-ux-detail-operation">
            {item.operation_scope === "supplements"
              ? "Candinho Suplementos"
              : "Candinho Fitness"}
          </span>

          <h1>{item.item_label}</h1>
          {item.category && <p>{item.category}</p>}

          <div className="promotion-ux-detail-price">
            {hasDiscount && <s>{formatCurrency(item.current_price)}</s>}
            <strong>{formatCurrency(item.promotional_price)}</strong>
            {economy > 0 && !soldOut && (
              <em>Você economiza {formatCurrency(economy)}</em>
            )}
          </div>

          <div className={soldOut ? "promotion-detail-stock sold-out" : "promotion-detail-stock"}>
            {soldOut ? (
              <>
                <XCircle size={18} />
                <span>
                  <strong>Produto esgotado</strong>
                  Esta oferta não pode ser aplicada enquanto o estoque estiver zerado.
                </span>
              </>
            ) : (
              <>
                <BadgePercent size={18} />
                <span>
                  <strong>Enquanto durar o estoque</strong>
                  {item.available_quantity} unidade(s) disponível(is) neste momento.
                </span>
              </>
            )}
          </div>

          <div className="promotion-ux-detail-info-grid">
            <div>
              <BadgePercent size={18} />
              <span>Campanha<strong>{item.promotion_name}</strong></span>
            </div>

            {(item.starts_on || item.ends_on) && (
              <div>
                <CalendarDays size={18} />
                <span>
                  Período
                  <strong>
                    {item.starts_on ? formatDateOnly(item.starts_on) : "Agora"}
                    {" → "}
                    {item.ends_on ? formatDateOnly(item.ends_on) : "Sem data final"}
                  </strong>
                </span>
              </div>
            )}

            {item.coupon_code && (
              <div>
                <Tag size={18} />
                <span>Cupom<strong>{item.coupon_code}</strong></span>
              </div>
            )}
          </div>

          {item.notes && (
            <div className="promotion-ux-detail-notes">{item.notes}</div>
          )}
        </article>
      </main>
    </div>
  );
}
