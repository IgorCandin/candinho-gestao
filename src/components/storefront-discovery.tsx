"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Search, X, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicStorefrontProduct, PublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import type { PublicStorefrontSlugRow } from "@/lib/public-storefront-slug-map-v45-36";
import type { PublicFitnessAvailabilityMap } from "@/lib/public-fitness-availability-data";
import { formatCurrency } from "@/lib/format";
import styles from "./storefront-discovery.module.css";

type Props = { snapshot: PublicStorefrontSnapshot; links: PublicStorefrontSlugRow[]; availability: PublicFitnessAvailabilityMap };
const key = (p: PublicStorefrontProduct) => `${p.operation}:${p.id}`;
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function StorefrontDiscovery({ snapshot, links, availability }: Props) {
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
  const fitness = products.find(p => p.available && p.operation === "fitness" && p.image_url);
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
      <div className={styles.productMedia}>
        <button className={styles.imageButton} onClick={() => { setSelected(p); setPhoto(0); }} aria-label={`Ver detalhes de ${p.name}`}>
          {p.image_url ? <Image src={p.image_url} alt={p.name} fill sizes="(max-width: 600px) 45vw, (max-width: 900px) 30vw, 280px" unoptimized /> : <PackageCheck size={48} />}
        </button>
        <button className={styles.favorite} aria-label={`${saved.includes(key(p)) ? "Remover" : "Salvar"} ${p.name}`} aria-pressed={saved.includes(key(p))} onClick={() => toggleSave(p)}><Heart size={19} fill={saved.includes(key(p)) ? "currentColor" : "none"} /></button>
      </div>
      <span className={styles.muted}>{p.category ?? (p.operation === "fitness" ? "Fitness" : "Suplementos")}</span>
      <button className={styles.productTitle} onClick={() => { setSelected(p); setPhoto(0); }}>{p.name}</button>
      <strong>{price(p)}</strong><span className={styles.stock}>{p.available ? "Disponível agora" : "Indisponível no momento"}</span>
    </article>;
  }

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/catalogo" aria-label="Vitrine Candinho"><Image src="/candinho-company-logo.png" width={180} height={59} alt="Candinho Company" priority /></Link><nav aria-label="Vitrine"><a href="#discovery-products">Explorar</a><button onClick={() => { setSavedOnly(v => !v); setLimit(8); document.getElementById("discovery-products")?.scrollIntoView(); }} aria-pressed={savedOnly}><Heart size={16} /> Salvos ({saved.length})</button><Link href="/minha-conta">Minha conta</Link></nav></header>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><span>Vitrine Candinho</span><h1>O próximo favorito<br />da sua rotina.</h1><p>Do treino ao que você veste. Explore uma seleção de cada vez e descubra o que combina com você.</p><div className={styles.heroActions}><button onClick={() => explore("supplements")}>Explorar suplementos <ArrowRight size={18} /></button><button onClick={() => explore("fitness")}>Descobrir Fitness</button></div><span className={styles.heroFoot}><PackageCheck size={17} /> Disponibilidade conectada ao nosso estoque</span></div>
      {hero && <button className={styles.heroProduct} onClick={() => { setSelected(hero); setPhoto(0); }} aria-label={`Conhecer ${hero.name}`}>
        {hero.image_url && <Image src={hero.image_url} alt={hero.name} fill priority unoptimized sizes="(max-width: 700px) 90vw, 45vw" />}<span><span>Conheça de perto</span><strong>{hero.name}</strong><span>{price(hero)} <ArrowRight size={18} /></span></span>
      </button>}
    </section>
    <section className={styles.collectionIntro} aria-label="Coleções"><h2>Por onde você quer começar?</h2><div className={styles.collections}><button onClick={() => explore("supplements")}><span>Suplementos</span><strong>Encontre espaço<br />na sua rotina.</strong><span>Explorar a seleção <ArrowRight size={18} /></span></button><button onClick={() => explore("fitness")} className={styles.fitnessCollection}>{fitness?.image_url && <Image src={fitness.image_url} alt="" fill sizes="(max-width: 700px) 90vw, 45vw" unoptimized />}<span>Fitness</span><strong>Seu treino.<br />Seu estilo.</strong><span>Ver peças disponíveis <ArrowRight size={18} /></span></button></div></section>
    <section id="discovery-products" className={styles.browse}><div className={styles.sectionHeading}><div><span className={styles.muted}>Escolhas para explorar</span><h2>{savedOnly ? "O que chamou sua atenção" : operation === "fitness" ? "Vista seu próximo treino" : operation === "supplements" ? "Conheça os suplementos" : "Encontre seu próximo favorito"}</h2></div><Link href="/vitrine">Abrir vitrine original <ArrowRight size={16} /></Link></div>
      <div className={styles.filters}><div className={styles.tabs} role="group" aria-label="Tipo de produto">{[["all", "Tudo"], ["supplements", "Suplementos"], ["fitness", "Fitness"]].map(([value, label]) => <button key={value} aria-pressed={operation === value} onClick={() => { setOperation(value); setCategory(""); setLimit(8); }}>{label}</button>)}</div><label className={styles.search}><Search size={18} /><input aria-label="Buscar produto" placeholder="Já sabe o que procura?" value={query} onChange={e => { setQuery(e.target.value); setLimit(8); }} /></label><select aria-label="Categoria" value={category} onChange={e => { setCategory(e.target.value); setLimit(8); }}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {savedOnly && <div className={styles.savedHint}>Salvos durante esta visita. <button onClick={() => setSavedOnly(false)}>Voltar a todos os produtos</button></div>}
      <p className={styles.resultCount} aria-live="polite">{available.length} {available.length === 1 ? "produto disponível" : "produtos disponíveis"}{available.length > limit ? ` · mostrando ${limit} por enquanto` : ""}</p>
      {available.length ? <div className={styles.grid}>{available.slice(0, limit).map(card)}</div> : <div className={styles.empty}><h3>{savedOnly ? "Sua seleção começa aqui" : "Não encontramos opções disponíveis"}</h3><p>{savedOnly ? "Toque no coração de um produto para guardar enquanto explora." : "Experimente outra busca ou categoria."}</p>{isFiltering && <button onClick={() => { setQuery(""); setCategory(""); setSavedOnly(false); }}>Limpar filtros</button>}</div>}
      {available.length > limit && <button className={styles.more} onClick={() => setLimit(v => v + 8)}>Explorar mais {Math.min(8, available.length - limit)} produtos <ArrowRight size={17} /></button>}
      {unavailable.length > 0 && <details className={styles.unavailable}><summary>Não encontrou o seu? Ver {unavailable.length} produtos indisponíveis</summary><p>Estes produtos não estão disponíveis agora. Consulte as opções de atendimento na página do produto.</p><div className={styles.grid}>{unavailable.map(card)}</div></details>}
    </section>
    <footer className={styles.footer}><strong>Candinho Company</strong><span>Escolha com calma. Confira as opções antes de comprar.</span><Link href="/catalogo">Vitrine clássica</Link></footer>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} aria-labelledby="discovery-detail-title">
      {selected && <><button className={styles.close} aria-label="Fechar detalhes" onClick={() => dialog.current?.close()}><X size={22} /></button><div className={styles.detailMedia}>{(selected.images[photo]?.url ?? selected.image_url) ? <Image src={selected.images[photo]?.url ?? selected.image_url!} alt={selected.name} fill unoptimized sizes="(max-width: 700px) 85vw, 400px" /> : <PackageCheck size={64} />}</div><div className={styles.detailCopy}><span className={styles.muted}>{selected.category}</span><h2 id="discovery-detail-title">{selected.name}</h2><strong className={styles.detailPrice}>{price(selected)}</strong><p>{selected.available ? "Disponível no estoque agora. Confira as condições e opções na página de compra." : "Indisponível no momento. Consulte o atendimento antes de fazer seu pedido."}</p>{selected.images.length > 1 && <div className={styles.photos} role="group" aria-label="Fotos do produto">{selected.images.map((image, i) => <button key={`${image.url}:${i}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>{image.label || image.color || `Foto ${i + 1}`}</button>)}</div>}{selected.operation === "fitness" && <div><h3>Tamanhos e cores disponíveis</h3>{availability[selected.id]?.length ? <ul>{availability[selected.id].map(o => <li key={`${o.size}:${o.color}`}>{o.size} · {o.color}</li>)}</ul> : <p>Confirme os tamanhos e as cores no atendimento.</p>}</div>}<Link className={styles.buy} href={href(selected)}>{selected.operation === "fitness" ? "Ver opções no catálogo Fitness" : "Ver produto e como comprar"}<ArrowRight size={18} /></Link><button className={styles.saveDetail} aria-pressed={saved.includes(key(selected))} onClick={() => toggleSave(selected)}><Heart size={17} />{saved.includes(key(selected)) ? "Salvo nesta visita" : "Guardar para decidir depois"}</button></div></>}
    </dialog>
  </main>;
}
