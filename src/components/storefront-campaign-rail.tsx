"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import styles from "./storefront-discovery.module.css";

type Props = { products: PublicStorefrontProduct[]; operation: string; motion: boolean; suspended: boolean; onOpen: (product: PublicStorefrontProduct) => void; onExplore: (operation: string) => void; price: (product: PublicStorefrontProduct) => string };
export function StorefrontCampaign({ products, operation, motion, suspended, onOpen, onExplore, price }: Props) {
  const fashion = operation === "fitness";
  const stock = useMemo(() => {
    const available = products.filter(product => product.operation === operation && product.available && product.image_url);
    const first = available.find(product => fashion ? /top.*short/i.test(product.name) : /creatina.*candinho/i.test(product.name));
    return first ? [first, ...available.filter(product => product.id !== first.id)] : available;
  }, [products, operation, fashion]);
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused || suspended || !motion;
  const pauseRef = useRef(paused);
  useEffect(() => { pauseRef.current = paused; const rect = windowRef.current?.getBoundingClientRect(); if (paused || document.hidden || !rect || rect.bottom <= 0 || rect.top >= innerHeight) animation.current?.pause(); else animation.current?.play(); }, [paused]);
  useEffect(() => {
    const track = trackRef.current, group = groupRef.current, viewport = windowRef.current;
    if (!track || !group || !viewport || stock.length < 2 || !motion) return;
    let visible = true;
    const sync = () => { if (document.hidden || !visible || pauseRef.current) animation.current?.pause(); else animation.current?.play(); };
    const build = () => {
      const progress = animation.current ? Number(animation.current.currentTime ?? 0) / Number(animation.current.effect?.getTiming().duration ?? 1) : 0;
      animation.current?.cancel();
      const width = group.getBoundingClientRect().width;
      const duration = Math.max(1, width / 90 * 1000);
      animation.current = track.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${width}px)` }], { duration, iterations: Infinity, easing: "linear" });
      animation.current.currentTime = progress * duration;
      sync();
    };
    const resize = new ResizeObserver(build);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    resize.observe(group); observer.observe(viewport); document.addEventListener("visibilitychange", sync); build();
    return () => { animation.current?.cancel(); animation.current = null; resize.disconnect(); observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [motion, stock.length]);
  function step(direction: number) {
    const element = windowRef.current;
    if (!element) return;
    if (animation.current) animation.current.currentTime = Math.max(0, Number(animation.current.currentTime ?? 0) + direction * 280 / 90 * 1000);
    else element.scrollBy({ left: direction * 280, behavior: motion ? "smooth" : "instant" });
  }
  return <section data-scroll-scene className={`${styles.hero} ${fashion ? styles.fashionScene : ""}`} aria-label="Descubra a Vitrine Candinho">
    <div className={styles.heroTop}><span><i /> Disponível para a sua rotina</span></div>
    <div key={operation} className={styles.heroComposition}>
      <div className={styles.heroCopy}><h1>{fashion ? <><span>SEU ESTILO.</span><span>EM</span><span>MOVIMENTO.</span></> : <><span>SEU TREINO.</span><span>OUTRA</span><span>ENERGIA.</span></>}</h1><div className={styles.heroBottomCopy}><p>{fashion ? "Peças que acompanham o seu ritmo. Encontre seu próximo look de treino." : "Encontre suplementos disponíveis para a sua rotina de treino."}</p><button className={styles.roundCta} onClick={() => onExplore(operation)} aria-label={fashion ? "Explorar peças Fitness" : "Explorar suplementos"}>Ver produtos <ArrowUpRight size={18} /></button></div></div>
      <div className={styles.campaignRail}>
        <div ref={windowRef} className={styles.campaignWindow} data-running={motion} data-paused={paused} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={event => { const keyboard = event.target.matches(":focus-visible"); setFocused(keyboard); if (keyboard && animation.current && groupRef.current) { const index = Number(event.target.getAttribute("data-carousel-index") || 0); if(windowRef.current) windowRef.current.scrollLeft = 0; animation.current.currentTime = index * groupRef.current.offsetWidth / Math.max(1,stock.length) / 90 * 1000; } }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} aria-label="Produtos com estoque em movimento">
          <div ref={trackRef} className={styles.campaignTrack}>{[0,1].map(copy => <div ref={copy === 0 ? groupRef : undefined} key={copy} className={styles.campaignGroup} aria-hidden={copy === 1}>{stock.map((product,index) => <button className={styles.campaignSlide} key={product.id} data-carousel-index={index} onPointerDown={event => { if (copy === 1) event.preventDefault(); }} onClick={() => onOpen(product)} aria-label={`Conhecer ${product.name}`} tabIndex={copy === 0 ? 0 : -1}>
            <span className={styles.campaignPhoto}><StorefrontDiscoveryImage src={discoveryImage(product)!} fallback={product.image_url} data-cutout={Boolean(discoveryCutout(product))} alt={product.name} fill sizes="(max-width:650px) 65vw, 280px" loading={copy === 0 && index < 6 ? "eager" : "lazy"} /><span><Plus size={17} /></span></span><strong>{product.name}</strong><span>{price(product)}</span>
          </button>)}</div>)}</div>
        </div>
        <div className={styles.campaignNavigation}><span>{!motion ? "Explore pelas setas ou ative o movimento" : hovered || focused ? "Pausado para você explorar" : "Passe o mouse para olhar de perto"}</span><div><button aria-label="Produto anterior" onClick={() => step(-1)}><ChevronLeft size={17} /></button><button aria-label="Próximo produto" onClick={() => step(1)}><ChevronRight size={17} /></button></div></div>
      </div>
    </div>
  </section>;
}
