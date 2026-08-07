/* eslint-disable @next/next/no-img-element */
"use client";

import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductBannerUploader } from "@/components/product-banner-uploader";

type Snapshot = {
  id: string;
  name: string;
  banner_image_url: string | null;
  banner_mobile_image_url: string | null;
};

export function ProductBannerPortal({
  enabled,
  canEdit,
}: {
  enabled: boolean;
  canEdit: boolean;
}) {
  const pathname = usePathname();
  const productId = useMemo(() => {
    const match = pathname.match(
      /^\/produtos\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i,
    );
    return match?.[1] ?? null;
  }, [pathname]);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [heroHost, setHeroHost] = useState<HTMLElement | null>(null);
  const [managerHost, setManagerHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !productId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/products/${productId}/banner`, {
          cache: "no-store",
        });

        if (!response.ok) return;
        const payload = (await response.json()) as Snapshot;

        if (!cancelled) setSnapshot(payload);
      } catch {
        // Banner é decorativo; nunca interrompe a tela do produto.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, productId]);

  useEffect(() => {
    if (!enabled || !productId) {
      setHeroHost(null);
      setManagerHost(null);
      return;
    }

    let hero: HTMLElement | null = null;
    let manager: HTMLElement | null = null;

    const attach = () => {
      if (!hero) {
        const stockSummary =
          document.querySelector<HTMLElement>(".product-stock-summary");

        if (stockSummary?.parentElement) {
          hero = document.createElement("div");
          hero.dataset.productBannerHero = productId;
          stockSummary.parentElement.insertBefore(hero, stockSummary);
          setHeroHost(hero);
        }
      }

      if (canEdit && !manager) {
        const imageBody = document.querySelector<HTMLElement>(
          ".product-images-panel .panel-body",
        );

        if (imageBody) {
          manager = document.createElement("div");
          manager.dataset.productBannerManager = productId;
          imageBody.append(manager);
          setManagerHost(manager);
        }
      }

      return Boolean(hero && (!canEdit || manager));
    };

    attach();

    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      hero?.remove();
      manager?.remove();
      setHeroHost(null);
      setManagerHost(null);
    };
  }, [canEdit, enabled, productId]);

  if (!enabled || !productId || !snapshot) return null;

  const desktop = snapshot.banner_image_url;
  const mobile = snapshot.banner_mobile_image_url;

  return (
    <>
      {heroHost &&
        (desktop || mobile) &&
        createPortal(
          <section className="v458-internal-product-banner">
            <picture>
              {mobile && (
                <source media="(max-width: 720px)" srcSet={mobile} />
              )}
              <img
                src={desktop || mobile || ""}
                alt={`Banner de ${snapshot.name}`}
              />
            </picture>
          </section>,
          heroHost,
        )}

      {canEdit &&
        managerHost &&
        createPortal(
          <ProductBannerUploader
            productId={productId}
            desktopUrl={desktop}
            mobileUrl={mobile}
            onChanged={(slot, url) => {
              setSnapshot((current) =>
                current
                  ? {
                      ...current,
                      banner_image_url:
                        slot === "desktop"
                          ? url
                          : current.banner_image_url,
                      banner_mobile_image_url:
                        slot === "mobile"
                          ? url
                          : current.banner_mobile_image_url,
                    }
                  : current,
              );
            }}
          />,
          managerHost,
        )}
    </>
  );
}
