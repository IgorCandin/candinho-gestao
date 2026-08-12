"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CompanyOperationSlideV4514 = {
  key: string;
  label: string;
  href: string;
  desktopImage?: string;
  mobileImage?: string;
  tone: string;
  rgb: string;
  placeholderTitle?: string;
  placeholderSubtitle?: string;
  desktopFit?: "cover" | "contain";
  badge?: string;
};

export type CompanyShowcaseProductV45243 = {
  id: string;
  name: string;
  imageUrl: string;
  source: "supplements" | "fitness";
};

const AUTOPLAY_MS = 3500;
const REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";

type LoopSlide = CompanyOperationSlideV4514 & {
  loopKey: string;
  logicalIndex: number;
  loopGroup: number;
};

function modulo(value: number, total: number) {
  if (!total) return 0;
  return ((value % total) + total) % total;
}

function pickProduct(
  products: CompanyShowcaseProductV45243[],
  source: CompanyShowcaseProductV45243["source"],
  excludeId?: string,
) {
  const preferred = products.filter(
    (product) =>
      product.source === source &&
      product.id !== excludeId,
  );

  const pool =
    preferred.length > 0
      ? preferred
      : products.filter(
          (product) => product.id !== excludeId,
        );

  if (pool.length === 0) {
    return products[0] ?? null;
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function VitrineProductCoinV45243({
  products,
  active,
}: {
  products: CompanyShowcaseProductV45243[];
  active: boolean;
  reducedMotion: boolean;
}) {
  const firstSupplement =
    products.find(
      (product) => product.source === "supplements",
    ) ?? products[0] ?? null;

  const firstFitness =
    products.find(
      (product) => product.source === "fitness",
    ) ??
    products.find(
      (product) => product.id !== firstSupplement?.id,
    ) ??
    firstSupplement;

  const [frontProduct, setFrontProduct] =
    useState<CompanyShowcaseProductV45243 | null>(
      firstSupplement,
    );

  const [backProduct, setBackProduct] =
    useState<CompanyShowcaseProductV45243 | null>(
      firstFitness,
    );

  const [mobileProduct, setMobileProduct] =
    useState<CompanyShowcaseProductV45243 | null>(
      firstSupplement,
    );

  const mobileSourceRef =
    useRef<CompanyShowcaseProductV45243["source"]>(
      "fitness",
    );

  useEffect(() => {
    if (!products.length) return;

    if (!frontProduct) {
      setFrontProduct(firstSupplement);
    }

    if (!backProduct) {
      setBackProduct(firstFitness);
    }

    if (!mobileProduct) {
      setMobileProduct(firstSupplement);
    }
  }, [
    backProduct,
    firstFitness,
    firstSupplement,
    frontProduct,
    mobileProduct,
    products.length,
  ]);

  useEffect(() => {
    if (!active || products.length <= 1) {
      return;
    }

    let updateFront = true;

    const timer = window.setInterval(() => {
      if (updateFront) {
        setFrontProduct((current) =>
          pickProduct(
            products,
            "supplements",
            current?.id,
          ),
        );
      } else {
        setBackProduct((current) =>
          pickProduct(
            products,
            "fitness",
            current?.id,
          ),
        );
      }

      updateFront = !updateFront;
    }, 1650);

    return () => window.clearInterval(timer);
  }, [
    active,
    products,
  ]);

  useEffect(() => {
    if (!active || products.length <= 1) {
      return;
    }

    let interval: number | null = null;

    function swapMobileProduct() {
      const source = mobileSourceRef.current;

      setMobileProduct((current) =>
        pickProduct(
          products,
          source,
          current?.id,
        ),
      );

      mobileSourceRef.current =
        source === "supplements"
          ? "fitness"
          : "supplements";
    }

    const firstSwap = window.setTimeout(() => {
      swapMobileProduct();

      interval = window.setInterval(
        swapMobileProduct,
        3300,
      );
    }, 1650);

    return () => {
      window.clearTimeout(firstSwap);

      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, [
    active,
    products,
  ]);

  if (!frontProduct && !backProduct && !mobileProduct) {
    return (
      <div
        className="company-vitrine-coin-v45243"
        aria-hidden="true"
      >
        <div className="company-vitrine-coin-float-v45243">
          <div className="company-vitrine-coin-empty-v45243">
            CS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="company-vitrine-coin-v45243"
      data-spinning={active ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="company-vitrine-coin-float-v45243">
        <div className="company-vitrine-coin-inner-v45243 company-vitrine-coin-desktop-v4525">
          <span className="company-vitrine-coin-face-v45243 front">
            {frontProduct && (
              <>
                <img
                  src={frontProduct.imageUrl}
                  alt=""
                  draggable={false}
                />
                <small>Suplementos</small>
              </>
            )}
          </span>

          <span className="company-vitrine-coin-face-v45243 back">
            {backProduct && (
              <>
                <img
                  src={backProduct.imageUrl}
                  alt=""
                  draggable={false}
                />
                <small>Fitness</small>
              </>
            )}
          </span>
        </div>

        <div className="company-vitrine-coin-mobile-v4525">
          <span className="company-vitrine-coin-face-v45243 company-vitrine-coin-mobile-face-v4525">
            {mobileProduct && (
              <>
                <img
                  src={mobileProduct.imageUrl}
                  alt=""
                  draggable={false}
                />
                <small>
                  {mobileProduct.source === "fitness"
                    ? "Fitness"
                    : "Suplementos"}
                </small>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CompanyOperationCarouselV4514({
  operations,
  showcaseProducts = [],
}: {
  operations: CompanyOperationSlideV4514[];
  showcaseProducts?: CompanyShowcaseProductV45243[];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs =
    useRef<Array<HTMLAnchorElement | null>>([]);
  const physicalIndexRef = useRef(0);
  const scrollFrame = useRef(0);
  const settleTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializing = useRef(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [
    activePhysicalIndex,
    setActivePhysicalIndex,
  ] = useState(0);
  const [reducedMotion, setReducedMotion] =
    useState(false);
  const [hoveringActive, setHoveringActive] =
    useState(false);

  const loopSlides = useMemo<LoopSlide[]>(() => {
    if (operations.length <= 1) {
      return operations.map(
        (operation, logicalIndex) => ({
          ...operation,
          loopKey: `${operation.key}-single`,
          logicalIndex,
          loopGroup: 0,
        }),
      );
    }

    return [0, 1, 2, 3, 4].flatMap(
      (loopGroup) =>
        operations.map(
          (operation, logicalIndex) => ({
            ...operation,
            loopKey: `${operation.key}-${loopGroup}`,
            logicalIndex,
            loopGroup,
          }),
        ),
    );
  }, [operations]);

  const middleStart =
    operations.length > 1
      ? operations.length * 2
      : 0;

  const scrollPhysicalTo = useCallback(
    (
      physicalIndex: number,
      behavior: ScrollBehavior =
        reducedMotion ? "auto" : "smooth",
    ) => {
      const track = trackRef.current;
      const slide =
        slideRefs.current[physicalIndex];

      if (!track || !slide) return;

      const target =
        slide.offsetLeft -
        Math.max(
          (track.clientWidth - slide.clientWidth) / 2,
          0,
        );

      physicalIndexRef.current = physicalIndex;
      setActivePhysicalIndex(physicalIndex);
      setActiveIndex(
        loopSlides[physicalIndex]?.logicalIndex ?? 0,
      );

      track.scrollTo({
        left: target,
        behavior,
      });
    },
    [loopSlides, reducedMotion],
  );

  const recenterIfNeeded = useCallback(() => {
    if (operations.length <= 1) return;

    const total = operations.length;
    const current = physicalIndexRef.current;

    if (
      current >= total &&
      current < total * 4
    ) {
      return;
    }

    const logical = modulo(current, total);
    const target = total * 2 + logical;

    if (target !== current) {
      scrollPhysicalTo(target, "auto");
    }
  }, [
    operations.length,
    scrollPhysicalTo,
  ]);

  const goBy = useCallback(
    (amount: number) => {
      if (!operations.length) return;

      if (operations.length === 1) {
        scrollPhysicalTo(0);
        return;
      }

      recenterIfNeeded();

      const next =
        physicalIndexRef.current + amount;

      scrollPhysicalTo(next);
    },
    [
      operations.length,
      recenterIfNeeded,
      scrollPhysicalTo,
    ],
  );

  useEffect(() => {
    const motionMedia =
      window.matchMedia(REDUCED_MOTION_QUERY);

    const sync = () => {
      setReducedMotion(motionMedia.matches);
    };

    sync();
    motionMedia.addEventListener("change", sync);

    return () => {
      motionMedia.removeEventListener(
        "change",
        sync,
      );
    };
  }, []);

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(() => {
        const initial =
          operations.length > 1
            ? middleStart
            : 0;

        scrollPhysicalTo(initial, "auto");
        initializing.current = false;
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    middleStart,
    operations.length,
    scrollPhysicalTo,
  ]);

  useEffect(() => {
    if (
      reducedMotion ||
      hoveringActive ||
      operations.length <= 1
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      goBy(1);
    }, AUTOPLAY_MS);

    return () =>
      window.clearTimeout(timer);
  }, [
    activeIndex,
    hoveringActive,
    goBy,
    operations.length,
    reducedMotion,
  ]);

  function syncActiveFromScroll() {
    cancelAnimationFrame(scrollFrame.current);

    scrollFrame.current =
      requestAnimationFrame(() => {
        const track = trackRef.current;

        if (
          !track ||
          !loopSlides.length
        ) {
          return;
        }

        const viewportCenter =
          track.scrollLeft +
          track.clientWidth / 2;

        let nearest = 0;
        let nearestDistance =
          Number.POSITIVE_INFINITY;

        slideRefs.current.forEach(
          (slide, physicalIndex) => {
            if (!slide) return;

            const center =
              slide.offsetLeft +
              slide.clientWidth / 2;

            const distance =
              Math.abs(
                center - viewportCenter,
              );

            if (
              distance < nearestDistance
            ) {
              nearest = physicalIndex;
              nearestDistance = distance;
            }
          },
        );

        physicalIndexRef.current = nearest;
        setActivePhysicalIndex(nearest);
        setActiveIndex(
          loopSlides[nearest]?.logicalIndex ?? 0,
        );

        if (settleTimer.current) {
          clearTimeout(
            settleTimer.current,
          );
        }

        settleTimer.current =
          setTimeout(() => {
            if (!initializing.current) {
              recenterIfNeeded();
            }
          }, 180);
      });
  }

  function onKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goBy(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goBy(-1);
    }
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(
        scrollFrame.current,
      );

      if (settleTimer.current) {
        clearTimeout(
          settleTimer.current,
        );
      }
    };
  }, []);

  if (!operations.length) return null;

  return (
    <section
      className="company-operation-stream-v4514 company-operation-stream-v45243"
      aria-label="Operações Candinho Company"
      aria-roledescription="carrossel"
      onKeyDown={onKeyDown}
    >
      <div className="company-operation-stage-v4514">
        {operations.length > 1 && (
          <button
            type="button"
            className="company-operation-arrow-v4514 previous"
            aria-label="Operação anterior"
            onClick={() => goBy(-1)}
          >
            <ChevronLeft size={25} />
          </button>
        )}

        <div
          ref={trackRef}
          className="company-operation-track-v4514"
          onScroll={syncActiveFromScroll}
          tabIndex={0}
          aria-label="Deslize ou use as setas para trocar de operação"
        >
          {loopSlides.map(
            (
              operation,
              physicalIndex,
            ) => {
              const active =
                activePhysicalIndex ===
                  physicalIndex ||
                (
                  operation.logicalIndex ===
                    activeIndex &&
                  operations.length === 1
                );

              const style = {
                "--operation-rgb":
                  operation.rgb,
                ...(operation.desktopImage
                  ? {
                      "--operation-image":
                        `url("${operation.desktopImage}")`,
                    }
                  : {}),
              } as CSSProperties;

              const placeholder =
                !operation.desktopImage;

              const PlaceholderIcon =
                operation.key === "physique"
                  ? Activity
                  : Store;

              return (
                <Link
                  key={operation.loopKey}
                  ref={(element) => {
                    slideRefs.current[
                      physicalIndex
                    ] = element;
                  }}
                  href={operation.href}
                  onClick={(event) => {
                    if (active) return;

                    event.preventDefault();
                    setHoveringActive(false);
                    scrollPhysicalTo(physicalIndex);
                  }}
                  onMouseMove={() => {
                    if (active) {
                      setHoveringActive(true);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveringActive(false);
                  }}
                  className={`company-operation-slide-v4514 tone-${operation.tone}`}
                  data-active={
                    active
                      ? "true"
                      : "false"
                  }
                  data-desktop-fit={
                    operation.desktopFit ??
                    "cover"
                  }
                  data-placeholder={
                    placeholder
                      ? "true"
                      : "false"
                  }
                  aria-label={`Abrir Candinho ${operation.label}`}
                  style={style}
                >
                  {placeholder ? (
                    <div className="company-operation-placeholder-v4524">
                      <div className="company-operation-placeholder-icon-v4524">
                        <PlaceholderIcon />
                      </div>
                      <span>
                        Candinho Company
                      </span>
                      <strong>
                        {operation.placeholderTitle ??
                          operation.label}
                      </strong>
                      <small>
                        {operation.placeholderSubtitle ??
                          "Acesso integrado à operação."}
                      </small>
                    </div>
                  ) : (
                    <picture>
                      <source
                        media="(max-width: 820px)"
                        srcSet={
                          operation.mobileImage ??
                          operation.desktopImage
                        }
                      />
                      <img
                        src={
                          operation.desktopImage
                        }
                        alt={`Candinho ${operation.label}`}
                        loading={
                          operation.loopGroup ===
                            2
                            ? "eager"
                            : "lazy"
                        }
                        draggable={false}
                      />
                    </picture>
                  )}

                  {operation.key ===
                    "vitrine" && (
                    <VitrineProductCoinV45243
                      products={
                        showcaseProducts
                      }
                      active={active}
                      reducedMotion={
                        reducedMotion
                      }
                    />
                  )}

                  {operation.badge ? (
                    <span className="company-operation-badge-v4514">
                      {operation.badge}
                    </span>
                  ) : null}

                  <span className="company-operation-enter-v4514">
                    Abrir operação
                    <ChevronRight
                      size={15}
                    />
                  </span>
                </Link>
              );
            },
          )}
        </div>

        {operations.length > 1 && (
          <button
            type="button"
            className="company-operation-arrow-v4514 next"
            aria-label="Próxima operação"
            onClick={() => goBy(1)}
          >
            <ChevronRight size={25} />
          </button>
        )}
      </div>

      <span
        className="company-operation-live-v4514"
        aria-live="polite"
      >
        {operations[activeIndex]?.label} selecionado.
      </span>
    </section>
  );
}
