"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function CentralCostsShortcut({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();
  const isCentral = pathname.startsWith("/central");
  const isActive = pathname.startsWith("/central/custos-insumos");

  const [desktopHost, setDesktopHost] = useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !isCentral) return;

    const desktopNav = document.querySelector<HTMLElement>(".sidebar .nav");
    const mobilePanel =
      document.querySelector<HTMLElement>(".mobile-menu-panel");

    const desktop = document.createElement("div");
    const mobile = document.createElement("div");

    desktop.dataset.centralCostsShortcut = "desktop";
    mobile.dataset.centralCostsShortcut = "mobile";

    if (desktopNav) {
      const ruptureLink = desktopNav.querySelector<HTMLElement>(
        'a.nav-link[href="/central/rupturas"]',
      );

      if (ruptureLink) {
        ruptureLink.after(desktop);
      } else {
        desktopNav.append(desktop);
      }

      setDesktopHost(desktop);
    }

    if (mobilePanel) {
      const ruptureLink = mobilePanel.querySelector<HTMLElement>(
        'a.mobile-menu-link[href="/central/rupturas"]',
      );

      if (ruptureLink) {
        ruptureLink.after(mobile);
      } else {
        mobilePanel.append(mobile);
      }

      setMobileHost(mobile);
    }

    return () => {
      desktop.remove();
      mobile.remove();
      setDesktopHost(null);
      setMobileHost(null);
    };
  }, [enabled, isCentral, pathname]);

  if (!enabled || !isCentral) return null;

  const desktopLink = (
    <Link
      className={`nav-link ${isActive ? "primary" : ""}`}
      href="/central/custos-insumos"
    >
      <Boxes size={18} />
      <span className="nav-label">Custos e insumos</span>
    </Link>
  );

  const mobileLink = (
    <Link
      className={`mobile-menu-link ${isActive ? "primary" : ""}`}
      href="/central/custos-insumos"
      onClick={() =>
        document
          .querySelector<HTMLDetailsElement>(".mobile-menu")
          ?.removeAttribute("open")
      }
    >
      <Boxes size={18} />
      <span className="nav-label">Custos e insumos</span>
    </Link>
  );

  return (
    <>
      {desktopHost && createPortal(desktopLink, desktopHost)}
      {mobileHost && createPortal(mobileLink, mobileHost)}
    </>
  );
}
