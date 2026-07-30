"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

export function ProductPublicPageShortcutPortal({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);

  const productId = useMemo(() => {
    const match = pathname.match(
      /^\/produtos\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i,
    );
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!enabled || !productId) {
      setHost(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(".page-header-action-group") ||
        document.querySelector<HTMLElement>(".page-header-actions");

      if (!target) return;

      const slot = document.createElement("span");
      slot.dataset.publicProductPageShortcut = productId;
      target.prepend(slot);
      setHost(slot);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      setHost((current) => {
        current?.remove();
        return null;
      });
    };
  }, [enabled, productId]);

  if (!host || !productId) return null;

  return createPortal(
    <Link
      className="button ghost"
      href={`/produtos/${productId}/pagina-publica`}
    >
      <Globe2 size={16} />
      Página pública
    </Link>,
    host,
  );
}
