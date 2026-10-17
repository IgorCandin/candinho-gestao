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
        if (entry.isIntersecting) {
          visible.add(entry.target as HTMLElement);
          if (motion && !revealed.has(entry.target) && entry.target.matches("[data-product-reveal]")) {
            revealed.add(entry.target);
            const animation = entry.target.animate([
              { clipPath: "inset(12% 0 0 0 round 14px)", opacity: .4 },
              { clipPath: "inset(0 0 0 0 round 14px)", opacity: 1 },
            ], { duration: 760, delay: Number((entry.target as HTMLElement).dataset.revealOrder ?? 0) % 4 * 55, easing: "cubic-bezier(.16,1,.3,1)" });
            running.add(animation);
            animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
          }
        }
        else visible.delete(entry.target as HTMLElement);
      }
      schedule();
    }, { rootMargin: "20px", threshold: .05 });
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
