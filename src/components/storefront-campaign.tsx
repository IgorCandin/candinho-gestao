"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import styles from "./storefront-discovery.module.css";

type Props = {
  products: PublicStorefrontProduct[];
  onOpen: (product: PublicStorefrontProduct) => void;
  onExplore: (operation: string) => void;
  price: (product: PublicStorefrontProduct) => string;
};

export function StorefrontCampaign({ products, onOpen, onExplore, price }: Props) {
  const [scene, setScene] = useState(0);
  const picks = [
    products.find(p => p.operation === "supplements" && /creatina.*candinho/i.test(p.name)),
    products.find(p => p.operation === "fitness" && /top.*short/i.test(p.name)),
    products.find(p => p.operation === "supplements" && /whey.*soldiers/i.test(p.name)),
  ].filter((p): p is PublicStorefrontProduct => Boolean(p));
  const selected = picks[scene % Math.max(picks.length, 1)] ?? products[0];
  const fashion = selected?.operation === "fitness";
  const supporting = products.filter(p => p.image_url && p.operation === selected?.operation && p.id !== selected?.id && (fashion || discoveryCutout(p))).slice(0, 2);
  const change = (delta: number) => setScene(v => (v + delta + picks.length) % Math.max(picks.length, 1));

  return <section data-scroll-scene className={`${styles.hero} ${fashion ? styles.fashionScene : ""}`} aria-label="Descubra a Vitrine Candinho">
    <div className={styles.heroTop}><span><i /> Suplementos & Fitness</span><span>Uma escolha muda o ritmo.</span></div>
    <div className={styles.heroComposition}>
      <div className={styles.heroCopy}>
        <h1 key={fashion ? "fashion-title" : "training-title"}>{fashion ? <>SEU ESTILO.<br />EM <em>MOVIMENTO.</em></> : <>SEU TREINO.<br />OUTRA <em>ENERGIA.</em></>}</h1>
        <div className={styles.heroBottomCopy}><p>{fashion ? "Peças que acompanham o seu ritmo. Encontre seu próximo look de treino." : "O que você veste. O que faz parte da rotina. Descubra seus próximos favoritos."}</p><button className={styles.roundCta} onClick={() => onExplore(selected?.operation ?? "all")} aria-label={fashion ? "Explorar peças Fitness" : "Explorar suplementos"}><ArrowUpRight size={28} /></button></div>
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
        <span className={styles.stageWord} aria-hidden="true">{fashion ? "MOVE" : "GO"}</span>
        {supporting.map((p, i) => <button key={p.id} className={`${styles.sideShot} ${i ? styles.shotRight : styles.shotLeft}`} data-cutout={Boolean(discoveryCutout(p))} aria-label={`Conhecer ${p.name}`} onClick={() => onOpen(p)}>{discoveryImage(p) && <Image src={discoveryImage(p)!} alt={p.name} fill sizes="220px" />}<span><Plus size={18} /></span></button>)}
        {selected && <button key={selected.id} className={styles.mainShot} onClick={() => onOpen(selected)} aria-label={`Conhecer ${selected.name}`}>
          {discoveryImage(selected) && <Image data-cutout={Boolean(discoveryCutout(selected))} src={discoveryImage(selected)!} alt={selected.name} fill sizes="(max-width: 650px) 85vw, 520px" priority />}
          <span className={styles.quickLook}>Olhe de perto <Plus size={17} /></span>
        </button>}
        {selected && <div className={styles.productTicket} aria-live="polite"><span><i /> Disponível agora</span><strong>{selected.name}</strong><span>{price(selected)}</span></div>}
        <span className={styles.stageCaption}>{fashion ? "Peças reais. Seu jeito de usar." : "Da nossa Vitrine para sua rotina."}</span>
      </div>
    </div>
    <div className={styles.heroControls}><button className={styles.scrollHint} onClick={() => onExplore("all")}>Role. Encontre. Se surpreenda. <ArrowDown size={16} /></button><div className={styles.sceneControls}><button onClick={() => change(-1)} aria-label="Destaque anterior"><ChevronLeft size={19} /></button><span aria-live="polite">{String((scene % Math.max(picks.length, 1)) + 1).padStart(2, "0")} <span>/ {String(Math.max(picks.length, 1)).padStart(2, "0")}</span></span><button onClick={() => change(1)} aria-label="Próximo destaque"><ChevronRight size={19} /></button></div><div className={styles.sceneDots} aria-label="Escolher destaque">{picks.map((p,i) => <button key={p.id} aria-pressed={selected?.id === p.id} onClick={() => setScene(i)} aria-label={`Mostrar ${p.name}`}>{p.operation === "fitness" ? "Fitness" : i === 0 ? "Candinho" : "Suplementos"}</button>)}</div></div>
  </section>;
}
