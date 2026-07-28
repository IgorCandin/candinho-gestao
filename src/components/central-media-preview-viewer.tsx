/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export function CentralMediaPreviewViewer({
  url,
  alt,
}: {
  url: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setScale(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setScale(1);
  }

  return (
    <>
      <button
        className="central-media-viewer-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar ${alt}`}
      >
        <div className="central-media-viewer-stage is-image">
          <img src={url} alt={alt} />
        </div>

        <span className="central-media-viewer-hint">
          <Maximize2 size={13} />
          Ampliar
        </span>
      </button>

      {open && (
        <div
          className="central-media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada de ${alt}`}
          onClick={close}
        >
          <div
            className="central-media-lightbox-head"
            onClick={(event) => event.stopPropagation()}
          >
            <strong>{alt}</strong>

            <div className="central-media-lightbox-actions">
              <button
                type="button"
                onClick={() =>
                  setScale((current) => Math.max(1, current - 0.5))
                }
                disabled={scale <= 1}
                aria-label="Diminuir imagem"
              >
                <Minus size={17} />
              </button>

              <button
                type="button"
                onClick={() => setScale(1)}
                aria-label="Restaurar tamanho"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setScale((current) => Math.min(4, current + 0.5))
                }
                disabled={scale >= 4}
                aria-label="Aumentar imagem"
              >
                <Plus size={17} />
              </button>

              <button type="button" onClick={close} aria-label="Fechar">
                <X size={19} />
              </button>
            </div>
          </div>

          <div
            className="central-media-lightbox-stage"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={url}
              alt={alt}
              style={{ width: `${scale * 100}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
