"use client";

import { useEffect } from "react";

/**
 * Mantém a gaveta do menu móvel dentro do visual viewport real.
 *
 * O histórico de UX mostrou o mesmo painel ultrapassando 54–61 px
 * em várias operações. A posição vertical pode variar por cabeçalho,
 * safe-area e regras antigas; por isso a altura é calculada a partir
 * do topo real do painel, em vez de assumir um valor fixo.
 */
export function MobileMenuViewportGuard() {
  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const viewportBottom =
          window.visualViewport
            ? window.visualViewport.offsetTop +
              window.visualViewport.height
            : window.innerHeight;

        const panels =
          document.querySelectorAll<HTMLElement>(
            ".mobile-menu[open] .mobile-menu-panel",
          );

        for (const panel of panels) {
          // Remove o valor anterior antes da medição para não acumular
          // uma altura já limitada numa rotação/resize seguinte.
          panel.style.removeProperty(
            "--v4519-mobile-menu-max-height",
          );

          const rect = panel.getBoundingClientRect();
          const available = Math.max(
            180,
            Math.floor(viewportBottom - rect.top - 8),
          );

          panel.style.setProperty(
            "--v4519-mobile-menu-max-height",
            `${available}px`,
          );
        }
      });
    };

    const onToggle = (event: Event) => {
      const target = event.target;

      if (
        target instanceof HTMLDetailsElement &&
        target.classList.contains("mobile-menu") &&
        target.open
      ) {
        update();
        requestAnimationFrame(update);
      }
    };

    document.addEventListener("toggle", onToggle, true);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.type === "attributes" &&
            mutation.attributeName === "open",
        )
      ) {
        update();
      }
    });

    document
      .querySelectorAll(".mobile-menu")
      .forEach((menu) =>
        observer.observe(menu, {
          attributes: true,
          attributeFilter: ["open"],
        }),
      );

    update();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("toggle", onToggle, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return null;
}
