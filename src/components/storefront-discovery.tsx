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
import { StorefrontCampaign } from "./storefront-campaign";
import { discoveryImage, discoveryOriginal } from "@/lib/storefront-discovery-images";
import { useStorefrontScroll } from "./use-storefront-scroll";

type Props = { snapshot: PublicStorefrontSnapshot; links: PublicStorefrontSlugRow[]; availability: PublicFitnessAvailabilityMap };
const key = (p: PublicStorefrontProduct) => `${p.operation}:${p.id}`;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function StorefrontDiscovery({ snapshot, links, availability }: Props) {
  const page = useRef<HTMLElement>(null);
  useStorefrontScroll(page);
  const [operation, setOperation] = useState("all");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [limit, setLimit] = useState(8);
  const [selected, setSelected] = useState<PublicStorefrontProduct | null>(null);
  const [photo, setPhoto] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const products = useMemo(() => {
    const { supplements, fitness } = snapshot.products;
    return Array.from({ length: Math.max(supplements.length, fitness.length) }, (_, i) => [supplements[i], fitness[i]]).flat().filter((p): p is PublicStorefrontProduct => Boolean(p));
  }, [snapshot]);
  const categories = [...new Set(products.filter(p => operation === "all" || p.operation === operation).map(p => p.category).filter((c): c is string => Boolean(c)))].sort();
  const filtered = products.filter(p => (operation === "all" || p.operation === operation) && (!category || p.category === category) && normalize(`${p.name} ${p.category ?? ""}`).includes(normalize(query)) && (!savedOnly || saved.includes(key(p))));
  const available = filtered.filter(p => p.available);
  const unavailable = filtered.filter(p => !p.available);
  const hero = products.find(p => p.available && p.operation === "supplements" && /creatina.*candinho/i.test(p.name)) ?? products.find(p => p.available && p.image_url);
  const fitness = products.find(p => p.available && p.operation === "fitness" && /top.*short/i.test(p.name)) ?? products.find(p => p.available && p.operation === "fitness" && p.image_url);
  const isFiltering = Boolean(query || category || savedOnly);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  function toggleSave(p: PublicStorefrontProduct) {
    setSaved(previous => previous.includes(key(p)) ? previous.filter(id => id !== key(p)) : [...previous, key(p)]);
  }
  function explore(value: string) {
    setOperation(value); setCategory(""); setQuery(""); setSavedOnly(false); setLimit(8);
    document.getElementById("discovery-products")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
  function card(p: PublicStorefrontProduct) {
    return <article className={styles.product} key={key(p)}>
      <div className={styles.productMedia} data-scroll-scene>
        <button className={styles.imageButton} onClick={() => { setSelected(p); setPhoto(0); }} aria-label={`Ver detalhes de ${p.name}`}>
          {p.image_url ? <StorefrontDiscoveryImage src={discoveryImage(p)!} fallback={p.image_url} alt={p.name} fill sizes="(max-width: 600px) 90vw, 45vw" /> : <PackageCheck size={48} />}
          <span className={styles.cardLook}>Ver de perto <Plus size={16} /></span>
        </button>
        <button className={styles.favorite} aria-label={`${saved.includes(key(p)) ? "Remover" : "Salvar"} ${p.name}`} aria-pressed={saved.includes(key(p))} onClick={() => toggleSave(p)}><Heart size={19} fill={saved.includes(key(p)) ? "currentColor" : "none"} /></button>
      </div>
      <span className={styles.muted}>{p.category ?? (p.operation === "fitness" ? "Fitness" : "Suplementos")}</span>
      <button className={styles.productTitle} onClick={() => { setSelected(p); setPhoto(0); }}>{p.name}</button>
      <strong>{price(p)}</strong><span className={styles.stock}>{p.available ? "Disponível agora" : "Indisponível no momento"}</span>
    </article>;
  }

  return <main ref={page} className={styles.page}>
    <div className={styles.readingProgress} aria-hidden="true" />
    <header className={styles.header}><Link href="/catalogo" aria-label="Vitrine Candinho"><Image src="/candinho-company-logo.png" width={170} height={56} alt="Candinho Company" priority /></Link><nav aria-label="Vitrine"><a href="#discovery-collections">Coleções</a><a href="#discovery-products">Explorar</a><button onClick={() => { setSavedOnly(v => !v); setLimit(8); document.getElementById("discovery-products")?.scrollIntoView(); }} aria-pressed={savedOnly}><Heart size={16} /> Salvos ({saved.length})</button><Link href="/minha-conta" className={styles.account}>Minha conta <ArrowUpRight size={16} /></Link></nav></header>
    <StorefrontCampaign products={products.filter(p => p.available)} price={price} onOpen={p => { setSelected(p); setPhoto(0); }} onExplore={explore} />
    <div className={styles.brandStrip}><span>Feito para a sua rotina.</span><strong>Escolha seu próximo movimento.</strong><span><PackageCheck size={16} /> Estoque atualizado</span></div>
    <section id="discovery-collections" className={styles.collectionIntro} data-scroll-scene aria-label="Coleções"><div className={styles.collectionHeading}><span>Dois universos. O seu ritmo.</span><h2>ESCOLHA<br />SEU LADO.</h2><p>Um detalhe no look.<br />Uma novidade na rotina.<br />Comece por onde der vontade.</p></div><div className={styles.collections}><button onClick={() => explore("supplements")} className={styles.supplementCollection}><div><span>Suplementos</span><strong>O PRÓXIMO<br />PASSO É SEU.</strong></div>{hero?.image_url && <StorefrontDiscoveryImage src={discoveryImage(hero)!} fallback={hero.image_url} alt="" fill sizes="(max-width: 650px) 90vw, 55vw" />}<span className={styles.collectionCta}>Explorar suplementos <ArrowUpRight size={23} /></span><span className={styles.collectionGhost} aria-hidden="true">FORÇA</span></button><button onClick={() => explore("fitness")} className={styles.fitnessCollection}><div><span>Fitness</span><strong>VISTA<br />SUA ATITUDE.</strong></div>{fitness?.image_url && <StorefrontDiscoveryImage src={discoveryImage(fitness)!} fallback={fitness.image_url} alt="" fill sizes="(max-width: 650px) 90vw, 45vw" />}<span className={styles.collectionCta}>Encontrar meu look <ArrowUpRight size={23} /></span></button></div></section>
    <div className={styles.motionBridge} data-scroll-scene><p>ENCONTRE SEU RITMO.</p><span>Continue. Seu próximo favorito pode estar aqui.</span></div>
    <section id="discovery-products" className={styles.browse}><div className={styles.sectionHeading}><div><span className={styles.muted}>A próxima descoberta é sua.</span><h2>{savedOnly ? "SEUS FAVORITOS." : operation === "fitness" ? "VISTA O SEU RITMO." : operation === "supplements" ? "PARA SUA ROTINA." : "OLHOU. GOSTOU."}</h2></div><p>Explore com calma.<br />Toque para conhecer de perto.</p></div>
      <div className={styles.filters}><div className={styles.tabs} role="group" aria-label="Tipo de produto">{[["all", "Tudo"], ["supplements", "Suplementos"], ["fitness", "Fitness"]].map(([value, label]) => <button key={value} aria-pressed={operation === value} onClick={() => { setOperation(value); setCategory(""); setLimit(8); }}>{label}</button>)}</div><label className={styles.search}><Search size={18} /><input aria-label="Buscar produto" placeholder="Já sabe o que procura?" value={query} onChange={e => { setQuery(e.target.value); setLimit(8); }} /></label><select aria-label="Categoria" value={category} onChange={e => { setCategory(e.target.value); setLimit(8); }}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {savedOnly && <div className={styles.savedHint}>Salvos durante esta visita. <button onClick={() => setSavedOnly(false)}>Voltar a todos os produtos</button></div>}
      <p className={styles.resultCount} aria-live="polite">{available.length} {available.length === 1 ? "produto disponível" : "produtos disponíveis"}{available.length > limit ? ` · mostrando ${limit} por enquanto` : ""}</p>
      {available.length ? <div className={styles.grid}>{available.slice(0, limit).map(card)}</div> : <div className={styles.empty}><h3>{savedOnly ? "Sua seleção começa aqui" : "Não encontramos opções disponíveis"}</h3><p>{savedOnly ? "Toque no coração de um produto para guardar enquanto explora." : "Experimente outra busca ou categoria."}</p>{isFiltering && <button onClick={() => { setQuery(""); setCategory(""); setSavedOnly(false); }}>Limpar filtros</button>}</div>}
      {available.length > limit && <button className={styles.more} onClick={() => setLimit(v => v + 8)}>Explorar mais {Math.min(8, available.length - limit)} produtos <ArrowRight size={17} /></button>}
      {unavailable.length > 0 && <details className={styles.unavailable}><summary>Não encontrou o seu? Ver {unavailable.length} produtos indisponíveis</summary><p>Estes produtos não estão disponíveis agora. Consulte as opções de atendimento na página do produto.</p><div className={styles.grid}>{unavailable.map(card)}</div></details>}
    </section>
    <footer className={styles.footer}><span>Seu treino. Seu estilo. Suas escolhas.</span><strong>CANDINHO.</strong><div><span>Suplementos & Fitness</span><Link href="/vitrine">Vitrine original <ArrowUpRight size={16} /></Link><Link href="/minha-conta">Minha conta</Link></div></footer>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} aria-labelledby="discovery-detail-title">
      {selected && <><button className={styles.close} aria-label="Fechar detalhes" onClick={() => dialog.current?.close()}><X size={22} /></button><div className={styles.detailMedia}>{(selected.images[photo]?.url ?? selected.image_url) ? <StorefrontDiscoveryImage src={discoveryOriginal(selected.images[photo]?.url ?? selected.image_url!)} fallback={selected.images[photo]?.url ?? selected.image_url} alt={selected.name} fill sizes="(max-width: 700px) 85vw, 400px" /> : <PackageCheck size={64} />}</div><div className={styles.detailCopy}><span className={styles.muted}>{selected.category}</span><h2 id="discovery-detail-title">{selected.name}</h2><strong className={styles.detailPrice}>{price(selected)}</strong><p>{selected.available ? "Disponível no estoque agora. Confira as condições e opções na página de compra." : "Indisponível no momento. Consulte o atendimento antes de fazer seu pedido."}</p>{selected.images.length > 1 && <div className={styles.photos} role="group" aria-label="Fotos do produto">{selected.images.map((image, i) => <button key={`${image.url}:${i}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>{image.label || image.color || `Foto ${i + 1}`}</button>)}</div>}{selected.operation === "fitness" && <div><h3>Tamanhos e cores disponíveis</h3>{availability[selected.id]?.length ? <ul>{availability[selected.id].map(o => <li key={`${o.size}:${o.color}`}>{o.size} · {o.color}</li>)}</ul> : <p>Confirme os tamanhos e as cores no atendimento.</p>}</div>}<Link className={styles.buy} href={href(selected)}>{selected.operation === "fitness" ? "Ver opções no catálogo Fitness" : "Ver produto e como comprar"}<ArrowRight size={18} /></Link><button className={styles.saveDetail} aria-pressed={saved.includes(key(selected))} onClick={() => toggleSave(selected)}><Heart size={17} />{saved.includes(key(selected)) ? "Salvo nesta visita" : "Guardar para decidir depois"}</button></div></>}
    </dialog>
  </main>;
}
