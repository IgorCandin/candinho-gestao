import { PublicCatalogGuide } from "./public-catalog-guide";
import { CustomDemandForm } from "./public-backorder-section";
import { StorefrontCouponSignup } from "./storefront-coupon-signup";
import { StorefrontTestimonials, type StorefrontTestimonial } from "./storefront-testimonials";
import styles from "./storefront-discovery.module.css";

export function StorefrontSupport({ testimonials, remaining }: { testimonials: StorefrontTestimonial[]; remaining: number | null }) {
  return <div className={styles.support}>
    <div id="catalogo-assistido" className={styles.assisted} data-scroll-scene data-section-reveal><PublicCatalogGuide /></div>
    <div className={styles.testimonials} data-scroll-scene data-section-reveal><StorefrontTestimonials items={testimonials} /></div>
    <div className={styles.signup} data-scroll-scene data-section-reveal><StorefrontCouponSignup initialRemaining={remaining} /></div>
    <div className={styles.demand} data-scroll-scene data-section-reveal><CustomDemandForm /></div>
  </div>;
}
