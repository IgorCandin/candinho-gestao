"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function fallbackPath(pathname: string) {
  if (pathname.startsWith("/central")) return "/central";
  if (pathname.startsWith("/parceiro")) return "/parceiro";
  if (pathname.startsWith("/bank")) return "/bank";
  if (pathname.startsWith("/marketing")) return "/marketing";
  if (pathname.startsWith("/fitness")) return "/fitness";
  if (pathname.startsWith("/configuracoes")) return "/dashboard";
  return "/suplementos";
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']",
    ),
  );
}

export function DesktopEscapeBack() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (!window.matchMedia("(pointer: fine)").matches) {
        return;
      }

      const openDialog = document.querySelector(
        "dialog[open], [role='dialog'][aria-modal='true']",
      );

      if (openDialog) {
        return;
      }

      const openDetails = Array.from(
        document.querySelectorAll<HTMLDetailsElement>("details[open]"),
      ).at(-1);

      if (openDetails) {
        event.preventDefault();
        openDetails.removeAttribute("open");
        return;
      }

      if (pathname === "/dashboard") {
        return;
      }

      event.preventDefault();

      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.push(fallbackPath(pathname));
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, router]);

  return null;
}
