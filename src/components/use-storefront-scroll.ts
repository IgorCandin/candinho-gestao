"use client";

import { useEffect, type RefObject } from "react";

export function useStorefrontScroll(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visible = new Set<HTMLElement>();
    let frame = 0;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const update = () => {
      frame = 0;
      if (preference.matches) return;
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
    const schedule = () => { if (!frame && !preference.matches) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      schedule();
    }, { rootMargin: "100px" });
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
      page.setAttribute("data-motion", preference.matches ? "reduced" : "active");
      schedule();
    };
    preferenceChanged();
    discover();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect(); mutations.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, [root]);
}
