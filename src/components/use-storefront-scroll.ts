"use client";

import { useEffect, type RefObject } from "react";

export function useStorefrontScroll(root: RefObject<HTMLElement | null>, motion: boolean) {
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const visible = new Set<HTMLElement>();
    const revealed = new WeakSet<Element>();
    const running = new Set<Animation>();
    let frame = 0;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const update = () => {
      frame = 0;
      if (!motion) return;
      const height = window.innerHeight;
      // Read all geometry first, then write styles without React renders.
      const positions = [...visible].map(element => ({ element, rect: element.getBoundingClientRect() }));
      const pageRect = page.getBoundingClientRect();
      for (const { element, rect } of positions) {
        const progress = clamp((height - rect.top) / (height + rect.height));
        const reveal = clamp((height - rect.top) / (height * .65));
        element.style.setProperty("--scroll-position", progress.toFixed(4));
        element.style.setProperty("--reveal", reveal.toFixed(4));
      }
      page.style.setProperty("--page-progress", String(clamp(-pageRect.top / Math.max(1, pageRect.height - height))));
    };
    const schedule = () => { if (!frame && motion) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
        if (entry.isIntersecting) {
          visible.add(entry.target as HTMLElement);
          if (motion && !revealed.has(entry.target) && entry.target.matches("[data-product-reveal], [data-section-reveal]")) {
            revealed.add(entry.target);
            const product = entry.target.matches("[data-product-reveal]");
            const order = Number((entry.target as HTMLElement).dataset.revealOrder ?? 0);
            const animation = entry.target.animate(product ? [
              { transform: `translate3d(${order % 2 ? 16 : -16}px,55px,0) rotate(${order % 2 ? 3 : -3}deg) scale(.93)`, opacity: .12 },
              { transform: "translate3d(0,-4px,0) rotate(0) scale(1)", opacity: 1, offset: .8 },
              { transform: "translate3d(0,0,0) rotate(0) scale(1)", opacity: 1 },
            ] : [
              { transform: "translate3d(-28px,24px,0)", opacity: .15 },
              { transform: "translate3d(0,0,0)", opacity: 1 },
            ], { duration: product ? 1050 : 850, delay: product ? order % 6 * 85 : 0, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
            running.add(animation);
            animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
          }
        }
        else visible.delete(entry.target as HTMLElement);
      }
      schedule();
    }, { rootMargin: "0px 0px -24px", threshold: .08 });
    const observed = new Set<Element>();
    const discover = () => {
      page.querySelectorAll<HTMLElement>("[data-scroll-scene]").forEach(element => {
        if (!observed.has(element)) { observed.add(element); observer.observe(element); }
      });
      // Filters and progressive loading can replace product nodes.
      for (const element of observed) {
        if (!element.isConnected) { observer.unobserve(element); observed.delete(element); visible.delete(element as HTMLElement); }
      }
      schedule();
    };
    const mutations = new MutationObserver(discover);
    mutations.observe(page, { childList: true, subtree: true });
    const preferenceChanged = () => {
      page.setAttribute("data-motion", motion ? "active" : "reduced");
      if (!motion) running.forEach(animation => animation.cancel());
      schedule();
    };
    preferenceChanged();
    discover();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      running.forEach(animation => animation.cancel());
      observer.disconnect(); mutations.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [root, motion]);
}
