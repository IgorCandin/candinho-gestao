"use client";

import Image from "next/image";
import { StorefrontDiscoveryImage } from "./storefront-discovery-image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Heart, Search, X, PackageCheck, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicStorefrontProduct, PublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import type { PublicStorefrontSlugRow } from "@/lib/public-storefront-slug-map-v45-36";
import type { PublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { formatCurrency } from "@/lib/format";
import styles from "./storefront-discovery.module.css";
import { StorefrontCampaign } from "./storefront-campaign-rail";
import { useStorefrontMotion } from "./use-storefront-motion";
import { discoveryCutout, discoveryImage, discoveryOriginal } from "@/lib/storefront-discovery-images";
import { availableSizes, discoveryCollections } from "@/lib/storefront-discovery-selection";
import { StorefrontSupport } from "./storefront-support";
import { StorefrontSavedShare } from "./storefront-saved-share";
import { defaultSelectionChoice, type SavedSelectionChoice, STOREFRONT_WHATSAPP } from "@/lib/storefront-selection-message";
import type { StorefrontTestimonial } from "./storefront-testimonials";
import { useStorefrontScroll } from "./use-storefront-scroll";

type Props = { snapshot: PublicStorefrontSnapshot; links: PublicStorefrontSlugRow[]; availability: PublicFitnessAvailabilityMap; testimonials: StorefrontTestimonial[]; remaining: number | null };
const key = (p: PublicStorefrontProduct) => `${p.operation}:${p.id}`;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function StorefrontDiscovery({ snapshot, links, availability, testimonials, remaining }: Props) {
  const page = useRef<HTMLElement>(null);
  const { enabled: motion } = useStorefrontMotion();
  useStorefrontScroll(page, motion);
  const [size, setSize] = useState("");
  const [operation, setOperation] = useState("supplements");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, SavedSelectionChoice>>({});
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<PublicStorefrontProduct | null>(null);
  const [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const products = useMemo(() => {
    const { supplements, fitness } = snapshot.products;
    return Array.from({ length: Math.max(supplements.length, fitness.length) }, (_, i) => [supplements[i], fitness[i]]).flat().filter((p): p is PublicStorefrontProduct => Boolean(p));
  }, [snapshot]);
  const categories = [...new Set(products.filter(p => savedOnly ? saved.includes(key(p)) : p.operation === operation).map(p => p.category).filter((c): c is string => Boolean(c)))].sort();
  const sizes = [...new Set(products.filter(p => p.operation === "fitness" && (!savedOnly || saved.includes(key(p)))).flatMap(p => availableSizes(p, availability)))];
  const filtered = products.filter(p => (savedOnly || p.operation === operation) && (!category || p.category === category) && normalize(`${p.name} ${p.category ?? ""}`).includes(normalize(query)) && (!savedOnly || saved.includes(key(p))) && (!size || availableSizes(p, availability).includes(size)));
  const available = filtered.filter(p => p.available);
  const unavailable = filtered.filter(p => !p.available);
  const isFiltering = Boolean(query || category || savedOnly || size);

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
    setOperation(value); setCategory(""); setQuery(""); setSize(""); setSavedOnly(false);
  }
  function browse(savedView: boolean) {
    setSavedOnly(savedView); setQuery(""); setCategory(""); setSize("");
    document.getElementById("discovery-products")?.scrollIntoView({ behavior: motion ? "smooth" : "instant" });
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
    const sizes = availableSizes(p, availability);
    return <article className={styles.product} key={key(p)} data-scroll-scene data-product-reveal data-reveal-order={index}>
      <div className={styles.productMedia}>
        <button className={styles.imageButton} onClick={() => { setSelected(p); setPhoto(0); }} aria-label={`Ver detalhes de ${p.name}`}>
          {p.image_url ? <StorefrontDiscoveryImage data-cutout={Boolean(discoveryCutout(p))} src={discoveryImage(p)!} fallback={p.image_url} alt={p.name} fill sizes="(max-width:650px) 45vw, (min-width:1400px) 16vw, 24vw" /> : <PackageCheck size={48} />}
          <span className={styles.cardLook}>Ver de perto <Plus size={16} /></span>
        </button>
        {sizes.length > 0 && <div className={styles.sizeBadge} aria-label={`Tamanhos disponíveis: ${sizes.join(", ")}`}><span>Disponível em</span><strong>{sizes.join(" · ")}</strong></div>}
        <button className={styles.favorite} aria-label={`${saved.includes(key(p)) ? "Remover" : "Salvar"} ${p.name}`} aria-pressed={saved.includes(key(p))} onClick={() => toggleSave(p)}><Heart size={19} fill={saved.includes(key(p)) ? "currentColor" : "none"} /></button>
      </div>
      <span className={styles.muted}>{p.category ?? (p.operation === "fitness" ? "Fitness" : "Suplementos")}</span>
      <button className={styles.productTitle} onClick={() => { setSelected(p); setPhoto(0); }}>{p.name}</button>
      <strong>{price(p)}</strong><span className={styles.stock}>{p.available ? "Disponível agora" : "Indisponível no momento"}</span>
    </article>;
  }

  return <main ref={page} className={styles.page} data-operation={operation} data-motion-choice={motion ? "on" : "off"}>
    <div className={styles.readingProgress} aria-hidden="true" />
    <header className={styles.header}><Link href="/catalogo" aria-label="Vitrine Candinho"><Image src="/candinho-company-logo.png" width={170} height={56} alt="Candinho Company" priority /></Link><div className={styles.operationSwitch} data-operation={operation} role="group" aria-label="Suplementos ou Fitness">{[["supplements", "Suplementos"], ["fitness", "Fitness"]].map(([value,label]) => <button key={value} aria-pressed={operation === value} onClick={() => changeOperation(value)}>{label}</button>)}</div><nav aria-label="Vitrine"><button aria-pressed={!savedOnly} onClick={() => browse(false)}>Produtos</button><button onClick={() => browse(true)} aria-pressed={savedOnly}><Heart size={16} /> Salvos ({saved.length})</button><Link href="/minha-conta" className={styles.account}>Minha conta <ArrowUpRight size={16} /></Link></nav></header>

    <StorefrontCampaign key={operation} operation={operation} products={products} motion={motion} suspended={Boolean(selected)} price={price} onOpen={p => { setSelected(p); setPhoto(0); }} onExplore={explore} />
    <a className={styles.nexusIntro} href="#catalogo-assistido" data-scroll-scene data-section-reveal><span className={styles.candinMark} aria-hidden="true">C.</span><span><small>Candin apresenta</small><strong>Seu próximo favorito tem uma ajuda especial.</strong><span>O Nexus é o assistente oficial da Candinho. Conte o que procura e explore com ele.</span></span><ArrowUpRight size={24} /></a>
    <section id="discovery-products" key={`${operation}:${savedOnly}`} className={styles.browse}><div className={styles.sectionHeading}><div><span className={styles.muted}>Continue explorando</span><h2>{savedOnly ? "SEUS FAVORITOS." : operation === "fitness" ? "SEU PRÓXIMO LOOK." : "PARA SUA ROTINA."}</h2></div><p>Toque numa foto para ver de perto.</p></div>
      <div className={styles.filters}><label className={styles.search}><Search size={18} /><input aria-label="Buscar produto" placeholder="Já sabe o que procura?" value={query} onChange={e => { setQuery(e.target.value); }} /></label><select aria-label="Categoria" value={category} onChange={e => { setCategory(e.target.value); }}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {(operation === "fitness" || savedOnly) && sizes.length > 0 && <div className={styles.sizeFilters} role="group" aria-label="Filtrar roupas por tamanho"><span>Seu tamanho</span><button aria-pressed={!size} onClick={() => setSize("")}>Todos</button>{sizes.map(value => <button key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>)}</div>}
      {savedOnly && <div className={styles.savedHint}>Salvos durante esta visita. <button onClick={() => setSavedOnly(false)}>Voltar a todos os produtos</button></div>}
      {savedOnly && <StorefrontSavedShare phone={STOREFRONT_WHATSAPP} onChange={(id, choice) => setChoices(previous => ({ ...previous, [id]: choice }))} items={products.filter(p => saved.includes(key(p))).map(p => ({ id: key(p), operation: p.operation, name: p.name, available: p.available, path: href(p), options: p.operation === "fitness" ? (availability[p.id] ?? []).filter(o => o.available_quantity > 0) : [], choice: choices[key(p)] ?? defaultSelectionChoice }))} />}
      <p className={styles.resultCount} aria-live="polite">{available.length} {available.length === 1 ? "produto disponível" : "produtos disponíveis"}{size ? ` no tamanho ${size}` : ""}</p>
      {available.length ? <div className={styles.collections}>{discoveryCollections(available).map(([group, items]) => <section key={group} className={styles.collection} aria-label={group}><div className={styles.collectionHeading} data-scroll-scene data-section-reveal><h3>{group}</h3><span>{items.length} {items.length === 1 ? "escolha" : "escolhas"}</span></div><div className={styles.grid}>{items.map(card)}</div></section>)}</div> : <div className={styles.empty}><h3>{savedOnly ? "Sua seleção começa aqui" : "Não encontramos opções disponíveis"}</h3><p>{savedOnly ? "Toque no coração de um produto para guardar enquanto explora." : "Experimente outro tamanho, busca ou categoria."}</p>{isFiltering && <button onClick={() => { setQuery(""); setCategory(""); setSize(""); setSavedOnly(false); }}>Limpar filtros</button>}</div>}
      {unavailable.length > 0 && <details className={styles.unavailable}><summary>Não encontrou o seu? Ver {unavailable.length} produtos indisponíveis</summary><p>Estes produtos não estão disponíveis agora. Consulte as opções de atendimento na página do produto.</p><div className={styles.grid}>{unavailable.map(card)}</div></details>}
    </section>
    <StorefrontSupport testimonials={testimonials} remaining={remaining} onUseCoupon={() => browse(true)} />
    <footer className={styles.footer}><span>Seu treino. Seu estilo. Suas escolhas.</span><strong>CANDINHO.</strong><div><span>Suplementos & Fitness</span><Link href="/vitrine">Vitrine original <ArrowUpRight size={16} /></Link><Link href="/minha-conta">Minha conta</Link></div></footer>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onCancel={e => { e.preventDefault(); closeDetails(); }} onClick={e => { if (e.target === e.currentTarget) closeDetails(); }} aria-labelledby="discovery-detail-title">
      {selected && <><button className={styles.close} aria-label="Fechar detalhes" onClick={closeDetails}><X size={22} /></button><div className={styles.detailMedia}>{(selected.images[photo]?.url ?? selected.image_url) ? <StorefrontDiscoveryImage src={discoveryOriginal(selected.images[photo]?.url ?? selected.image_url!)} fallback={selected.images[photo]?.url ?? selected.image_url} alt={selected.name} fill sizes="(max-width: 700px) 85vw, 400px" /> : <PackageCheck size={64} />}</div><div className={styles.detailCopy}><span className={styles.muted}>{selected.category}</span><h2 id="discovery-detail-title">{selected.name}</h2><strong className={styles.detailPrice}>{price(selected)}</strong><p>{selected.available ? "Disponível no estoque agora. Confira as condições e opções na página de compra." : "Indisponível no momento. Consulte o atendimento antes de fazer seu pedido."}</p>{selected.images.length > 1 && <div className={styles.photos} role="group" aria-label="Fotos do produto">{selected.images.map((image, i) => <button key={`${image.url}:${i}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>{image.label || image.color || `Foto ${i + 1}`}</button>)}</div>}{selected.operation === "fitness" && <div><h3>Tamanhos e cores disponíveis</h3>{availability[selected.id]?.length ? <ul>{availability[selected.id].map(o => <li key={`${o.size}:${o.color}`}>{o.size} · {o.color}</li>)}</ul> : <p>Confirme os tamanhos e as cores no atendimento.</p>}</div>}<Link className={styles.buy} href={href(selected)}>{selected.operation === "fitness" ? "Ver opções no catálogo Fitness" : "Ver produto e como comprar"}<ArrowRight size={18} /></Link><button className={styles.saveDetail} aria-pressed={saved.includes(key(selected))} onClick={() => toggleSave(selected)}><Heart size={17} />{saved.includes(key(selected)) ? "Salvo nesta visita" : "Guardar para decidir depois"}</button></div></>}
    </dialog>
  </main>;
}
