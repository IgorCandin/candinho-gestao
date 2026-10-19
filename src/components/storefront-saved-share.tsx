"use client";
import { MessageCircle, TicketPercent } from "lucide-react";
import { useStorefrontCoupon } from "./use-storefront-coupon";
import { selectionItemError, selectionWhatsAppUrl, validStorefrontCoupon, type SavedSelectionChoice, type SavedSelectionItem } from "@/lib/storefront-selection-message";
import styles from "./storefront-discovery.module.css";

export function StorefrontSavedShare({ items, phone, onChange }: { items: SavedSelectionItem[]; phone: string; onChange: (id: string, choice: SavedSelectionChoice) => void }) {
  const { coupon, setCoupon } = useStorefrontCoupon();
  if (!items.length) return null;
  const valid = validStorefrontCoupon(coupon);
  const incomplete = items.filter(item => selectionItemError(item));
  const url = selectionWhatsAppUrl(phone, items, coupon);
  return <section className={styles.savedShare} aria-label="Enviar produtos salvos">
    <div><span><TicketPercent size={17} /> Sua seleção, pronta para conversar</span><h3>{items.length} {items.length === 1 ? "produto salvo" : "produtos salvos"}</h3><p>A mensagem inclui todos os seus salvos de Suplementos e Fitness, mesmo com filtros ativos. Ajuste as quantidades e escolha sua combinação nas roupas abaixo.</p></div>
    <div className={styles.savedShareAction}>
      <label htmlFor="saved-coupon">Seu cupom (opcional)<input id="saved-coupon" value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="BEMVINDO-…" maxLength={64} autoCapitalize="characters" spellCheck={false} aria-invalid={!valid} aria-describedby="saved-coupon-help" /></label>
      <p id="saved-coupon-help">{valid ? "O cupom gerado nesta visita aparece aqui. Você também pode colar um código que já recebeu." : "Use somente letras, números e hífen no código do cupom."}</p>
      {url ? <a className={styles.savedWhatsApp} href={url} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />{coupon ? "Enviar seleção com cupom" : "Enviar seleção no WhatsApp"}</a> : <button className={styles.savedWhatsApp} disabled>{!valid ? "Confira o código do cupom" : incomplete.length ? "Complete sua seleção abaixo" : "Atendimento indisponível no momento"}</button>}
      {incomplete.length > 0 && <p role="status">Revise: {incomplete.map(item => item.name).join(", ")}.</p>}
      <small>Você revisa a mensagem no WhatsApp antes de enviar. A equipe confirma estoque, tamanhos e condições do cupom.</small>
    </div>
    <div className={styles.savedEditors}>
      {items.map(item => {
        const { choice } = item;
        const sizes = [...new Set(item.options.map(o => o.size))];
        const colors = [...new Set(item.options.filter(o => o.size === choice.size).map(o => o.color))];
        const error = selectionItemError(item);
        const errorId = `selection-${item.id}-help`;
        return <fieldset key={item.id} className={styles.savedEditor}>
          <legend>{item.name}</legend>
          <div className={styles.savedOptions}>
            <label>Quantidade<input aria-label={`Quantidade de ${item.name}`} type="number" inputMode="numeric" min="1" step="1" value={choice.quantity} onChange={e => onChange(item.id, { ...choice, quantity: e.target.value })} aria-describedby={errorId} /></label>
            {item.operation === "fitness" && item.options.length > 0 && <>
              <label>Tamanho<select aria-label={`Tamanho de ${item.name}`} value={choice.size} onChange={e => onChange(item.id, { ...choice, size: e.target.value, color: "" })} aria-describedby={errorId}><option value="">Escolha</option>{sizes.map(size => <option key={size}>{size}</option>)}</select></label>
              <label>Cor<select aria-label={`Cor de ${item.name}`} value={choice.color} disabled={!choice.size} onChange={e => onChange(item.id, { ...choice, color: e.target.value })} aria-describedby={errorId}><option value="">{choice.size ? "Escolha" : "Escolha o tamanho"}</option>{colors.map(color => <option key={color}>{color}</option>)}</select></label>
            </>}
          </div>
          <p id={errorId} className={error ? styles.selectionError : undefined}>{error ?? (item.operation === "fitness" && !item.options.length ? "Sem tamanhos e cores disponíveis na vitrine. Consulte as opções no atendimento." : "Sua escolha vai junto na mensagem.")}</p>
        </fieldset>;
      })}
    </div>
  </section>;
}
