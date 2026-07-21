import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  PackageOpen,
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

  const company = BRAND_ASSETS.company.reduced;
  const hasDiscount =
    item.promotional_price < item.current_price;

  return (
    <div className="promotion-showcase-detail-page">
      <header className="promotion-showcase-detail-header">
        <Link href="/promocoes">
          <ArrowLeft size={18} />
          Voltar às promoções
        </Link>

        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </header>

      <main className="promotion-showcase-detail">
        <div className="promotion-showcase-detail-image">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.item_label}
              referrerPolicy="no-referrer"
            />
          ) : (
            <PackageOpen size={62} />
          )}
        </div>

        <article className="promotion-showcase-detail-copy">
          <span className="promotion-showcase-detail-operation">
            {item.operation_scope === "supplements"
              ? "Candinho Suplementos"
              : "Candinho Fitness"}
          </span>

          <h1>{item.item_label}</h1>

          {item.category && (
            <p>{item.category}</p>
          )}

          <div className="promotion-showcase-detail-price">
            {hasDiscount && (
              <span>
                {formatCurrency(item.current_price)}
              </span>
            )}
            <strong>
              {formatCurrency(item.promotional_price)}
            </strong>
          </div>

          <div className="promotion-showcase-detail-campaign">
            <BadgePercent size={18} />
            <div>
              <small>Campanha</small>
              <strong>{item.promotion_name}</strong>
            </div>
          </div>

          {(item.starts_on || item.ends_on) && (
            <div className="promotion-showcase-detail-campaign">
              <CalendarDays size={18} />
              <div>
                <small>Período</small>
                <strong>
                  {item.starts_on
                    ? formatDateOnly(item.starts_on)
                    : "Agora"}
                  {" → "}
                  {item.ends_on
                    ? formatDateOnly(item.ends_on)
                    : "Sem data final"}
                </strong>
              </div>
            </div>
          )}

          {item.coupon_code && (
            <div className="promotion-showcase-coupon">
              Cupom: <strong>{item.coupon_code}</strong>
            </div>
          )}

          {item.notes && (
            <div className="promotion-showcase-notes">
              {item.notes}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
