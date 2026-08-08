"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type CompanyOperationSlideV4514 = {
  key: string;
  label: string;
  href: string;
  desktopImage: string;
  mobileImage: string;
  tone: string;
  rgb: string;
  desktopFit?: "cover" | "contain";
};

const AUTOPLAY_MS = 2500;
const DESKTOP_QUERY = "(min-width: 821px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function normalizedIndex(index: number, total: number) {
  if (!total) return 0;
  return ((index % total) + total) % total;
}

export function CompanyOperationCarouselV4514({
  operations,
}: {
  operations: CompanyOperationSlideV4514[];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const scrollFrame = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const goTo = useCallback(
    (
      index: number,
      behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth",
    ) => {
      const total = operations.length;
      const next = normalizedIndex(index, total);
      const track = trackRef.current;
      const slide = slideRefs.current[next];

      if (!track || !slide) return;

      const target =
        slide.offsetLeft -
        Math.max((track.clientWidth - slide.clientWidth) / 2, 0);

      track.scrollTo({
        left: target,
        behavior,
      });

      setActiveIndex(next);
    },
    [operations.length, reducedMotion],
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
    if (
      !desktop ||
      paused ||
      reducedMotion ||
      operations.length <= 1
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      goTo(activeIndex + 1);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    desktop,
    goTo,
    operations.length,
    paused,
    reducedMotion,
  ]);

  useEffect(() => {
    // Center the first permitted operation after hydration.
    const frame = window.requestAnimationFrame(() => {
      goTo(0, "auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [goTo]);

  function syncActiveFromScroll() {
    cancelAnimationFrame(scrollFrame.current);

    scrollFrame.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || !operations.length) return;

      const viewportCenter =
        track.scrollLeft + track.clientWidth / 2;

      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      slideRefs.current.forEach((slide, index) => {
        if (!slide) return;

        const center = slide.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(center - viewportCenter);

        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });

      setActiveIndex(nearest);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  }

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
            onClick={() => goTo(activeIndex - 1)}
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
          {operations.map((operation, index) => {
            const active = index === activeIndex;

            const style = {
              "--operation-rgb": operation.rgb,
              "--operation-image": `url("${operation.desktopImage}")`,
            } as CSSProperties;

            return (
              <Link
                key={operation.key}
                ref={(element) => {
                  slideRefs.current[index] = element;
                }}
                href={operation.href}
                className={`company-operation-slide-v4514 tone-${operation.tone}`}
                data-active={active ? "true" : "false"}
                data-desktop-fit={operation.desktopFit ?? "cover"}
                aria-label={`Abrir Candinho ${operation.label}`}
                aria-current={active ? "true" : undefined}
                style={style}
              >
                <picture>
                  <source
                    media="(max-width: 820px)"
                    srcSet={operation.mobileImage}
                  />
                  <img
                    src={operation.desktopImage}
                    alt={`Candinho ${operation.label}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </picture>

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
            onClick={() => goTo(activeIndex + 1)}
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
              onClick={() => goTo(index)}
            />
          ))}
        </div>

        <span className="company-operation-position-v4514">
          {String(activeIndex + 1).padStart(2, "0")}
          <i>/</i>
          {String(operations.length).padStart(2, "0")}
        </span>
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

      <span className="sr-only" aria-live="polite">
        {operations[activeIndex]?.label} selecionado.
      </span>
    </section>
  );
}
