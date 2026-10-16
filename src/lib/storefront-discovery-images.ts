import type { PublicStorefrontProduct } from "./public-storefront-data";

// Match the source as well as the product: a future catalog photo must not be
// silently replaced by an older campaign cutout.
const cutouts = [
  ["d125ceea-551c-4ed0-a3e9-7eb01e23ab41", "primary-a233a22e-ced2-41af-a1ac-c680f1c0b18d-thumb.webp", "/discovery-products/creatina-candinho-v1.webp"],
  ["4b8fea21-25e2-4f00-9442-cce4410ae12f", "primary-3068ef24-89d9-4932-a9f5-067822cc38c0-thumb.webp", "/discovery-products/abduzido-v1.webp"],
] as const;

export function discoveryCutout(product: PublicStorefrontProduct): string | undefined {
  return cutouts.find(([id, source]) => product.id === id && product.image_url?.endsWith(source))?.[2];
}

export function discoveryOriginal(url: string): string {
  // The existing uploader writes this full-size sibling before its thumbnail.
  return url.includes("/storage/v1/object/public/product-images/")
    ? url.replace(/-thumb\.webp$/, ".webp") : url;
}

export function discoveryImage(product: PublicStorefrontProduct): string | null {
  return discoveryCutout(product) ?? (product.image_url ? discoveryOriginal(product.image_url) : null);
}
