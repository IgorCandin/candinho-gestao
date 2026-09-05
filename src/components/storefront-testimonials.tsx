export type StorefrontTestimonial = { id: string; customer_name: string; comment: string; profession: string | null; photo_url: string | null };

export function StorefrontTestimonials({ items }: { items: StorefrontTestimonial[] }) {
  return <section className="storefront-testimonials">
    <header><span>Experiências reais</span><h2>Quem compra, conta.</h2><p>Esta área recebe apenas depoimentos cadastrados e aprovados pela equipe.</p></header>
    {items.length ? <div className="storefront-testimonial-grid">{items.map((item) => <article key={item.id}><blockquote>“{item.comment}”</blockquote><footer>{item.photo_url ? <span className="storefront-avatar" style={{ backgroundImage: `url(${item.photo_url})` }} aria-hidden="true"/> : <span>{item.customer_name.slice(0,1).toUpperCase()}</span>}<div><strong>{item.customer_name}</strong>{item.profession && <small>{item.profession}</small>}</div></footer></article>)}</div> : <div className="storefront-testimonial-empty">Os primeiros depoimentos reais aparecerão aqui em breve.</div>}
  </section>;
}
