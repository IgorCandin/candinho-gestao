"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, Plus } from "lucide-react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import styles from "./storefront-discovery.module.css";
import { carouselTime } from "@/lib/storefront-discovery-selection";

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
  const [dragging, setDragging] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number; time: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const paused = manuallyPaused || hovered || focused || dragging || suspended || !motion;
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
  function moveBy(pixels: number) {
    if (animation.current) {
      const duration = Number(animation.current.effect?.getTiming().duration ?? 0);
      animation.current.currentTime = carouselTime(Number(animation.current.currentTime ?? 0) + pixels / 90 * 1000, duration);
    } else windowRef.current?.scrollBy({ left: pixels, behavior: "instant" });
  }
  useEffect(() => {
    const viewport = windowRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (animation.current) {
        const duration = Number(animation.current.effect?.getTiming().duration ?? 0);
        animation.current.currentTime = carouselTime(Number(animation.current.currentTime ?? 0) + event.deltaX / 90 * 1000, duration);
      } else viewport.scrollLeft += event.deltaX;
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  }, []);
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: Number(animation.current?.currentTime ?? 0), scroll: event.currentTarget.scrollLeft, moved: false };
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.moved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { gesture.current = null; return; }
      if (Math.abs(dx) < 6) return;
      start.moved = true; suppressClick.current = true;
      start.time = Number(animation.current?.currentTime ?? start.time);
      event.currentTarget.setPointerCapture(event.pointerId);
      animation.current?.pause(); setDragging(true);
    }
    event.preventDefault();
    if (animation.current) animation.current.currentTime = carouselTime(start.time - dx / 90 * 1000, Number(animation.current.effect?.getTiming().duration ?? 0));
    else event.currentTarget.scrollLeft = start.scroll - dx;
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function step(direction: number) {
    const element = windowRef.current;
    if (!element) return;
    if (animation.current) moveBy(direction * 280);
    else element.scrollBy({ left: direction * 280, behavior: motion ? "smooth" : "instant" });
  }
  return <section data-scroll-scene className={`${styles.hero} ${fashion ? styles.fashionScene : ""}`} aria-label="Descubra a Vitrine Candinho">
    <div className={styles.heroTop}><span><i /> Disponível para a sua rotina</span></div>
    <div key={operation} className={styles.heroComposition}>
      <div className={styles.heroCopy}><h1>{fashion ? <><span>SEU ESTILO.</span><span>EM</span><span>MOVIMENTO.</span></> : <><span>SEU TREINO.</span><span>OUTRA</span><span>ENERGIA.</span></>}</h1><div className={styles.heroBottomCopy}><p>{fashion ? "Peças que acompanham o seu ritmo. Encontre seu próximo look de treino." : "Encontre suplementos disponíveis para a sua rotina de treino."}</p><button className={styles.roundCta} onClick={() => onExplore(operation)} aria-label={fashion ? "Explorar peças Fitness" : "Explorar suplementos"}>Ver produtos <ArrowUpRight size={18} /></button></div></div>
      <div className={styles.campaignRail}>
        <div ref={windowRef} className={styles.campaignWindow} data-running={motion} data-paused={paused} data-dragging={dragging} onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onDragStart={event => event.preventDefault()} onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={event => { const keyboard = event.target.matches(":focus-visible"); setFocused(keyboard); if (keyboard && animation.current && groupRef.current) { const index = Number(event.target.getAttribute("data-carousel-index") || 0); if(windowRef.current) windowRef.current.scrollLeft = 0; animation.current.currentTime = index * groupRef.current.offsetWidth / Math.max(1,stock.length) / 90 * 1000; } }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} aria-label="Produtos com estoque em movimento">
          <div ref={trackRef} className={styles.campaignTrack}>{[0,1].map(copy => <div ref={copy === 0 ? groupRef : undefined} key={copy} className={styles.campaignGroup} aria-hidden={copy === 1}>{stock.map((product,index) => <button className={styles.campaignSlide} key={product.id} data-carousel-index={index} onPointerDown={event => { if (copy === 1) event.preventDefault(); }} onClick={() => onOpen(product)} aria-label={`Conhecer ${product.name}`} tabIndex={copy === 0 ? 0 : -1}>
            <span className={styles.campaignPhoto}><StorefrontDiscoveryImage src={discoveryImage(product)!} fallback={product.image_url} data-cutout={Boolean(discoveryCutout(product))} alt={product.name} fill sizes="(max-width:650px) 65vw, 280px" loading={copy === 0 ? "eager" : "lazy"} /><span><Plus size={17} /></span></span><strong>{product.name}</strong><span>{price(product)}</span>
          </button>)}</div>)}</div>
        </div>
        <div className={styles.campaignNavigation}><span>{!motion ? "Arraste para explorar ou use as setas" : manuallyPaused ? "Movimento pausado · explore pelas setas" : dragging ? "Você conduz a vitrine" : hovered || focused ? "Arraste para explorar · solte para olhar de perto" : "Deslize, arraste e descubra"}</span><div>{motion && stock.length > 1 && <button aria-label={manuallyPaused ? "Retomar animação de produtos" : "Pausar animação de produtos"} aria-pressed={manuallyPaused} onClick={() => setManuallyPaused(value => !value)}>{manuallyPaused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>}<button aria-label="Produto anterior" onClick={() => step(-1)}><ChevronLeft size={17} /></button><button aria-label="Próximo produto" onClick={() => step(1)}><ChevronRight size={17} /></button></div></div>
      </div>
    </div>
  </section>;
}
