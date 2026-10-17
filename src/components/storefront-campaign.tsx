"use client";

import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import { ArrowUpRight, Plus, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import styles from "./storefront-discovery.module.css";

type Props = {
  products: PublicStorefrontProduct[];
  operation: string;
  onOpen: (product: PublicStorefrontProduct) => void;
  onExplore: (operation: string) => void;
  price: (product: PublicStorefrontProduct) => string;
  suspended: boolean;
};

export function StorefrontCampaign({ products, operation, onOpen, onExplore, price, suspended }: Props) {
  const fashion = operation === "fitness";
  const operationProducts = useMemo(() => {
    const stock = products.filter(p => p.available && p.image_url && p.operation === operation);
    const first = stock.find(p => fashion ? /top.*short/i.test(p.name) : /creatina.*candinho/i.test(p.name));
    return first ? [first, ...stock.filter(p => p.id !== first.id)] : stock;
  }, [products, operation, fashion]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const root = useRef<HTMLElement>(null);
  const inView = useRef(true);
  const selected = operationProducts[index % Math.max(1, operationProducts.length)];
  const next = operationProducts[(index + 1) % Math.max(1, operationProducts.length)];
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = requestAnimationFrame(() => setPaused(preference.matches));
    const change = () => setPaused(preference.matches);
    preference.addEventListener("change", change);
    const observer = new IntersectionObserver(([entry]) => { inView.current = entry.isIntersecting; });
    if (root.current) observer.observe(root.current);
    return () => { cancelAnimationFrame(start); observer.disconnect(); preference.removeEventListener("change", change); };
  }, []);
  useEffect(() => {
    if (paused || interacting || hovered || suspended || operationProducts.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && inView.current) setIndex(previous => (previous + 1) % operationProducts.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, hovered, suspended, operationProducts.length]);
  const step = (direction: number) => { setPaused(true); setIndex(previous => (previous + direction + operationProducts.length) % operationProducts.length); };

  return <section ref={root} data-scroll-scene className={`${styles.hero} ${fashion ? styles.fashionScene : ""}`} aria-label="Descubra a Vitrine Candinho" onFocusCapture={event => setInteracting(!event.target.closest('[aria-label="Produtos em destaque"]'))} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className={styles.heroTop}><span><i /> Destaque da Vitrine</span></div>
    <div key={operation} className={styles.heroComposition}>
      <div className={styles.heroCopy}>
        <h1 key={fashion ? "fashion-title" : "training-title"}>{fashion ? <><span>SEU ESTILO.</span><span>EM</span><span>MOVIMENTO.</span></> : <><span>SEU TREINO.</span><span>OUTRA</span><span>ENERGIA.</span></>}</h1>
        <div className={styles.heroBottomCopy}><p>{fashion ? "Peças que acompanham o seu ritmo. Encontre seu próximo look de treino." : "Encontre suplementos disponíveis para a sua rotina de treino."}</p><button className={styles.roundCta} onClick={() => onExplore(selected?.operation ?? "all")} aria-label={fashion ? "Explorar peças Fitness" : "Explorar suplementos"}>Ver produtos <ArrowUpRight size={18} /></button></div>
      </div>
      <div className={styles.stage} onPointerMove={event => {
        if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--pointer-x", String((event.clientX - rect.left) / rect.width - .5));
        event.currentTarget.style.setProperty("--pointer-y", String((event.clientY - rect.top) / rect.height - .5));
      }} onPointerLeave={event => {
        event.currentTarget.style.setProperty("--pointer-x", "0");
        event.currentTarget.style.setProperty("--pointer-y", "0");
      }}>
        {next && next.id !== selected?.id && <div className={styles.nextCampaignPhoto} aria-hidden="true"><StorefrontDiscoveryImage src={discoveryImage(next)!} fallback={next.image_url} alt="" fill sizes="(max-width: 650px) 85vw, 520px" loading="eager" /></div>}
        {selected && <button key={selected.id} className={styles.mainShot} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onOpen(selected)} aria-label={`Conhecer ${selected.name}`}>
          {discoveryImage(selected) && <StorefrontDiscoveryImage data-cutout={Boolean(discoveryCutout(selected))} src={discoveryImage(selected)!} fallback={selected.image_url} alt={selected.name} fill sizes="(max-width: 650px) 85vw, 520px" priority />}
          <span className={styles.quickLook}>Olhe de perto <Plus size={17} /></span>
        </button>}
        {selected && <div key={`ticket-${selected.id}`} className={styles.productTicket}><span><i /> Disponível agora</span><strong>{selected.name}</strong><span>{price(selected)}</span></div>}
        {operationProducts.length > 1 && <div className={styles.rotationControls} role="group" aria-label="Produtos em destaque"><button aria-label="Produto anterior" onClick={() => step(-1)}><ChevronLeft size={16} /></button><span>{index % operationProducts.length + 1} / {operationProducts.length}</span><button aria-label="Próximo produto" onClick={() => step(1)}><ChevronRight size={16} /></button><button onClick={() => setPaused(value => !value)} aria-label={paused ? "Iniciar troca automática" : "Pausar troca automática"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div>}
      </div>
    </div>
  </section>;
}
