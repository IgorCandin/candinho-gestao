import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Dumbbell, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { PublicStorefrontBrowser } from "@/components/public-storefront-browser";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { getPublicStorefrontSnapshot } from "@/lib/public-storefront-data";
import styles from "./vitrine.module.css";

export const revalidate = 10;

export default async function StorefrontV2Page() {
  const snapshot = await getPublicStorefrontSnapshot();
  const total = snapshot.products.supplements.length + snapshot.products.fitness.length;
  return <main className={styles.page}>
    <div className={styles.cursorGlow}/>
    <header className={styles.header}><Image src={BRAND_ASSETS.company.complete.src} alt={BRAND_ASSETS.company.complete.alt} width={190} height={63} priority/><nav><a href="#produtos">Produtos</a><a href="#como-comprar">Como comprar</a><Link href="/catalogo">Vitrine clássica</Link></nav></header>
    <section className={styles.hero}><div><span><Sparkles size={14}/> NOVA EXPERIÊNCIA CANDINHO</span><h1>Seu próximo resultado começa com a escolha certa.</h1><p>Suplementos e Fitness no mesmo universo, com disponibilidade atualizada diretamente pelo ERP.</p><a className={styles.cta} href="#produtos">Explorar {total} produtos <ArrowRight/></a></div><div className={styles.orbit}><div><ShoppingBag/><strong>Suplementos</strong><small>Performance, saúde e rotina</small></div><div><Dumbbell/><strong>Fitness</strong><small>Treino, estilo e movimento</small></div></div></section>
    <section className={styles.trust} id="como-comprar"><span><ShieldCheck/> Estoque conectado ao ERP</span><span>Catálogo único Company</span><span>Atendimento humano</span></section>
    <section className={styles.catalog} id="produtos"><header><span>VITRINE 2.0</span><h2>Encontre sem se perder.</h2><p>Pesquise, filtre por operação ou categoria e compare os produtos disponíveis.</p></header><PublicStorefrontBrowser snapshot={snapshot}/></section>
  </main>;
}
