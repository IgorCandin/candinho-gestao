import Image from "next/image";
import Link from "next/link";
import { LogIn, ShieldCheck, Store } from "lucide-react";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage() {
  const snapshot = await getPublicStorefrontSnapshot();
  const company = BRAND_ASSETS.company.complete;

  return (
    <main className="public-storefront-page">
      <header className="public-storefront-header">
        <div className="public-storefront-header-top">
          <Image
            src={company.src}
            alt={company.alt}
            width={company.width}
            height={company.height}
            priority
          />

          <Link className="public-storefront-login" href="/login">
            <LogIn size={16} />
            Área interna
          </Link>
        </div>

        <div className="public-storefront-hero">
          <span><Store size={15} /> Vitrine Candinho</span>
          <h1>Produtos & Promoções</h1>
          <p>
            Consulte o que está disponível agora na Candinho Suplementos e
            Candinho Fitness. Os dados vêm diretamente do estoque e das
            promoções cadastradas no ERP.
          </p>

          <div className="public-storefront-trust">
            <ShieldCheck size={15} />
            <span>Somente preço de venda e disponibilidade são exibidos publicamente.</span>
          </div>
        </div>
      </header>

      <section className="public-storefront-content">
        <PublicStorefrontBrowser snapshot={snapshot} />
      </section>
    </main>
  );
}
