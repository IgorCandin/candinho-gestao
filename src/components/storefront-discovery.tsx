"use client";

import Image from "next/image";
import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Heart, Search, X, PackageCheck, Plus, Pause, Play, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicStorefrontProduct, PublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import type { PublicStorefrontSlugRow } from "@/lib/public-storefront-slug-map-v45-36";
import type { PublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { formatCurrency } from "@/lib/format";
import styles from "./storefront-discovery.module.css";
import { StorefrontCampaign } from "./storefront-campaign-rail";
import { useStorefrontMotion } from "./use-storefront-motion";
import { discoveryCutout, discoveryImage, discoveryOriginal } from "@/lib/storefront-discovery-images";
import { useStorefrontScroll } from "./use-storefront-scroll";

type Props = { snapshot: PublicStorefrontSnapshot; links: PublicStorefrontSlugRow[]; availability: PublicFitnessAvailabilityMap };
const key = (p: PublicStorefrontProduct) => `${p.operation}:${p.id}`;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function StorefrontDiscovery({ snapshot, links, availability }: Props) {
  const page = useRef<HTMLElement>(null);
  const { enabled: motion, toggle: toggleMotion } = useStorefrontMotion();
  useStorefrontScroll(page, motion);
  const [grouped, setGrouped] = useState(false);
  const [operation, setOperation] = useState("supplements");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [limit, setLimit] = useState(12);
  const [selected, setSelected] = useState<PublicStorefrontProduct | null>(null);
  const [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const products = useMemo(() => {
    const { supplements, fitness } = snapshot.products;
    return Array.from({ length: Math.max(supplements.length, fitness.length) }, (_, i) => [supplements[i], fitness[i]]).flat().filter((p): p is PublicStorefrontProduct => Boolean(p));
  }, [snapshot]);
  const categories = [...new Set(products.filter(p => savedOnly ? saved.includes(key(p)) : p.operation === operation).map(p => p.category).filter((c): c is string => Boolean(c)))].sort();
  const filtered = products.filter(p => (savedOnly || p.operation === operation) && (!category || p.category === category) && normalize(`${p.name} ${p.category ?? ""}`).includes(normalize(query)) && (!savedOnly || saved.includes(key(p))));
  const available = filtered.filter(p => p.available);
  const unavailable = filtered.filter(p => !p.available);
  const isFiltering = Boolean(query || category || savedOnly);

  useEffect(() => {
    const element = dialog.current;
    if (!selected || !element || element.open) return;
    element.showModal();
    if (motion) {
      element.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }, [selected, motion]);
  function closeDetails() {
    const element = dialog.current;
    if (!element || !element.open || element.getAttribute("data-closing") === "true") return;
    if (!motion) { element.close(); return; }
    element.setAttribute("data-closing", "true");
    element.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(10px)" }], { duration: 160, easing: "ease-in", fill: "forwards" }).finished.then(() => {
      element.close();
      element.getAnimations().forEach(animation => animation.cancel());
      element.removeAttribute("data-closing");
    }).catch(() => { element.removeAttribute("data-closing"); });
  }

  function toggleSave(p: PublicStorefrontProduct) {
    setSaved(previous => previous.includes(key(p)) ? previous.filter(id => id !== key(p)) : [...previous, key(p)]);
  }
  function changeOperation(value: string) {
    setOperation(value); setCategory(""); setQuery(""); setSavedOnly(false); setLimit(12);
  }
  function explore(value: string) {
    changeOperation(value);
    document.getElementById("discovery-products")?.scrollIntoView({ behavior: motion ? "smooth" : "instant" });
  }
  function href(p: PublicStorefrontProduct) {
    const slug = links.find(l => l.product_id === p.id)?.slug;
    return p.operation === "supplements" && slug ? `/catalogo/${slug}` : `/catalogo/${p.operation === "fitness" ? "fitness" : "suplementos"}`;
  }
  function price(p: PublicStorefrontProduct) {
    const promotion = [...snapshot.promotions.supplements, ...snapshot.promotions.fitness]
      .filter(item => item.product_id === p.id && item.operation === p.operation && item.promotion_status === "active" && item.stock_status === "available" && item.available_quantity > 0 && item.promotional_price > 0)
      .sort((a, b) => a.promotional_price - b.promotional_price)[0];
    if (promotion && p.available) return `${formatCurrency(promotion.promotional_price)} em promoção`;
    if (p.price_from <= 0) return "Consulte o preço";
    return `${p.price_from !== p.price_to ? "A partir de " : ""}${formatCurrency(p.price_from)}`;
  }
  function card(p: PublicStorefrontProduct, index: number) {
    return <article className={styles.product} key={key(p)}>
      <div className={styles.productMedia} data-scroll-scene data-product-reveal data-reveal-order={index}>
        <button className={styles.imageButton} onClick={() => { setSelected(p); setPhoto(0); }} aria-label={`Ver detalhes de ${p.name}`}>
          {p.image_url ? <StorefrontDiscoveryImage data-cutout={Boolean(discoveryCutout(p))} src={discoveryImage(p)!} fallback={p.image_url} alt={p.name} fill sizes="(max-width: 600px) 90vw, 45vw" /> : <PackageCheck size={48} />}
          <span className={styles.cardLook}>Ver de perto <Plus size={16} /></span>
        </button>
        <button className={styles.favorite} aria-label={`${saved.includes(key(p)) ? "Remover" : "Salvar"} ${p.name}`} aria-pressed={saved.includes(key(p))} onClick={() => toggleSave(p)}><Heart size={19} fill={saved.includes(key(p)) ? "currentColor" : "none"} /></button>
      </div>
      <span className={styles.muted}>{p.category ?? (p.operation === "fitness" ? "Fitness" : "Suplementos")}</span>
      <button className={styles.productTitle} onClick={() => { setSelected(p); setPhoto(0); }}>{p.name}</button>
      <strong>{price(p)}</strong><span className={styles.stock}>{p.available ? "Disponível agora" : "Indisponível no momento"}</span>
    </article>;
  }

  return <main ref={page} className={styles.page} data-operation={operation} data-motion-choice={motion ? "on" : "off"}>
    <div className={styles.readingProgress} aria-hidden="true" />
    <header className={styles.header}><Link href="/catalogo" aria-label="Vitrine Candinho"><Image src="/candinho-company-logo.png" width={170} height={56} alt="Candinho Company" priority /></Link><div className={styles.operationSwitch} data-operation={operation} role="group" aria-label="Suplementos ou Fitness">{[["supplements", "Suplementos"], ["fitness", "Fitness"]].map(([value,label]) => <button key={value} aria-pressed={operation === value} onClick={() => changeOperation(value)}>{label}</button>)}</div><nav aria-label="Vitrine"><a href="#discovery-products">Produtos</a><button onClick={() => { setSavedOnly(v => !v); setQuery(""); setCategory(""); setLimit(12); document.getElementById("discovery-products")?.scrollIntoView(); }} aria-pressed={savedOnly}><Heart size={16} /> Salvos ({saved.length})</button><Link href="/minha-conta" className={styles.account}>Minha conta <ArrowUpRight size={16} /></Link></nav></header>
    <div className={styles.motionBar}><button className={styles.motionToggle} onClick={toggleMotion} aria-pressed={motion}>{motion ? <Pause size={14} /> : <Play size={14} />}{motion ? "Movimento ligado" : "Ativar animações"}</button><span>{motion ? "Explore no seu ritmo. Passe o mouse para pausar." : "O movimento está pausado. Você pode ativar aqui."}</span></div>
    <StorefrontCampaign key={operation} operation={operation} products={products} motion={motion} suspended={Boolean(selected)} price={price} onOpen={p => { setSelected(p); setPhoto(0); }} onExplore={explore} />
    <section id="discovery-products" key={`${operation}:${savedOnly}`} className={styles.browse}><div className={styles.sectionHeading}><div><span className={styles.muted}>Continue explorando</span><h2>{savedOnly ? "SEUS FAVORITOS." : operation === "fitness" ? "SEU PRÓXIMO LOOK." : "PARA SUA ROTINA."}</h2></div><p>Toque numa foto para ver de perto.</p></div>
      <div className={styles.filters}><label className={styles.search}><Search size={18} /><input aria-label="Buscar produto" placeholder="Já sabe o que procura?" value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }} /></label><select aria-label="Categoria" value={category} onChange={e => { setCategory(e.target.value); setLimit(12); }}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {savedOnly && <div className={styles.savedHint}>Salvos durante esta visita. <button onClick={() => setSavedOnly(false)}>Voltar a todos os produtos</button></div>}
      <p className={styles.resultCount} aria-live="polite">{available.length} {available.length === 1 ? "produto disponível" : "produtos disponíveis"}{available.length > limit ? ` · mostrando ${limit} por enquanto` : ""}</p>
      {available.length > 0 && !isFiltering && <button className={styles.groupToggle} onClick={() => setGrouped(value => !value)} aria-pressed={grouped}><Layers size={15} />{grouped ? "Mostrar todos juntos" : "Agrupar por categoria"}</button>}
      {available.length ? grouped && !isFiltering ? <div className={styles.collections}>{[...new Set(available.slice(0,limit).map(product => product.category || "Outros"))].map(group => <section key={group} className={styles.collection} aria-label={group}><div className={styles.collectionHeading}><h3>{group}</h3><button onClick={() => { setCategory(group === "Outros" ? "" : group); setLimit(12); }}>Explorar categoria <ArrowUpRight size={15} /></button></div><div className={styles.grid}>{available.slice(0,limit).filter(product => (product.category || "Outros") === group).map(card)}</div></section>)}</div> : <div className={styles.grid}>{available.slice(0, limit).map(card)}</div> : <div className={styles.empty}><h3>{savedOnly ? "Sua seleção começa aqui" : "Não encontramos opções disponíveis"}</h3><p>{savedOnly ? "Toque no coração de um produto para guardar enquanto explora." : "Experimente outra busca ou categoria."}</p>{isFiltering && <button onClick={() => { setQuery(""); setCategory(""); setSavedOnly(false); }}>Limpar filtros</button>}</div>}
      {available.length > limit && <button className={styles.more} onClick={() => setLimit(v => v + 12)}>Explorar mais {Math.min(12, available.length - limit)} produtos <ArrowRight size={17} /></button>}
      {unavailable.length > 0 && <details className={styles.unavailable}><summary>Não encontrou o seu? Ver {unavailable.length} produtos indisponíveis</summary><p>Estes produtos não estão disponíveis agora. Consulte as opções de atendimento na página do produto.</p><div className={styles.grid}>{unavailable.map(card)}</div></details>}
    </section>
    <footer className={styles.footer}><span>Seu treino. Seu estilo. Suas escolhas.</span><strong>CANDINHO.</strong><div><span>Suplementos & Fitness</span><Link href="/vitrine">Vitrine original <ArrowUpRight size={16} /></Link><Link href="/minha-conta">Minha conta</Link></div></footer>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onCancel={e => { e.preventDefault(); closeDetails(); }} onClick={e => { if (e.target === e.currentTarget) closeDetails(); }} aria-labelledby="discovery-detail-title">
      {selected && <><button className={styles.close} aria-label="Fechar detalhes" onClick={closeDetails}><X size={22} /></button><div className={styles.detailMedia}>{(selected.images[photo]?.url ?? selected.image_url) ? <StorefrontDiscoveryImage src={discoveryOriginal(selected.images[photo]?.url ?? selected.image_url!)} fallback={selected.images[photo]?.url ?? selected.image_url} alt={selected.name} fill sizes="(max-width: 700px) 85vw, 400px" /> : <PackageCheck size={64} />}</div><div className={styles.detailCopy}><span className={styles.muted}>{selected.category}</span><h2 id="discovery-detail-title">{selected.name}</h2><strong className={styles.detailPrice}>{price(selected)}</strong><p>{selected.available ? "Disponível no estoque agora. Confira as condições e opções na página de compra." : "Indisponível no momento. Consulte o atendimento antes de fazer seu pedido."}</p>{selected.images.length > 1 && <div className={styles.photos} role="group" aria-label="Fotos do produto">{selected.images.map((image, i) => <button key={`${image.url}:${i}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>{image.label || image.color || `Foto ${i + 1}`}</button>)}</div>}{selected.operation === "fitness" && <div><h3>Tamanhos e cores disponíveis</h3>{availability[selected.id]?.length ? <ul>{availability[selected.id].map(o => <li key={`${o.size}:${o.color}`}>{o.size} · {o.color}</li>)}</ul> : <p>Confirme os tamanhos e as cores no atendimento.</p>}</div>}<Link className={styles.buy} href={href(selected)}>{selected.operation === "fitness" ? "Ver opções no catálogo Fitness" : "Ver produto e como comprar"}<ArrowRight size={18} /></Link><button className={styles.saveDetail} aria-pressed={saved.includes(key(selected))} onClick={() => toggleSave(selected)}><Heart size={17} />{saved.includes(key(selected)) ? "Salvo nesta visita" : "Guardar para decidir depois"}</button></div></>}
    </dialog>
  </main>;
}
