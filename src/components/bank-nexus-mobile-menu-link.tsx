"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function BankNexusMobileMenuLink() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/bank")) {
      setHost(null);
      return;
    }

    let slot: HTMLDivElement | null = null;

    const mount = () => {
      const panel = document.querySelector<HTMLElement>(
        ".mobile-menu-panel",
      );

      if (!panel) return;

      const existing = panel.querySelector<HTMLDivElement>(
        '[data-bank-nexus-mobile-slot="true"]',
      );

      if (existing) {
        slot = existing;
        setHost(existing);
        return;
      }

      slot = document.createElement("div");
      slot.dataset.bankNexusMobileSlot = "true";
      slot.style.width = "100%";
      slot.style.flex = "0 0 auto";

      const signout = panel.querySelector("form");
      panel.insertBefore(slot, signout ?? null);

      setHost(slot);
    };

    mount();

    const observer = new MutationObserver(() => {
      if (!host) mount();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      slot?.remove();
      setHost(null);
    };
  }, [pathname]);

  if (!host) return null;

  return createPortal(
    <Link
      className={`mobile-menu-link ${
        pathname.startsWith("/bank/nexus") ? "primary" : ""
      }`}
      href="/bank/nexus"
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        details?.removeAttribute("open");
      }}
    >
      <Bot size={18} />
      <span>Nexus Bank</span>
    </Link>,
    host,
  );
}
