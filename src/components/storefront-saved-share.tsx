"use client";
import { MessageCircle, TicketPercent } from "lucide-react";
import { useStorefrontCoupon } from "./use-storefront-coupon";
import { selectionWhatsAppUrl, validStorefrontCoupon, type SavedSelectionItem } from "@/lib/storefront-selection-message";
import styles from "./storefront-discovery.module.css";

export function StorefrontSavedShare({ items, phone }: { items: SavedSelectionItem[]; phone: string }) {
  const { coupon, setCoupon } = useStorefrontCoupon();
  if (!items.length) return null;
  const valid = validStorefrontCoupon(coupon);
  const url = selectionWhatsAppUrl(phone, items, coupon);
  return <section className={styles.savedShare} aria-label="Enviar produtos salvos">
    <div><span><TicketPercent size={17} /> Sua seleção, pronta para conversar</span><h3>{items.length} {items.length === 1 ? "produto salvo" : "produtos salvos"}</h3><p>A mensagem inclui todos os seus salvos de Suplementos e Fitness, mesmo com filtros ativos.</p></div>
    <div className={styles.savedShareAction}>
      <label htmlFor="saved-coupon">Seu cupom (opcional)<input id="saved-coupon" value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="BEMVINDO-…" maxLength={64} autoCapitalize="characters" spellCheck={false} aria-invalid={!valid} aria-describedby="saved-coupon-help" /></label>
      <p id="saved-coupon-help">{valid ? "O cupom gerado nesta visita aparece aqui. Você também pode colar um código que já recebeu." : "Use somente letras, números e hífen no código do cupom."}</p>
      {url ? <a className={styles.savedWhatsApp} href={url} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />{coupon ? "Enviar seleção com cupom" : "Enviar seleção no WhatsApp"}</a> : <button className={styles.savedWhatsApp} disabled>{valid ? "Atendimento indisponível no momento" : "Confira o código do cupom"}</button>}
      <small>Você revisa a mensagem no WhatsApp antes de enviar. A equipe confirma estoque, tamanhos e condições do cupom.</small>
    </div>
  </section>;
}
