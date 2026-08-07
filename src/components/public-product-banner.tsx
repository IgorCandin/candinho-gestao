/* eslint-disable @next/next/no-img-element */

import { createClient } from "@/lib/supabase/server";

type BannerSnapshot = {
  product_id?: string;
  name?: string;
  banner_image_url?: string | null;
  banner_mobile_image_url?: string | null;
};

export async function PublicProductBanner({
  slug,
}: {
  slug: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "public_product_banner_v1",
    {
      p_slug: slug,
    },
  );

  if (error || !data || typeof data !== "object") return null;

  const snapshot = data as BannerSnapshot;
  const desktop =
    typeof snapshot.banner_image_url === "string"
      ? snapshot.banner_image_url
      : null;
  const mobile =
    typeof snapshot.banner_mobile_image_url === "string"
      ? snapshot.banner_mobile_image_url
      : null;

  if (!desktop && !mobile) return null;

  return (
    <section className="v458-public-banner-shell">
      <picture className="v458-public-product-banner">
        {mobile && (
          <source media="(max-width: 720px)" srcSet={mobile} />
        )}
        <img
          src={desktop || mobile || ""}
          alt={`Destaque de ${snapshot.name || "produto"}`}
        />
      </picture>
    </section>
  );
}
