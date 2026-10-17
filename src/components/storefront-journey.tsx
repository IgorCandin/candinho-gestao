"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Heart, Plus } from "lucide-react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import styles from "./storefront-discovery.module.css";

type Props = {
  products: PublicStorefrontProduct[];
  saved: string[];
  price: (product: PublicStorefrontProduct) => string;
  onOpen: (product: PublicStorefrontProduct) => void;
  onSave: (product: PublicStorefrontProduct) => void;
};

export function StorefrontJourney({ products, saved, price, onOpen, onSave }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const scrollIntent = useRef(false);
  const currentProduct = useRef(0);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    const element = root.current;
    const windowElement = viewport.current;
    if (!element || !windowElement) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    function update() {
      frame = 0;
      if (!element || !windowElement || preference.matches) return;
      const rect = element.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(windowElement).top) || 0;
      const distance = Math.max(1, element.offsetHeight - windowElement.offsetHeight);
      const progress = Math.max(0, Math.min(1, (top - rect.top) / distance));
      const position = progress * (products.length - 1);
      const current = Math.round(position);
      // Focus/scrollIntoView must never replace a button under a pending click.
      // Product changes follow deliberate scrolling or the navigation controls.
      if (current !== currentProduct.current && !scrollIntent.current) return;
      currentProduct.current = current;
      element.style.setProperty("--journey-progress", String(progress));
      element.style.setProperty("--journey-position", String(current));
      element.style.setProperty("--journey-depth", String(position - current));
      setActive(current);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const intendScroll = () => { scrollIntent.current = true; };
    const scrollEnded = () => { scrollIntent.current = false; };
    const keyboardScroll = (event: KeyboardEvent) => {
      if ((event.target as Element)?.closest("input,textarea,select")) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) intendScroll();
    };
    const scrollbar = (event: PointerEvent) => { if (event.clientX >= document.documentElement.clientWidth) intendScroll(); };
    const preferenceChanged = () => { setEnhanced(!preference.matches); schedule(); };
    const initial = requestAnimationFrame(preferenceChanged);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", intendScroll, { passive: true, capture: true });
    window.addEventListener("touchmove", intendScroll, { passive: true, capture: true });
    window.addEventListener("keydown", keyboardScroll, true);
    window.addEventListener("pointerdown", scrollbar, true);
    window.addEventListener("scrollend", scrollEnded);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelAnimationFrame(initial); cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", intendScroll, true); window.removeEventListener("touchmove", intendScroll, true);
      window.removeEventListener("keydown", keyboardScroll, true); window.removeEventListener("pointerdown", scrollbar, true);
      window.removeEventListener("scrollend", scrollEnded);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, [products.length]);

  function go(index: number) {
    const element = root.current;
    const windowElement = viewport.current;
    if (!element || !windowElement) return;
    const top = parseFloat(getComputedStyle(windowElement).top) || 0;
    const distance = element.offsetHeight - windowElement.offsetHeight;
    scrollIntent.current = true;
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - top + distance * index / Math.max(1, products.length - 1), behavior: "smooth" });
  }

  return <div ref={root} className={styles.journey} data-enhanced={enhanced} style={{ "--journey-count": products.length } as CSSProperties} aria-label="Descoberta de produtos pela rolagem">
    <div ref={viewport} className={styles.journeyWindow}>
      <div className={styles.journeyTrack}>
        {products.map((product, index) => {
          const isSaved = saved.includes(`${product.operation}:${product.id}`);
          const visible = !enhanced || active === index;
          return <article key={product.id} className={styles.journeyPanel} aria-hidden={!visible} inert={!visible}>
            <button className={styles.journeyPhoto} tabIndex={visible ? 0 : -1} onClick={() => onOpen(product)} aria-label={`Ver detalhes de ${product.name}`}>
              {product.image_url && <StorefrontDiscoveryImage src={discoveryImage(product)!} fallback={product.image_url} data-cutout={Boolean(discoveryCutout(product))} alt={product.name} fill sizes="(max-width:650px) 80vw, 520px" loading={index <= active + 1 ? "eager" : "lazy"} />}
              <span>Olhe de perto <Plus size={18} /></span>
            </button>
            <div className={styles.journeyCopy}>
              <span>{product.category || (product.operation === "fitness" ? "Fitness" : "Suplementos")}</span>
              <h3>{product.name}</h3><strong>{price(product)}</strong>
              <span className={styles.journeyStock}><i /> Disponível agora</span>
              <div className={styles.journeyActions}><button tabIndex={visible ? 0 : -1} onClick={() => onOpen(product)}>Conhecer produto <ArrowRight size={17} /></button><button tabIndex={visible ? 0 : -1} onClick={() => onSave(product)} aria-label={`${isSaved ? "Remover" : "Salvar"} ${product.name}`} aria-pressed={isSaved}><Heart size={19} fill={isSaved ? "currentColor" : "none"} /></button></div>
            </div>
          </article>;
        })}
      </div>
      {enhanced && <div className={styles.journeyNavigation}><span><ArrowDown size={15} /> Role para descobrir</span><div><button aria-label="Voltar na descoberta" disabled={active === 0} onClick={() => go(active - 1)}><ArrowLeft size={17} /></button><span>{active + 1} / {products.length}</span><button aria-label="Avançar na descoberta" disabled={active === products.length - 1} onClick={() => go(active + 1)}><ArrowRight size={17} /></button></div><div className={styles.journeyProgress} aria-hidden="true"><span /></div></div>}
    </div>
  </div>;
}
