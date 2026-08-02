/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FitnessProductGalleryImage } from "@/lib/fitness-product-gallery-data";

export function FitnessProductImageViewer({
  images,
  alt,
}: {
  images: FitnessProductGalleryImage[];
  alt: string;
}) {
  const gallery = useMemo(
    () => images.filter((image) => Boolean(image.url)),
    [images],
  );

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (index >= gallery.length) {
      setIndex(0);
    }
  }, [gallery.length, index]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setScale(1);
      }

      if (event.key === "ArrowLeft") {
        move(-1);
      }

      if (event.key === "ArrowRight") {
        move(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  function move(direction: -1 | 1) {
    if (gallery.length <= 1) return;

    setIndex((current) =>
      (current + direction + gallery.length) %
      gallery.length,
    );
    setScale(1);
  }

  function close() {
    setOpen(false);
    setScale(1);
  }

  if (gallery.length === 0) {
    return (
      <article className="panel" style={{ padding: 18 }}>
        <div
          style={{
            minHeight: 230,
            display: "grid",
            placeItems: "center",
            alignContent: "center",
            gap: 10,
            color: "var(--muted)",
            border: "1px dashed var(--line)",
            borderRadius: 16,
          }}
        >
          <ImageOff size={34} />
          <span>Produto sem foto cadastrada</span>
        </div>
      </article>
    );
  }

  const current = gallery[index] ?? gallery[0];

  return (
    <>
      <article className="panel" style={{ padding: 14 }}>
        <div
          style={{
            position: "relative",
            border: "1px solid var(--line)",
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(255,255,255,.018)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Ampliar foto de ${alt}`}
            style={{
              width: "100%",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "zoom-in",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                minHeight: 280,
                maxHeight: 520,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,.02)",
              }}
            >
              <img
                src={current.url}
                alt={`${alt} · ${current.label}`}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  maxHeight: 520,
                  objectFit: "contain",
                }}
              />
            </div>

            <span
              style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 10px",
                borderRadius: 999,
                background: "rgba(10,10,12,.78)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                backdropFilter: "blur(8px)",
              }}
            >
              <Maximize2 size={14} />
              Toque para ampliar
            </span>

            <span
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                maxWidth: "50%",
                overflow: "hidden",
                padding: "8px 10px",
                borderRadius: 999,
                background: "rgba(10,10,12,.78)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {current.label}
            </span>
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => move(-1)}
                style={{
                  ...carouselControl,
                  left: 10,
                }}
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                aria-label="Próxima foto"
                onClick={() => move(1)}
                style={{
                  ...carouselControl,
                  right: 10,
                }}
              >
                <ChevronRight size={21} />
              </button>

              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  padding: "6px 8px",
                  borderRadius: 999,
                  background: "rgba(10,10,12,.75)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {index + 1}/{gallery.length}
              </span>
            </>
          )}
        </div>

        {gallery.length > 1 && (
          <div
            style={{
              marginTop: 9,
              display: "flex",
              gap: 7,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {gallery.map((image, imageIndex) => (
              <button
                key={`${image.url}-${imageIndex}`}
                type="button"
                onClick={() => {
                  setIndex(imageIndex);
                  setScale(1);
                }}
                title={image.label}
                style={{
                  flex: "0 0 78px",
                  height: 72,
                  padding: 4,
                  border:
                    imageIndex === index
                      ? "1px solid var(--fitness)"
                      : "1px solid var(--line)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background:
                    imageIndex === index
                      ? "rgba(236,72,153,.06)"
                      : "rgba(255,255,255,.015)",
                  cursor: "pointer",
                }}
              >
                <img
                  src={image.url}
                  alt={image.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 7,
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </article>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria ampliada de ${alt}`}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0,0,0,.9)",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            padding: 12,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              paddingBottom: 10,
              color: "#fff",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {alt}
              </strong>
              <small style={{ color: "#b7bdc7" }}>
                {current.label}
              </small>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setScale((value) =>
                    Math.max(1, value - 0.5),
                  )
                }
                disabled={scale <= 1}
                aria-label="Diminuir foto"
                style={controlStyle}
              >
                <Minus size={17} />
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                aria-label="Voltar ao tamanho original"
                style={controlStyle}
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setScale((value) =>
                    Math.min(3, value + 0.5),
                  )
                }
                disabled={scale >= 3}
                aria-label="Aumentar foto"
                style={controlStyle}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar foto"
                style={controlStyle}
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              minHeight: 0,
              display: "grid",
              gridTemplateColumns:
                gallery.length > 1
                  ? "46px minmax(0,1fr) 46px"
                  : "1fr",
              alignItems: "center",
              gap: 7,
            }}
          >
            {gallery.length > 1 && (
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Foto anterior"
                style={controlStyle}
              >
                <ChevronLeft size={21} />
              </button>
            )}

            <div
              style={{
                height: "100%",
                minHeight: 0,
                overflow: "auto",
                borderRadius: 16,
                background: "#fff",
                display: "grid",
                alignItems: scale === 1 ? "center" : "start",
                justifyItems: scale === 1 ? "center" : "start",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <img
                src={current.url}
                alt={`${alt} · ${current.label}`}
                style={{
                  display: "block",
                  width: `${scale * 100}%`,
                  maxWidth: "none",
                  height: "auto",
                  minHeight:
                    scale === 1 ? "100%" : undefined,
                  objectFit: "contain",
                }}
              />
            </div>

            {gallery.length > 1 && (
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Próxima foto"
                style={controlStyle}
              >
                <ChevronRight size={21} />
              </button>
            )}
          </div>

          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              paddingTop: 10,
              display: "flex",
              gap: 6,
              overflowX: "auto",
            }}
          >
            {gallery.map((image, imageIndex) => (
              <button
                key={`${image.url}-modal-${imageIndex}`}
                type="button"
                onClick={() => {
                  setIndex(imageIndex);
                  setScale(1);
                }}
                style={{
                  minHeight: 34,
                  padding: "0 10px",
                  border:
                    imageIndex === index
                      ? "1px solid #ec4899"
                      : "1px solid rgba(255,255,255,.18)",
                  borderRadius: 999,
                  background:
                    imageIndex === index
                      ? "rgba(236,72,153,.16)"
                      : "rgba(255,255,255,.07)",
                  color: "#fff",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {image.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const carouselControl = {
  position: "absolute",
  top: "50%",
  width: 38,
  height: 48,
  transform: "translateY(-50%)",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 11,
  background: "rgba(10,10,12,.72)",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  backdropFilter: "blur(7px)",
} as const;

const controlStyle = {
  width: 38,
  height: 38,
  border: "1px solid rgba(255,255,255,.2)",
  borderRadius: 10,
  background: "rgba(255,255,255,.09)",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
} as const;
