import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Dumbbell,
  Flame,
  Shirt,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type {
  PublicStorefrontProduct,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";
import type {
  PublicStorefrontTopSeller,
} from "@/lib/public-storefront-top-sellers";

type ProductLink = {
  product_id: string;
  slug: string;
  name: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function uniqueProducts(products: PublicStorefrontProduct[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = `${product.operation}:${product.id}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function productHref(
  product: PublicStorefrontProduct,
  links: ProductLink[],
) {
  if (product.operation === "fitness") {
    return "/catalogo/fitness";
  }

  const byId = links.find((item) => item.product_id === product.id);
  const byName = links.find(
    (item) =>
      normalize(item.name) === normalize(product.name),
  );
  const match = byId ?? byName;

  return match?.slug
    ? `/catalogo/${match.slug}`
    : "/catalogo/suplementos";
}

function matchAny(
  product: PublicStorefrontProduct,
  terms: string[],
) {
  const haystack = normalize(
    `${product.name} ${product.category ?? ""} ${product.notes ?? ""}`,
  );

  return terms.some((term) =>
    haystack.includes(normalize(term)),
  );
}

function GoalCard({
  eyebrow,
  title,
  copy,
  href,
  icon: Icon,
  products,
  links,
  tone,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
  icon: typeof Dumbbell;
  products: PublicStorefrontProduct[];
  links: ProductLink[];
  tone: string;
}) {
  const preview = products.slice(0, 3);

  return (
    <Link
      href={href}
      className={`storefront-editorial-goal-v4526 tone-${tone}`}
    >
      <div className="storefront-editorial-goal-copy-v4526">
        <span>
          <Icon size={15} />
          {eyebrow}
        </span>
        <h3>{title}</h3>
        <p>{copy}</p>
        <b>
          Explorar
          <ArrowRight size={14} />
        </b>
      </div>

      <div className="storefront-editorial-goal-products-v4526">
        {preview.map((product) => (
          <span key={`${product.operation}:${product.id}`}>
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Sparkles size={18} />
            )}
          </span>
        ))}
      </div>
    </Link>
  );
}

export function PublicStorefrontEditorialV4526({
  snapshot,
  links,
  topSellers = [],
}: {
  snapshot: PublicStorefrontSnapshot;
  links: ProductLink[];
  topSellers?: PublicStorefrontTopSeller[];
}) {
  const supplements =
    snapshot.products.supplements.filter(
      (product) => product.available,
    );
  const fitness =
    snapshot.products.fitness.filter(
      (product) => product.available,
    );
  const all = uniqueProducts([
    ...supplements,
    ...fitness,
  ]);

  const activePromotions = [
    ...snapshot.promotions.supplements,
    ...snapshot.promotions.fitness,
  ]
    .filter(
      (promotion) =>
        promotion.promotion_status === "active" &&
        promotion.stock_status === "available",
    )
    .sort(
      (a, b) =>
        b.discount_pct - a.discount_pct,
    );

  const promotedProducts = activePromotions
    .map((promotion) =>
      all.find(
        (product) =>
          product.id === promotion.product_id &&
          product.operation === promotion.operation,
      ),
    )
    .filter(
      (
        product,
      ): product is PublicStorefrontProduct =>
        Boolean(product),
    );

  const monthlyFavorites = uniqueProducts([
    ...promotedProducts,
    ...supplements.slice(0, 3),
    ...fitness.slice(0, 3),
  ]).slice(0, 6);

  const gainProducts = supplements.filter((product) =>
    matchAny(product, [
      "whey",
      "protein",
      "creatina",
      "hipercal",
      "massa",
      "bcaa",
    ]),
  );

  const leanProducts = supplements.filter((product) =>
    matchAny(product, [
      "cafeina",
      "cafeína",
      "cromo",
      "termogen",
      "l-carn",
      "chá",
      "cha",
    ]),
  );

  const performanceProducts = supplements.filter((product) =>
    matchAny(product, [
      "pré-treino",
      "pre treino",
      "pre-treino",
      "beta alanina",
      "creatina",
      "cafeina",
      "cafeína",
    ]),
  );

  const goalFallbackSupplements =
    supplements.slice(0, 3);

  return (
    <section className="storefront-editorial-v4526">
      <header className="storefront-editorial-heading-v4526">
        <div>
          <span>DESCUBRA DO SEU JEITO</span>
          <h2>
            Comece pelo que você quer alcançar.
          </h2>
        </div>
        <p>
          Em vez de jogar todos os produtos na tela,
          a Vitrine te ajuda a chegar mais rápido no
          que faz sentido para o seu momento.
        </p>
      </header>

      <div className="storefront-editorial-goals-v4526">
        <GoalCard
          eyebrow="Objetivo"
          title="Quero ganhar massa"
          copy="Proteína, creatina e opções procuradas para uma rotina voltada a ganho de massa."
          href="/catalogo/suplementos"
          icon={Dumbbell}
          products={
            gainProducts.length
              ? gainProducts
              : goalFallbackSupplements
          }
          links={links}
          tone="mass"
        />

        <GoalCard
          eyebrow="Objetivo"
          title="Quero reduzir gordura"
          copy="Descubra itens normalmente buscados por quem está organizando dieta, cardio e treino."
          href="/catalogo/suplementos"
          icon={Flame}
          products={
            leanProducts.length
              ? leanProducts
              : goalFallbackSupplements
          }
          links={links}
          tone="lean"
        />

        <GoalCard
          eyebrow="Performance"
          title="Quero treinar melhor"
          copy="Energia, força e performance para encontrar rapidamente o que combina com o seu treino."
          href="/catalogo/suplementos"
          icon={TrendingUp}
          products={
            performanceProducts.length
              ? performanceProducts
              : goalFallbackSupplements
          }
          links={links}
          tone="performance"
        />

        <GoalCard
          eyebrow="Fitness"
          title="Quero renovar o look"
          copy="Peças Fitness, cores e opções disponíveis para montar seu próximo conjunto."
          href="/catalogo/fitness"
          icon={Shirt}
          products={fitness.slice(0, 3)}
          links={links}
          tone="fitness"
        />
      </div>

      {topSellers.length > 0 && (
        <section className="storefront-editorial-top3-v4527">
          <header>
            <div>
              <span>
                <Star size={15} />
                INDICAÇÃO DO CANDIN
              </span>
              <h2>Top 3 mais vendidos</h2>
            </div>
            <p>
              Ranking real pelo histórico total de
              unidades vendidas no ERP. Só entram
              produtos que ainda possuem estoque
              disponível agora.
            </p>
          </header>

          <div className="storefront-editorial-top3-grid-v4527">
            {topSellers.slice(0, 3).map(
              (seller, index) => (
                <Link
                  href={seller.href}
                  key={`${seller.operation}:${seller.product_id}`}
                  className="storefront-editorial-top3-card-v4527"
                >
                  <div className="storefront-editorial-top3-rank-v4527">
                    <span>TOP</span>
                    <strong>{index + 1}</strong>
                  </div>

                  <div className="storefront-editorial-top3-image-v4527">
                    {seller.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={seller.image_url}
                        alt={seller.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Sparkles size={34} />
                    )}
                  </div>

                  <div className="storefront-editorial-top3-copy-v4527">
                    <span>
                      {seller.operation === "fitness"
                        ? "Candinho Fitness"
                        : "Candinho Suplementos"}
                    </span>
                    <h3>{seller.name}</h3>
                    <p>
                      <strong>
                        {seller.units_sold.toLocaleString("pt-BR")}
                      </strong>{" "}
                      unidades vendidas no histórico
                    </p>
                    <small>
                      {seller.available_quantity.toLocaleString("pt-BR")}{" "}
                      em estoque agora ·{" "}
                      {formatCurrency(seller.price_from)}
                    </small>
                  </div>

                  <ArrowRight
                    className="storefront-editorial-top3-arrow-v4527"
                    size={18}
                  />
                </Link>
              ),
            )}
          </div>
        </section>
      )}

      {monthlyFavorites.length > 0 && (
        <section className="storefront-editorial-favorites-v4526">
          <header>
            <div>
              <span>SELEÇÃO DO MÊS</span>
              <h2>Queridinhos do mês</h2>
            </div>
            <small>
              Produtos disponíveis e destaques atuais
              da Vitrine.
            </small>
          </header>

          <div className="storefront-editorial-favorites-row-v4526">
            {monthlyFavorites.map(
              (product, index) => (
                <Link
                  href={productHref(
                    product,
                    links,
                  )}
                  key={`${product.operation}:${product.id}`}
                  className="storefront-editorial-favorite-card-v4526"
                >
                  <div>
                    <b>
                      {String(index + 1).padStart(
                        2,
                        "0",
                      )}
                    </b>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Sparkles size={28} />
                    )}
                  </div>
                  <span>
                    {product.operation ===
                    "fitness"
                      ? "Fitness"
                      : product.category ??
                        "Suplementos"}
                  </span>
                  <strong>{product.name}</strong>
                  <small>
                    {formatCurrency(
                      product.price_from,
                    )}
                  </small>
                </Link>
              ),
            )}
          </div>
        </section>
      )}

      {activePromotions.length > 0 && (
        <section className="storefront-editorial-promos-v4526">
          <header>
            <span>
              <BadgePercent size={15} />
              AGORA NA VITRINE
            </span>
            <h2>Ofertas que merecem atenção</h2>
          </header>

          <div>
            {activePromotions
              .slice(0, 3)
              .map((promotion) => (
                <article
                  key={`${promotion.operation}:${promotion.id}`}
                >
                  <div>
                    {promotion.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          promotion.image_url
                        }
                        alt={promotion.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <BadgePercent
                        size={30}
                      />
                    )}
                  </div>
                  <span>
                    {promotion.promotion_name}
                  </span>
                  <strong>
                    {promotion.name}
                  </strong>
                  <p>
                    <small>
                      {formatCurrency(
                        promotion.current_price,
                      )}
                    </small>
                    <b>
                      {formatCurrency(
                        promotion.promotional_price,
                      )}
                    </b>
                  </p>
                </article>
              ))}
          </div>
        </section>
      )}

      <div className="storefront-editorial-catalog-divider-v4526">
        <span>CATÁLOGO COMPLETO</span>
        <h2>Quer escolher por conta própria?</h2>
        <p>
          A busca completa continua logo abaixo, com
          filtros, promoções, tamanhos, cores e
          disponibilidade.
        </p>
      </div>
    </section>
  );
}
