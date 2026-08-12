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

const AUTOPLAY_MS = 2500;
const DESKTOP_QUERY = "(min-width: 821px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type LoopSlide = CompanyOperationSlideV4514 & {
  loopKey: string;
  logicalIndex: number;
  loopGroup: number;
};

function modulo(value: number, total: number) {
  if (!total) return 0;
  return ((value % total) + total) % total;
}

export function CompanyOperationCarouselV4514({
  operations,
}: {
  operations: CompanyOperationSlideV4514[];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const physicalIndexRef = useRef(0);
  const scrollFrame = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializing = useRef(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [activePhysicalIndex, setActivePhysicalIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const loopSlides = useMemo<LoopSlide[]>(() => {
    if (operations.length <= 1) {
      return operations.map((operation, logicalIndex) => ({
        ...operation,
        loopKey: `${operation.key}-single`,
        logicalIndex,
        loopGroup: 0,
      }));
    }

    return [0, 1, 2].flatMap((loopGroup) =>
      operations.map((operation, logicalIndex) => ({
        ...operation,
        loopKey: `${operation.key}-${loopGroup}`,
        logicalIndex,
        loopGroup,
      })),
    );
  }, [operations]);

  const middleStart = operations.length > 1 ? operations.length : 0;

  const scrollPhysicalTo = useCallback(
    (
      physicalIndex: number,
      behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth",
    ) => {
      const track = trackRef.current;
      const slide = slideRefs.current[physicalIndex];

      if (!track || !slide) return;

      const target =
        slide.offsetLeft -
        Math.max((track.clientWidth - slide.clientWidth) / 2, 0);

      physicalIndexRef.current = physicalIndex;
      setActivePhysicalIndex(physicalIndex);
      setActiveIndex(loopSlides[physicalIndex]?.logicalIndex ?? 0);

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
    let target = current;

    // Keep the user inside the middle copy. The jump is invisible because
    // the destination slide is pixel-identical to the current one.
    if (current < total) target = current + total;
    if (current >= total * 2) target = current - total;

    if (target !== current) {
      scrollPhysicalTo(target, "auto");
    }
  }, [operations.length, scrollPhysicalTo]);

  const goBy = useCallback(
    (amount: number) => {
      if (!operations.length) return;

      if (operations.length === 1) {
        scrollPhysicalTo(0);
        return;
      }

      recenterIfNeeded();

      const next = physicalIndexRef.current + amount;
      scrollPhysicalTo(next);
    },
    [
      operations.length,
      recenterIfNeeded,
      scrollPhysicalTo,
    ],
  );

  const goToLogical = useCallback(
    (logicalIndex: number) => {
      if (!operations.length) return;

      const logical = modulo(logicalIndex, operations.length);

      if (operations.length === 1) {
        scrollPhysicalTo(0);
        return;
      }

      recenterIfNeeded();

      const current = physicalIndexRef.current;
      const candidates = [
        logical,
        logical + operations.length,
        logical + operations.length * 2,
      ];

      const nearest = candidates.reduce((best, candidate) =>
        Math.abs(candidate - current) < Math.abs(best - current)
          ? candidate
          : best,
      );

      scrollPhysicalTo(nearest);
    },
    [
      operations.length,
      recenterIfNeeded,
      scrollPhysicalTo,
    ],
  );

  useEffect(() => {
    const desktopMedia = window.matchMedia(DESKTOP_QUERY);
    const motionMedia = window.matchMedia(REDUCED_MOTION_QUERY);

    const sync = () => {
      setDesktop(desktopMedia.matches);
      setReducedMotion(motionMedia.matches);
    };

    sync();
    desktopMedia.addEventListener("change", sync);
    motionMedia.addEventListener("change", sync);

    return () => {
      desktopMedia.removeEventListener("change", sync);
      motionMedia.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const initial = operations.length > 1 ? middleStart : 0;
      scrollPhysicalTo(initial, "auto");
      initializing.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [middleStart, operations.length, scrollPhysicalTo]);

  useEffect(() => {
    if (
      !desktop ||
      paused ||
      reducedMotion ||
      operations.length <= 1
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      goBy(1);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    desktop,
    goBy,
    operations.length,
    paused,
    reducedMotion,
  ]);

  function syncActiveFromScroll() {
    cancelAnimationFrame(scrollFrame.current);

    scrollFrame.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || !loopSlides.length) return;

      const viewportCenter =
        track.scrollLeft + track.clientWidth / 2;

      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      slideRefs.current.forEach((slide, physicalIndex) => {
        if (!slide) return;

        const center = slide.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(center - viewportCenter);

        if (distance < nearestDistance) {
          nearest = physicalIndex;
          nearestDistance = distance;
        }
      });

      physicalIndexRef.current = nearest;
      setActivePhysicalIndex(nearest);
      setActiveIndex(loopSlides[nearest]?.logicalIndex ?? 0);

      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }

      settleTimer.current = setTimeout(() => {
        if (!initializing.current) recenterIfNeeded();
      }, 140);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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
      cancelAnimationFrame(scrollFrame.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  if (!operations.length) return null;

  return (
    <section
      className="company-operation-stream-v4514"
      aria-label="Operações Candinho Company"
      aria-roledescription="carrossel"
      onMouseEnter={() => desktop && setPaused(true)}
      onMouseLeave={() => desktop && setPaused(false)}
      onFocusCapture={() => desktop && setPaused(true)}
      onBlurCapture={(event) => {
        if (
          desktop &&
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setPaused(false);
        }
      }}
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
          {loopSlides.map((operation, physicalIndex) => {
            const active =
              activePhysicalIndex === physicalIndex ||
              (
                operation.logicalIndex === activeIndex &&
                operations.length === 1
              );

            const style = {
              "--operation-rgb": operation.rgb,
              ...(operation.desktopImage
                ? {
                    "--operation-image": `url("${operation.desktopImage}")`,
                  }
                : {}),
            } as CSSProperties;

            const placeholder = !operation.desktopImage;
            const PlaceholderIcon =
              operation.key === "physique" ? Activity : Store;

            return (
              <Link
                key={operation.loopKey}
                ref={(element) => {
                  slideRefs.current[physicalIndex] = element;
                }}
                href={operation.href}
                className={`company-operation-slide-v4514 tone-${operation.tone}`}
                data-active={active ? "true" : "false"}
                data-desktop-fit={operation.desktopFit ?? "cover"}
                data-placeholder={placeholder ? "true" : "false"}
                aria-label={`Abrir Candinho ${operation.label}`}
                style={style}
              >
                {placeholder ? (
                  <div className="company-operation-placeholder-v4524">
                    <div className="company-operation-placeholder-icon-v4524">
                      <PlaceholderIcon />
                    </div>
                    <span>Candinho Company</span>
                    <strong>
                      {operation.placeholderTitle ?? operation.label}
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
                      srcSet={operation.mobileImage ?? operation.desktopImage}
                    />
                    <img
                      src={operation.desktopImage}
                      alt={`Candinho ${operation.label}`}
                      loading={
                        operation.loopGroup === 1 ? "eager" : "lazy"
                      }
                      draggable={false}
                    />
                  </picture>
                )}

                {operation.badge ? (
                  <span className="company-operation-badge-v4514">
                    {operation.badge}
                  </span>
                ) : null}

                <span className="company-operation-enter-v4514">
                  Abrir operação
                  <ChevronRight size={15} />
                </span>
              </Link>
            );
          })}
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

      <div
        className="company-operation-pager-v4514"
        aria-label="Selecionar operação"
      >
        <div className="company-operation-dots-v4514">
          {operations.map((operation, index) => (
            <button
              key={operation.key}
              type="button"
              className={index === activeIndex ? "active" : ""}
              aria-label={`Ir para ${operation.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => goToLogical(index)}
            />
          ))}
        </div>
      </div>

      {desktop && operations.length > 1 && !reducedMotion && (
        <div
          key={`${activeIndex}-${paused ? "paused" : "playing"}`}
          className={`company-operation-progress-v4514 ${
            paused ? "paused" : ""
          }`}
          aria-hidden="true"
        >
          <span />
        </div>
      )}

      <span
        className="company-operation-live-v4514"
        aria-live="polite"
      >
        {operations[activeIndex]?.label} selecionado.
      </span>
    </section>
  );
}
