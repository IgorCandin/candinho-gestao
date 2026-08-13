"use client";

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
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type {
  PublicStorefrontProduct,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";
import type {
  PublicStorefrontTopSeller,
} from "@/lib/public-storefront-top-sellers";
import styles from "./public-storefront-goal-modal-v45-31.module.css";

type ProductLink = {
  product_id: string;
  slug: string;
  name: string | null;
};

type GoalModalData = {
  key: string;
  eyebrow: string;
  title: string;
  copy: string;
  tone: string;
  catalogHref: string;
  catalogLabel: string;
  products: PublicStorefrontProduct[];
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

function sortByRelevance(
  products: PublicStorefrontProduct[],
  orderedTerms: string[],
) {
  return [...products].sort((a, b) => {
    const haystackA = normalize(
      `${a.name} ${a.category ?? ""} ${a.notes ?? ""}`,
    );
    const haystackB = normalize(
      `${b.name} ${b.category ?? ""} ${b.notes ?? ""}`,
    );

    const rank = (haystack: string) => {
      const index = orderedTerms.findIndex((term) =>
        haystack.includes(normalize(term)),
      );
      return index === -1 ? orderedTerms.length : index;
    };

    const rankA = rank(haystackA);
    const rankB = rank(haystackB);

    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function GoalCard({
  eyebrow,
  title,
  copy,
  icon: Icon,
  products,
  tone,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  icon: typeof Dumbbell;
  products: PublicStorefrontProduct[];
  tone: string;
  onOpen: () => void;
}) {
  const preview = products.slice(0, 3);

  return (
    <button
      type="button"
      className={`storefront-editorial-goal-v4526 tone-${tone} ${styles.goalTrigger}`}
      onClick={onOpen}
      aria-haspopup="dialog"
    >
      <div className="storefront-editorial-goal-copy-v4526">
        <span>
          <Icon size={15} />
          {eyebrow}
        </span>
        <h3>{title}</h3>
        <p>{copy}</p>
        <b>
          Ver seleção
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
    </button>
  );
}

function GoalProductsModal({
  goal,
  links,
  onClose,
}: {
  goal: GoalModalData;
  links: ProductLink[];
  onClose: () => void;
}) {
  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        className={`${styles.modal} ${styles[`tone_${goal.tone}`] ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`goal-title-${goal.key}`}
      >
        <header className={styles.modalHeader}>
          <div>
            <span>{goal.eyebrow}</span>
            <h2 id={`goal-title-${goal.key}`}>{goal.title}</h2>
            <p>{goal.copy}</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar seleção"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.modalMeta}>
          <div>
            <strong>{goal.products.length}</strong>
            <span>
              {goal.products.length === 1
                ? "opção disponível agora"
                : "opções disponíveis agora"}
            </span>
          </div>
          <small>
            A seleção usa os produtos com estoque disponível na Vitrine.
          </small>
        </div>

        <div className={styles.productGrid}>
          {goal.products.map((product) => (
            <Link
              href={productHref(product, links)}
              className={styles.productCard}
              key={`${goal.key}:${product.operation}:${product.id}`}
              onClick={onClose}
            >
              <div className={styles.productImage}>
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Sparkles size={30} />
                )}
              </div>

              <div className={styles.productCopy}>
                <span>
                  {product.operation === "fitness"
                    ? "Candinho Fitness"
                    : product.category ?? "Suplementos"}
                </span>
                <strong>{product.name}</strong>
                <p>{formatCurrency(product.price_from)}</p>
                <small>
                  Ver produto <ArrowRight size={12} />
                </small>
              </div>
            </Link>
          ))}
        </div>

        <footer className={styles.modalFooter}>
          <p>
            Quer comparar com outras opções? O catálogo completo continua
            disponível normalmente.
          </p>
          <Link href={goal.catalogHref} onClick={onClose}>
            {goal.catalogLabel}
            <ArrowRight size={14} />
          </Link>
        </footer>
      </section>
    </div>
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
  const [activeGoal, setActiveGoal] = useState<GoalModalData | null>(null);

  useEffect(() => {
    if (!activeGoal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveGoal(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeGoal]);

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

  const gainProducts = sortByRelevance(
    supplements.filter((product) =>
      matchAny(product, [
        "creatina",
        "whey",
        "protein",
        "hipercal",
        "massa",
        "bcaa",
        "hmb",
        "amino",
      ]),
    ),
    [
      "creatina",
      "whey",
      "protein",
      "hipercal",
      "massa",
      "bcaa",
      "hmb",
      "amino",
    ],
  );

  const leanProducts = sortByRelevance(
    supplements.filter((product) =>
      matchAny(product, [
        "cromo",
        "termogen",
        "thermo",
        "cafeina",
        "cafeína",
        "l-carn",
        "carnitina",
        "chá",
        "cha",
      ]),
    ),
    [
      "cromo",
      "termogen",
      "thermo",
      "cafeina",
      "cafeína",
      "l-carn",
      "carnitina",
      "chá",
      "cha",
    ],
  );

  const performanceProducts = sortByRelevance(
    supplements.filter((product) =>
      matchAny(product, [
        "pré-treino",
        "pre treino",
        "pre-treino",
        "creatina",
        "beta alanina",
        "cafeina",
        "cafeína",
        "taurina",
        "citrulina",
        "bcaa",
      ]),
    ),
    [
      "pré-treino",
      "pre treino",
      "pre-treino",
      "creatina",
      "beta alanina",
      "cafeina",
      "cafeína",
      "taurina",
      "citrulina",
      "bcaa",
    ],
  );

  const goalFallbackSupplements =
    supplements.slice(0, 3);

  const goals: GoalModalData[] = [
    {
      key: "mass",
      eyebrow: "OBJETIVO · GANHO DE MASSA",
      title: "Quero ganhar massa",
      copy:
        "Creatinas, Wheys, proteínas, hipercalóricos e outros itens disponíveis para uma rotina voltada ao ganho de massa.",
      tone: "mass",
      catalogHref: "/catalogo/suplementos",
      catalogLabel: "Ver todos os suplementos",
      products:
        gainProducts.length > 0
          ? gainProducts
          : goalFallbackSupplements,
    },
    {
      key: "lean",
      eyebrow: "OBJETIVO · REDUÇÃO DE GORDURA",
      title: "Quero reduzir gordura",
      copy:
        "Termogênicos, cafeína, cromo e outras opções normalmente procuradas por quem está organizando dieta, cardio e treino.",
      tone: "lean",
      catalogHref: "/catalogo/suplementos",
      catalogLabel: "Ver todos os suplementos",
      products:
        leanProducts.length > 0
          ? leanProducts
          : goalFallbackSupplements,
    },
    {
      key: "performance",
      eyebrow: "OBJETIVO · PERFORMANCE",
      title: "Quero treinar melhor",
      copy:
        "Pré-treinos, creatina, beta-alanina, cafeína e outros itens disponíveis ligados a energia, força e desempenho.",
      tone: "performance",
      catalogHref: "/catalogo/suplementos",
      catalogLabel: "Ver todos os suplementos",
      products:
        performanceProducts.length > 0
          ? performanceProducts
          : goalFallbackSupplements,
    },
    {
      key: "fitness",
      eyebrow: "FITNESS · LOOK",
      title: "Quero renovar o look",
      copy:
        "Todas as peças Fitness disponíveis agora para você comparar modelos, cores e opções.",
      tone: "fitness",
      catalogHref: "/catalogo/fitness",
      catalogLabel: "Abrir catálogo Fitness",
      products: fitness,
    },
  ];

  const goalByKey = Object.fromEntries(
    goals.map((goal) => [goal.key, goal]),
  ) as Record<string, GoalModalData>;

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
          icon={Dumbbell}
          products={goalByKey.mass.products}
          tone="mass"
          onOpen={() => setActiveGoal(goalByKey.mass)}
        />

        <GoalCard
          eyebrow="Objetivo"
          title="Quero reduzir gordura"
          copy="Descubra itens normalmente buscados por quem está organizando dieta, cardio e treino."
          icon={Flame}
          products={goalByKey.lean.products}
          tone="lean"
          onOpen={() => setActiveGoal(goalByKey.lean)}
        />

        <GoalCard
          eyebrow="Performance"
          title="Quero treinar melhor"
          copy="Energia, força e performance para encontrar rapidamente o que combina com o seu treino."
          icon={TrendingUp}
          products={goalByKey.performance.products}
          tone="performance"
          onOpen={() => setActiveGoal(goalByKey.performance)}
        />

        <GoalCard
          eyebrow="Fitness"
          title="Quero renovar o look"
          copy="Peças Fitness, cores e opções disponíveis para montar seu próximo conjunto."
          icon={Shirt}
          products={goalByKey.fitness.products}
          tone="fitness"
          onOpen={() => setActiveGoal(goalByKey.fitness)}
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

      {activeGoal && (
        <GoalProductsModal
          goal={activeGoal}
          links={links}
          onClose={() => setActiveGoal(null)}
        />
      )}
    </section>
  );
}
