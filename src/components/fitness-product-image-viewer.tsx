/* eslint-disable @next/next/no-img-element */
"use client";

import { ImageOff, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

export function FitnessProductImageViewer({
  imageUrl,
  alt,
}: {
  imageUrl: string | null;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setScale(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setScale(1);
  }

  if (!imageUrl) {
    return (
      <article className="panel" style={{ padding: 18 }}>
        <div
          style={{
            minHeight: 230,
            display: "grid",
            placeItems: "center",
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

  return (
    <>
      <article className="panel" style={{ padding: 14 }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Ampliar foto de ${alt}`}
          style={{
            width: "100%",
            padding: 0,
            border: "1px solid var(--line)",
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(255,255,255,.018)",
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
              src={imageUrl}
              alt={alt}
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
        </button>
      </article>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada de ${alt}`}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0,0,0,.88)",
            display: "grid",
            gridTemplateRows: "auto 1fr",
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
            <strong
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {alt}
            </strong>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setScale((current) => Math.max(1, current - 0.5))}
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
                onClick={() => setScale((current) => Math.min(3, current + 0.5))}
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
              src={imageUrl}
              alt={alt}
              style={{
                display: "block",
                width: `${scale * 100}%`,
                maxWidth: "none",
                height: "auto",
                minHeight: scale === 1 ? "100%" : undefined,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

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
