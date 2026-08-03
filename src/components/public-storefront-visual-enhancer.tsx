"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  PublicStorefrontProduct,
  PublicStorefrontSnapshot,
} from "@/lib/public-storefront-data";
import styles from "./public-storefront-visual-enhancer.module.css";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

type OpenGallery = {
  item: PublicStorefrontProduct;
  index: number;
};

export function PublicStorefrontVisualEnhancer({
  snapshot,
}: {
  snapshot: PublicStorefrontSnapshot;
}) {
  const [open, setOpen] = useState<OpenGallery | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, PublicStorefrontProduct>();

    for (const item of snapshot.products.supplements) {
      map.set(`supplements:${normalize(item.name)}`, item);
    }

    for (const item of snapshot.products.fitness) {
      map.set(`fitness:${normalize(item.name)}`, item);
    }

    return map;
  }, [snapshot.products]);

  useEffect(() => {
    const cleanup: Array<() => void> = [];
    let frame = 0;

    function enhanceCard(
      card: HTMLElement,
      operation: "supplements" | "fitness",
    ) {
      if (card.dataset.visualEnhanced === "true") return;
      if (card.classList.contains("public-storefront-promotion-card")) return;

      const name =
        card.querySelector<HTMLElement>(".public-storefront-card-copy h3")
          ?.textContent ?? "";

      const item = productMap.get(
        `${operation}:${normalize(name)}`,
      );

      if (!item) return;
      const product = item;

      const imageWrap =
        card.querySelector<HTMLElement>(".public-storefront-card-image");

      if (!imageWrap) return;
      const wrapper = imageWrap;

      const image =
        wrapper.querySelector<HTMLImageElement>("img");

      const slides =
        product.images.length > 0
          ? product.images
          : product.image_url
            ? [
                {
                  url: product.image_url,
                  color: null,
                  label: null,
                  kind: "product" as const,
                  available_quantity: 0,
                },
              ]
            : [];

      card.dataset.visualEnhanced = "true";
      wrapper.classList.add(styles.imageWrap);

      if (product.notes?.trim()) {
        const copy =
          card.querySelector<HTMLElement>(".public-storefront-card-copy");

        if (copy && !copy.querySelector("[data-storefront-notes]")) {
          const notes = document.createElement("p");
          notes.dataset.storefrontNotes = "true";
          notes.className = styles.notes;
          notes.textContent = product.notes.trim();
          notes.title = product.notes.trim();
          copy.appendChild(notes);
        }
      }

      if (!image || slides.length === 0) return;

      // Referências não-nulas estabilizadas antes dos callbacks.
      // O TS não mantém o narrowing original dentro de closures.
      const productImage = image;
      const productSlides = slides;
      let index = 0;

      function renderSlide() {
        const slide = productSlides[index] ?? productSlides[0];
        if (!slide) return;

        productImage.src = slide.url;
        productImage.alt = [
          product.name,
          slide.color || slide.label,
        ].filter(Boolean).join(" · ");

        const label =
          wrapper.querySelector<HTMLElement>(
            "[data-storefront-slide-label]",
          );

        if (label) {
          label.textContent =
            slide.color || slide.label || "";
          label.hidden = !label.textContent;
        }

        const counter =
          wrapper.querySelector<HTMLElement>(
            "[data-storefront-slide-counter]",
          );

        if (counter) {
          counter.textContent = `${index + 1}/${productSlides.length}`;
        }

        const dots = wrapper.querySelectorAll<HTMLElement>(
          "[data-storefront-slide-dot]",
        );

        dots.forEach((dot, dotIndex) => {
          dot.dataset.active =
            dotIndex === index ? "true" : "false";
        });
      }

      const zoom = document.createElement("button");
      zoom.type = "button";
      zoom.className = styles.zoomButton;
      zoom.setAttribute("aria-label", `Ampliar foto de ${product.name}`);
      zoom.innerHTML =
        '<span aria-hidden="true">↗</span><span>Ver foto</span>';

      const onZoom = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen({ item: product, index });
      };

      zoom.addEventListener("click", onZoom);
      wrapper.appendChild(zoom);

      cleanup.push(() => {
        zoom.removeEventListener("click", onZoom);
      });

      const onImageClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen({ item: product, index });
      };

      productImage.style.cursor = "zoom-in";
      productImage.addEventListener("click", onImageClick);

      cleanup.push(() => {
        productImage.removeEventListener("click", onImageClick);
      });

      const label = document.createElement("span");
      label.dataset.storefrontSlideLabel = "true";
      label.className = styles.slideLabel;
      wrapper.appendChild(label);

      if (productSlides.length > 1) {
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = `${styles.arrow} ${styles.previous}`;
        previous.setAttribute("aria-label", "Foto anterior");
        previous.textContent = "‹";

        const next = document.createElement("button");
        next.type = "button";
        next.className = `${styles.arrow} ${styles.next}`;
        next.setAttribute("aria-label", "Próxima foto");
        next.textContent = "›";

        const counter = document.createElement("span");
        counter.dataset.storefrontSlideCounter = "true";
        counter.className = styles.counter;

        const dots = document.createElement("div");
        dots.className = styles.dots;

        productSlides.forEach((_, dotIndex) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.dataset.storefrontSlideDot = "true";
          dot.className = styles.dot;
          dot.setAttribute(
            "aria-label",
            `Abrir foto ${dotIndex + 1}`,
          );

          const onDot = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            index = dotIndex;
            renderSlide();
          };

          dot.addEventListener("click", onDot);
          dots.appendChild(dot);

          cleanup.push(() => {
            dot.removeEventListener("click", onDot);
          });
        });

        const onPrevious = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          index =
            (index - 1 + productSlides.length) %
            productSlides.length;
          renderSlide();
        };

        const onNext = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          index = (index + 1) % productSlides.length;
          renderSlide();
        };

        previous.addEventListener("click", onPrevious);
        next.addEventListener("click", onNext);

        wrapper.append(previous, next, counter, dots);

        cleanup.push(() => {
          previous.removeEventListener("click", onPrevious);
          next.removeEventListener("click", onNext);
        });
      }

      renderSlide();
    }

    function apply() {
      frame = 0;

      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".public-storefront-blocks > section",
        ),
      );

      for (const block of blocks) {
        const title =
          block.querySelector<HTMLElement>("header h2")?.textContent ?? "";

        const normalized = normalize(title);
        const operation =
          normalized === "fitness"
            ? "fitness"
            : normalized === "suplementos"
              ? "supplements"
              : null;

        if (!operation) continue;

        const cards = Array.from(
          block.querySelectorAll<HTMLElement>(
            ".public-storefront-card",
          ),
        );

        cards.forEach((card) => enhanceCard(card, operation));
      }
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    }

    apply();

    const host = document.querySelector(
      ".public-storefront-browser",
    );

    const observer = new MutationObserver(schedule);

    if (host) {
      observer.observe(host, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      cleanup.forEach((fn) => fn());
    };
  }, [productMap]);

  useEffect(() => {
    if (!open) return;

    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
      }

      if (event.key === "ArrowLeft") {
        setOpen((current) => {
          if (!current) return current;

          const total = current.item.images.length || 1;
          return {
            ...current,
            index:
              (current.index - 1 + total) % total,
          };
        });
      }

      if (event.key === "ArrowRight") {
        setOpen((current) => {
          if (!current) return current;

          const total = current.item.images.length || 1;
          return {
            ...current,
            index: (current.index + 1) % total,
          };
        });
      }
    }

    window.addEventListener("keydown", keydown);

    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", keydown);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const slides =
    open.item.images.length > 0
      ? open.item.images
      : open.item.image_url
        ? [
            {
              url: open.item.image_url,
              color: null,
              label: null,
              kind: "product" as const,
              available_quantity: 0,
            },
          ]
        : [];

  const current = slides[open.index] ?? slides[0];
  if (!current) return null;

  function move(direction: -1 | 1) {
    setOpen((value) => {
      if (!value) return value;

      const total = slides.length;
      return {
        ...value,
        index:
          (value.index + direction + total) % total,
      };
    });
  }

  return createPortal(
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Galeria de ${open.item.name}`}
      onClick={() => setOpen(null)}
    >
      <div
        className={styles.lightboxPanel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.lightboxHead}>
          <div>
            <strong>{open.item.name}</strong>
            <span>
              {current.color ||
                current.label ||
                "Foto do produto"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.lightboxStage}>
          {slides.length > 1 && (
            <button
              className={styles.lightboxArrow}
              type="button"
              onClick={() => move(-1)}
              aria-label="Foto anterior"
            >
              <ChevronLeft size={25} />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={[
              open.item.name,
              current.color || current.label,
            ]
              .filter(Boolean)
              .join(" · ")}
          />

          {slides.length > 1 && (
            <button
              className={styles.lightboxArrow}
              type="button"
              onClick={() => move(1)}
              aria-label="Próxima foto"
            >
              <ChevronRight size={25} />
            </button>
          )}
        </div>

        <div className={styles.lightboxFooter}>
          <span>
            <ImageIcon size={14} />
            {open.index + 1} de {slides.length}
          </span>

          <div>
            {slides.map((slide, index) => (
              <button
                key={`${slide.url}-${index}`}
                type="button"
                data-active={
                  index === open.index
                    ? "true"
                    : "false"
                }
                onClick={() =>
                  setOpen((value) =>
                    value
                      ? { ...value, index }
                      : value,
                  )
                }
              >
                {slide.color || slide.label || index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
