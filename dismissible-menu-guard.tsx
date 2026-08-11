"use client";

import { useEffect } from "react";

const DISMISSIBLE_SELECTOR =
  'details[data-dismissible-menu="true"][open]';

export function DismissibleMenuGuard() {
  useEffect(() => {
    let swallowNextClick = false;

    function openMenus() {
      return Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          DISMISSIBLE_SELECTOR,
        ),
      );
    }

    function closeMenus() {
      openMenus().forEach((menu) => {
        menu.removeAttribute("open");
      });
    }

    function onPointerDown(event: PointerEvent) {
      const menus = openMenus();
      if (menus.length === 0) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (menus.some((menu) => menu.contains(target))) {
        return;
      }

      // Primeiro toque fora serve SOMENTE para fechar o menu.
      // Ele não pode "atravessar" e acionar o conteúdo que está atrás.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      swallowNextClick = true;
      closeMenus();
    }

    function onClick(event: MouseEvent) {
      if (!swallowNextClick) return;

      swallowNextClick = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openMenus().length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      closeMenus();
    }

    document.addEventListener(
      "pointerdown",
      onPointerDown,
      true,
    );
    document.addEventListener(
      "click",
      onClick,
      true,
    );
    document.addEventListener(
      "keydown",
      onKeyDown,
      true,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onPointerDown,
        true,
      );
      document.removeEventListener(
        "click",
        onClick,
        true,
      );
      document.removeEventListener(
        "keydown",
        onKeyDown,
        true,
      );
    };
  }, []);

  return null;
}
