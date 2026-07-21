import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BadgePercent,
  Crown,
  LogOut,
  Store,
  UserRound,
} from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { getAppBootstrapSnapshot } from "@/lib/central-data";
import { formatCurrency } from "@/lib/format";
import { BRAND_ASSETS } from "@/lib/brand-assets";

function num(source: unknown, key: string) {
  if (!source || typeof source !== "object") return 0;
  return Number((source as Record<string, unknown>)[key] ?? 0);
}

export default async function DashboardPage() {
  const [access, bootstrap] = await Promise.all([
    getCurrentUserAccess(),
    getAppBootstrapSnapshot(),
  ]);

  if (access.role === "partner") redirect("/parceiro");

  const company = BRAND_ASSETS.company.complete;
  const home = bootstrap?.home;
  const supplements = home?.supplements ?? null;
  const fitness = home?.fitness ?? null;
  const bank = home?.bank ?? null;
  const central = home?.central ?? null;
  const marketing = home?.marketing ?? null;

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

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Vendas no mês</small>
                  <strong>{num(supplements, "current_month_sales")}</strong>
                </span>
                <span>
                  <small>Faturamento no mês</small>
                  <strong>{formatCurrency(num(supplements, "current_month_revenue"))}</strong>
                </span>
                <span>
                  <small>Estoque disponível</small>
                  <strong>{num(supplements, "available_units")} un.</strong>
                </span>
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

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Vendas no mês</small>
                  <strong>{num(fitness, "month_sales")}</strong>
                </span>
                <span>
                  <small>Faturamento no mês</small>
                  <strong>{formatCurrency(num(fitness, "month_revenue"))}</strong>
                </span>
                <span>
                  <small>Estoque disponível</small>
                  <strong>{num(fitness, "available_units")} un.</strong>
                </span>
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

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Projetos ativos</small>
                  <strong>{num(marketing, "active_projects")}</strong>
                </span>
                <span>
                  <small>Processados</small>
                  <strong>{num(marketing, "ready_projects")}</strong>
                </span>
                <span>
                  <small>Publicados</small>
                  <strong>{num(marketing, "published_projects")}</strong>
                </span>
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

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Saldo atual</small>
                  <strong>{formatCurrency(num(bank, "total_balance"))}</strong>
                </span>
                <span>
                  <small>A receber no mês</small>
                  <strong>{formatCurrency(num(bank, "receivable_this_month"))}</strong>
                </span>
                <span>
                  <small>Compromissos no mês</small>
                  <strong>
                    {formatCurrency(
                      num(bank, "due_this_month") + num(bank, "invoices_this_month"),
                    )}
                  </strong>
                </span>
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

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Canais configurados</small>
                  <strong>{num(central, "configured_integrations")}</strong>
                </span>
                <span>
                  <small>Contatos</small>
                  <strong>{num(central, "contacts")}</strong>
                </span>
                <span>
                  <small>Mídias</small>
                  <strong>{num(central, "media_assets")}</strong>
                </span>
              </div>
            </Link>
          )}
        </div>

        {access.canManageUsers && (
          <div className="company-home-operations company-home-operations-foundation">
            <Link
              className="company-operation-card physique"
              href="/physique"
              aria-label="Abrir fundação Candinho Physique Athletes"
            >
              <div className="company-operation-logo-wrap physique-logo-wrap">
                <Image
                  src={BRAND_ASSETS.physique.reduced.src}
                  alt={BRAND_ASSETS.physique.reduced.alt}
                  width={BRAND_ASSETS.physique.reduced.width}
                  height={BRAND_ASSETS.physique.reduced.height}
                />
              </div>

              <div className="company-operation-mini-kpis">
                <span>
                  <small>Operação</small>
                  <strong>Em preparação</strong>
                </span>
                <span>
                  <small>Fichas de treino</small>
                  <strong>Base pronta</strong>
                </span>
                <span>
                  <small>Anexos</small>
                  <strong>Preparado</strong>
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="company-home-selector-actions" aria-label="Ações da conta">
        <Link
          className="company-home-selector-action storefront"
          href="/catalogo"
        >
          <Store size={16} />
          <span>Vitrine</span>
        </Link>

        {access.canManageUsers && (
          <>
            <Link
              className="company-home-selector-action executive"
              href="/central/executivo"
            >
              <Crown size={16} />
              <span>Sala do Dono</span>
            </Link>

            <Link
              className="company-home-selector-action promotions"
              href="/promocoes"
            >
              <BadgePercent size={16} />
              <span>Promoções</span>
            </Link>

            <Link
              className="company-home-selector-action"
              href="/configuracoes"
            >
              <UserRound size={16} />
              <span>Perfil</span>
            </Link>
          </>
        )}

        <form action="/auth/signout" method="post">
          <button className="company-home-selector-action" type="submit">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </section>
  );
}
