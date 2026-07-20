import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Link2, LogOut, UserRound } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { getAppBootstrapSnapshot } from "@/lib/central-data";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default async function DashboardPage() {
  const [access, bootstrap] = await Promise.all([
    getCurrentUserAccess(),
    getAppBootstrapSnapshot(),
  ]);

  if (access.role === "partner") redirect("/parceiro");

  const company = BRAND_ASSETS.company.complete;
  const centralVisible =
    bootstrap?.feature_flags?.central_enabled !== false &&
    (
      access.canManageUsers ||
      access.canAccessSupplements ||
      access.canAccessFitness ||
      access.canAccessMarketing
    );

  const marketingVisible =
    bootstrap?.feature_flags?.marketing_enabled !== false &&
    access.canAccessMarketing;

  return (
    <section className="company-home company-home-clean company-home-selector-v2">
      <div className="company-home-selector-brand">
        <Image
          src={company.src}
          alt={company.alt}
          width={company.width}
          height={company.height}
          priority
        />
      </div>

      <div className="company-home-heading company-home-heading-compact">
        <h1>Olá, {access.name}.</h1>
        <p>Escolha sua operação.</p>
      </div>

      <div className="company-home-operation-groups">
        <div className="company-home-operations company-home-operations-primary">
          {access.canAccessSupplements && (
            <Link
              className="company-operation-card supplements"
              href="/suplementos"
              aria-label="Abrir Candinho Suplementos"
            >
              <div className="company-operation-logo-wrap">
                <Image
                  src={BRAND_ASSETS.supplements.reduced.src}
                  alt={BRAND_ASSETS.supplements.reduced.alt}
                  width={BRAND_ASSETS.supplements.reduced.width}
                  height={BRAND_ASSETS.supplements.reduced.height}
                />
              </div>
            </Link>
          )}

          {access.canAccessFitness && (
            <Link
              className="company-operation-card fitness"
              href="/fitness"
              aria-label="Abrir Candinho Fitness"
            >
              <div className="company-operation-logo-wrap">
                <Image
                  src={BRAND_ASSETS.fitness.reduced.src}
                  alt={BRAND_ASSETS.fitness.reduced.alt}
                  width={BRAND_ASSETS.fitness.reduced.width}
                  height={BRAND_ASSETS.fitness.reduced.height}
                />
              </div>
            </Link>
          )}

          {marketingVisible && (
            <Link
              className="company-operation-card marketing"
              href="/marketing"
              aria-label="Abrir Candinho Marketing"
            >
              <div className="company-operation-logo-wrap">
                <Image
                  src={BRAND_ASSETS.marketing.reduced.src}
                  alt={BRAND_ASSETS.marketing.reduced.alt}
                  width={BRAND_ASSETS.marketing.reduced.width}
                  height={BRAND_ASSETS.marketing.reduced.height}
                />
              </div>
            </Link>
          )}
        </div>

        <div className="company-home-operations company-home-operations-secondary">
          {access.canAccessBank && (
            <Link
              className="company-operation-card bank"
              href="/bank"
              aria-label="Abrir Candinho Bank"
            >
              <div className="company-operation-logo-wrap">
                <Image
                  src={BRAND_ASSETS.bank.reduced.src}
                  alt={BRAND_ASSETS.bank.reduced.alt}
                  width={BRAND_ASSETS.bank.reduced.width}
                  height={BRAND_ASSETS.bank.reduced.height}
                />
              </div>
            </Link>
          )}

          {centralVisible && (
            <Link
              className="company-operation-card central"
              href="/central"
              aria-label="Abrir Candinho Central"
            >
              <div className="company-operation-logo-wrap central-logo-wrap">
                <Image
                  src={BRAND_ASSETS.central.reduced.src}
                  alt={BRAND_ASSETS.central.reduced.alt}
                  width={BRAND_ASSETS.central.reduced.width}
                  height={BRAND_ASSETS.central.reduced.height}
                />
              </div>
            </Link>
          )}
        </div>
      </div>

      <div
        className="company-home-selector-actions"
        aria-label="Ações da conta"
      >
        {access.canManageUsers && (
          <>
            <Link
              className="company-home-selector-action"
              href="/configuracoes"
            >
              <UserRound size={16} />
              <span>Perfil</span>
            </Link>

            <Link
              className="company-home-selector-action"
              href="/central/integracoes"
            >
              <Link2 size={16} />
              <span>Integrações</span>
            </Link>
          </>
        )}

        <form action="/auth/signout" method="post">
          <button
            className="company-home-selector-action"
            type="submit"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </section>
  );
}
