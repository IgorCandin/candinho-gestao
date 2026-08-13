/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type ProductMedia = {
  image_url: string | null;
  banner_image_url: string | null;
  secondary_image_url: string | null;
};

type Slide =
  | {
      kind: "banner";
      url: string;
    }
  | {
      kind: "pair";
      photo1: string | null;
      photo3: string | null;
    };

function supplementProductId(pathname: string) {
  const match = pathname.match(
    /^\/(?:suplementos\/)?produtos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i,
  );

  return match?.[1] ?? null;
}

function Gallery({
  media,
}: {
  media: ProductMedia;
}) {
  const slides = useMemo<Slide[]>(() => {
    const result: Slide[] = [];

    if (media.banner_image_url) {
      result.push({
        kind: "banner",
        url: media.banner_image_url,
      });
    }

    if (media.image_url || media.secondary_image_url) {
      result.push({
        kind: "pair",
        photo1: media.image_url,
        photo3: media.secondary_image_url,
      });
    }

    return result;
  }, [media]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [
    media.banner_image_url,
    media.image_url,
    media.secondary_image_url,
  ]);

  if (slides.length === 0) {
    return (
      <div className="product-media-gallery-empty-v4537">
        <ImageIcon size={30} />
        <span>Sem fotos cadastradas</span>
      </div>
    );
  }

  const current = slides[index] ?? slides[0];
  const multiple = slides.length > 1;

  function move(direction: -1 | 1) {
    setIndex((currentIndex) =>
      (currentIndex + direction + slides.length) %
      slides.length,
    );
  }

  return (
    <div className="product-media-gallery-v4537">
      <div
        className="product-media-gallery-stage-v4537"
        data-kind={current.kind}
      >
        {multiple && (
          <button
            type="button"
            className="product-media-gallery-arrow-v4537 previous"
            aria-label="Foto anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {current.kind === "banner" ? (
          <div className="product-media-gallery-banner-v4537">
            <img
              src={current.url}
              alt="Foto 02 · Banner"
            />
            <span>Foto 02 · Banner</span>
          </div>
        ) : (
          <div className="product-media-gallery-pair-v4537">
            {current.photo1 && (
              <figure>
                <img
                  src={current.photo1}
                  alt="Foto 01 · Produto"
                />
                <figcaption>
                  Foto 01 · Produto
                </figcaption>
              </figure>
            )}

            {current.photo3 && (
              <figure>
                <img
                  src={current.photo3}
                  alt="Foto 03 · Nutrição"
                />
                <figcaption>
                  Foto 03 · Nutrição
                </figcaption>
              </figure>
            )}
          </div>
        )}

        {multiple && (
          <button
            type="button"
            className="product-media-gallery-arrow-v4537 next"
            aria-label="Próxima foto"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {multiple && (
        <div className="product-media-gallery-pagination-v4537">
          {slides.map((slide, slideIndex) => (
            <button
              type="button"
              key={`${slide.kind}-${slideIndex}`}
              data-active={slideIndex === index ? "true" : "false"}
              onClick={() => setIndex(slideIndex)}
            >
              {slide.kind === "banner"
                ? "Foto 02"
                : "Fotos 01 + 03"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductMediaGalleryPortalV4537({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname() || "";
  const productId = supplementProductId(pathname);

  const [media, setMedia] = useState<ProductMedia | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !productId) {
      setMedia(null);
      return;
    }

    let cancelled = false;

    async function load() {
      const { data, error } = await createClient()
        .from("products")
        .select(
          "image_url,banner_image_url,secondary_image_url",
        )
        .eq("id", productId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setMedia(null);
        return;
      }

      setMedia({
        image_url:
          typeof data.image_url === "string"
            ? data.image_url
            : null,
        banner_image_url:
          typeof data.banner_image_url === "string"
            ? data.banner_image_url
            : null,
        secondary_image_url:
          typeof data.secondary_image_url === "string"
            ? data.secondary_image_url
            : null,
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, productId]);

  useEffect(() => {
    if (!enabled || !productId) {
      setHost(null);
      return;
    }

    let frame = 0;
    let observer: MutationObserver | null = null;

    function attach() {
      const panel = document.querySelector<HTMLElement>(
        ".product-photo-body-v45221",
      );

      if (!panel) return false;

      let portalHost =
        panel.querySelector<HTMLElement>(
          "[data-product-media-gallery-v4537]",
        );

      if (!portalHost) {
        portalHost = document.createElement("div");
        portalHost.dataset.productMediaGalleryV4537 = "true";
        panel.prepend(portalHost);
      }

      const oldUploader =
        panel.querySelector<HTMLElement>(
          ".product-image-grid",
        );

      if (oldUploader) {
        oldUploader.dataset.hiddenByGalleryV4537 = "true";
        oldUploader.style.display = "none";
      }

      setHost(portalHost);
      return true;
    }

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (frame) return;

        frame = window.requestAnimationFrame(() => {
          frame = 0;

          if (attach()) {
            observer?.disconnect();
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer?.disconnect();

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      const oldUploader =
        document.querySelector<HTMLElement>(
          '[data-hidden-by-gallery-v4537="true"]',
        );

      if (oldUploader) {
        oldUploader.style.display = "";
        delete oldUploader.dataset.hiddenByGalleryV4537;
      }

      document
        .querySelector(
          "[data-product-media-gallery-v4537]",
        )
        ?.remove();

      setHost(null);
    };
  }, [enabled, productId]);

  if (!host || !media) return null;

  return createPortal(
    <Gallery media={media} />,
    host,
  );
}
