"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ACTIVE_CLASS = "v45143-active-physical";

export function CompanyOperationActiveVisualFix() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/dashboard") return;

    let frame = 0;

    function sync() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const track = document.querySelector<HTMLElement>(
          ".company-operation-track-v4514",
        );

        if (!track) return;

        const slides = Array.from(
          track.querySelectorAll<HTMLElement>(
            ".company-operation-slide-v4514",
          ),
        );

        if (!slides.length) return;

        const center = track.scrollLeft + track.clientWidth / 2;

        let nearest: HTMLElement | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const slide of slides) {
          const slideCenter =
            slide.offsetLeft + slide.clientWidth / 2;
          const distance = Math.abs(slideCenter - center);

          if (distance < nearestDistance) {
            nearest = slide;
            nearestDistance = distance;
          }
        }

        for (const slide of slides) {
          slide.classList.toggle(
            ACTIVE_CLASS,
            slide === nearest,
          );
        }
      });
    }

    sync();

    const track = document.querySelector<HTMLElement>(
      ".company-operation-track-v4514",
    );

    track?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      track?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();

      document
        .querySelectorAll<HTMLElement>(
          `.company-operation-slide-v4514.${ACTIVE_CLASS}`,
        )
        .forEach((slide) =>
          slide.classList.remove(ACTIVE_CLASS),
        );
    };
  }, [pathname]);

  return (
    <style>{`
      .company-operation-slide-v4514.v45143-active-physical {
        opacity: 1 !important;
        filter: saturate(1) brightness(1) !important;
      }

      @media (max-width: 820px) {
        .company-operation-slide-v4514.v45143-active-physical {
          opacity: 1 !important;
          filter: saturate(1) brightness(1) !important;
        }
      }
    `}</style>
  );
}
