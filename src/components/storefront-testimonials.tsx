import styles from "./storefront-testimonials.module.css";
export type StorefrontTestimonial = { id: string; customer_name: string; comment: string; profession: string | null; photo_url: string | null; google?: { rating: number; mapsUrl: string; updatedAt: string | null } };

export function StorefrontTestimonials({ items }: { items: StorefrontTestimonial[] }) {
  return <section className="storefront-testimonials">
    <header><span>Experiências reais</span><h2>Quem compra, conta.</h2><p>{items.some(item => item.google) ? "Avaliações do Google, com as palavras de quem compartilhou sua experiência." : "Esta área recebe apenas depoimentos cadastrados e aprovados pela equipe."}</p></header>
    {items.length ? <div className="storefront-testimonial-grid">{items.map((item) => <article key={item.id}>
      {item.google && <div className={styles.rating}><span aria-label={`${item.google.rating} de 5 estrelas`}>{"★".repeat(item.google.rating)}{"☆".repeat(5 - item.google.rating)}</span><span>Google</span></div>}
      <blockquote>“{item.comment}”</blockquote><footer><StorefrontProfileChip name={item.customer_name} profession={item.profession} photoUrl={item.photo_url}/></footer>
      {item.google && <a className={styles.source} href={item.google.mapsUrl} target="_blank" rel="noopener noreferrer">Ver avaliações no Google Maps ↗</a>}
    </article>)}</div> : <div className="storefront-testimonial-empty">Os primeiros depoimentos reais aparecerão aqui em breve.</div>}
  </section>;
}
import { StorefrontProfileChip } from "@/components/storefront-profile-chip";
