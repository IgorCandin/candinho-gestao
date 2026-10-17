"use client";

import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import { ArrowUpRight, Plus } from "lucide-react";
import type { PublicStorefrontProduct } from "@/lib/public-storefront-data";
import { discoveryCutout, discoveryImage } from "@/lib/storefront-discovery-images";
import styles from "./storefront-discovery.module.css";

type Props = {
  products: PublicStorefrontProduct[];
  operation: string;
  onOperationChange: (operation: string) => void;
  onOpen: (product: PublicStorefrontProduct) => void;
  onExplore: (operation: string) => void;
  price: (product: PublicStorefrontProduct) => string;
};

export function StorefrontCampaign({ products, operation, onOperationChange, onOpen, onExplore, price }: Props) {
  const fashion = operation === "fitness";
  const operationProducts = products.filter(p => p.operation === (fashion ? "fitness" : "supplements"));
  const selected = operationProducts.find(p => fashion ? /top.*short/i.test(p.name) : /creatina.*candinho/i.test(p.name)) ?? operationProducts.find(p => p.image_url) ?? operationProducts[0];
  const supporting = operationProducts.filter(p => p.image_url && p.id !== selected?.id && discoveryCutout(p)).slice(0, 1);

  return <section data-scroll-scene className={`${styles.hero} ${fashion ? styles.fashionScene : ""}`} aria-label="Descubra a Vitrine Candinho">
    <div className={styles.heroTop}><span><i /> Suplementos & Fitness</span><span>Destaques em estoque</span></div>
    <div className={styles.heroComposition}>
      <div className={styles.heroCopy}>
        <h1 key={fashion ? "fashion-title" : "training-title"}>{fashion ? <>SEU ESTILO.<br />EM <em>MOVIMENTO.</em></> : <>SEU TREINO.<br />OUTRA <em>ENERGIA.</em></>}</h1>
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
        <span className={styles.stageWord} aria-hidden="true">{fashion ? "MOVE" : "GO"}</span>
        {supporting.map(p => <button key={p.id} className={styles.sideShot} data-cutout={Boolean(discoveryCutout(p))} aria-label={`Conhecer ${p.name}`} onClick={() => onOpen(p)}>{discoveryImage(p) && <StorefrontDiscoveryImage src={discoveryImage(p)!} fallback={p.image_url} alt={p.name} fill sizes="220px" />}<span><Plus size={18} /></span></button>)}
        {selected && <button key={selected.id} className={styles.mainShot} onClick={() => onOpen(selected)} aria-label={`Conhecer ${selected.name}`}>
          {discoveryImage(selected) && <StorefrontDiscoveryImage data-cutout={Boolean(discoveryCutout(selected))} src={discoveryImage(selected)!} fallback={selected.image_url} alt={selected.name} fill sizes="(max-width: 650px) 85vw, 520px" priority />}
          <span className={styles.quickLook}>Olhe de perto <Plus size={17} /></span>
        </button>}
        {selected && <div className={styles.productTicket} aria-live="polite"><span><i /> Disponível agora</span><strong>{selected.name}</strong><span>{price(selected)}</span></div>}
        <span className={styles.stageCaption}>{fashion ? "Peças reais. Seu jeito de usar." : "Da nossa Vitrine para sua rotina."}</span>
      </div>
    </div>
    <div className={styles.heroControls}>
      <div className={styles.sceneDots} role="group" aria-label="Escolher operação">
        {[["supplements", "Suplementos"], ["fitness", "Fitness"]].map(([value, label]) => <button key={value} aria-pressed={operation === value} onClick={() => onOperationChange(value)}>{label}</button>)}
      </div>
      <span className={styles.muted}>{operationProducts.length} produtos disponíveis</span>
    </div>
  </section>;
}
