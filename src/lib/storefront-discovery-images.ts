import type { PublicStorefrontProduct } from "./public-storefront-data";
import supplementCutouts from "./storefront-supplement-cutouts.json";

// Match the source as well as the product: a future catalog photo must not be
// silently replaced by an older campaign cutout.
const cutouts = [
  ["d125ceea-551c-4ed0-a3e9-7eb01e23ab41", "primary-a233a22e-ced2-41af-a1ac-c680f1c0b18d-thumb.webp", "/discovery-products/creatina-candinho-v1.webp"],
  ["4b8fea21-25e2-4f00-9442-cce4410ae12f", "primary-3068ef24-89d9-4932-a9f5-067822cc38c0-thumb.webp", "/discovery-products/abduzido-v1.webp"],
  ["c1a931d4-c5d4-4405-b61e-7192e481d33a","PROD_69395.Foto.001927.jpg","/discovery-products/fitness-c1a931d4-c5d4-4405-b61e-7192e481d33a-v1.webp"],
  ["96033a4b-06bc-4f32-bc46-bf86bd4863ee","PROD-00046.Foto.175232.jpg","/discovery-products/fitness-96033a4b-06bc-4f32-bc46-bf86bd4863ee-v1.webp"],
  ["4244fa2f-8232-4170-95b7-63810bfa490d","1786393595548-c74d73fe-6f26-4ddd-a09e-0b4326e95a96.png","/discovery-products/fitness-4244fa2f-8232-4170-95b7-63810bfa490d-v1.webp"],
  ["7a626878-d1b7-4368-9257-7c47defef78b","PROD-00035.Foto.171230.jpg","/discovery-products/fitness-7a626878-d1b7-4368-9257-7c47defef78b-v1.webp"],
  ["9e52f835-6128-4bd1-baf2-6e36b9788646","PROD-00042.Foto.172620.jpg","/discovery-products/fitness-9e52f835-6128-4bd1-baf2-6e36b9788646-v1.webp"],
  ["453c7a6f-86f4-4af1-a58b-9984f6ced030","PROD-00034.Foto.171002.jpg","/discovery-products/fitness-453c7a6f-86f4-4af1-a58b-9984f6ced030-v1.webp"],
  ["36f103a1-9648-406a-b33d-dc67557c4579","PROD-00044.Foto.175001.jpg","/discovery-products/fitness-36f103a1-9648-406a-b33d-dc67557c4579-v1.webp"],
  ["8ae6aafe-fa07-41ad-a8d9-ede230f25728","PROD-00005.Foto.180838.jpg","/discovery-products/fitness-8ae6aafe-fa07-41ad-a8d9-ede230f25728-v1.webp"],
  ["689fd0be-85ca-4f5b-856b-fb64077232b0","PROD-00024.Foto.113022.jpg","/discovery-products/fitness-689fd0be-85ca-4f5b-856b-fb64077232b0-v1.webp"],
  ["f8c6c858-e8c4-4b43-949e-1dcbd42aded8","1785716269942-136667f4-ce21-4daf-a10d-5b815b6ae9e3.png","/discovery-products/fitness-f8c6c858-e8c4-4b43-949e-1dcbd42aded8-v1.webp"],
  ["e44a5163-5373-45ce-8054-ade91d6758e1","PROD-00031.Foto.204657.jpg","/discovery-products/fitness-e44a5163-5373-45ce-8054-ade91d6758e1-v1.webp"],
  ["d9ca4d76-8f40-4ec7-907e-b5ae6690d3b7","PROD-00006.Foto.182608.jpg","/discovery-products/fitness-d9ca4d76-8f40-4ec7-907e-b5ae6690d3b7-v1.webp"],
  ["10a58458-66ad-45db-a674-70c334bc3c7e","PROD-00014.Foto.015025.jpg","/discovery-products/fitness-10a58458-66ad-45db-a674-70c334bc3c7e-v1.webp"],
  ["4c0bd74a-afe4-49be-890d-1ba5d6d06188","PROD_21672.Foto.191157.jpg","/discovery-products/fitness-4c0bd74a-afe4-49be-890d-1ba5d6d06188-v1.webp"],
  ["3bc0fe6e-3883-4e81-9f16-9c8154a8745c","PROD_10538.Foto.191213.jpg","/discovery-products/fitness-3bc0fe6e-3883-4e81-9f16-9c8154a8745c-v1.webp"],
  ["059d5990-ca73-4b5c-92c1-a9ea11f7ddb9","PROD-00017.Foto.014021.jpg","/discovery-products/fitness-059d5990-ca73-4b5c-92c1-a9ea11f7ddb9-v1.webp"],
  ["f1d4bd23-47b8-4c90-98aa-6bdfbfb44f44","PROD-00016.Foto.015220.jpg","/discovery-products/fitness-f1d4bd23-47b8-4c90-98aa-6bdfbfb44f44-v1.webp"],
  ["8f01ecc9-6e05-40c5-9272-19ab87441383","PROD-00026.Foto.171252.jpg","/discovery-products/fitness-8f01ecc9-6e05-40c5-9272-19ab87441383-v1.webp"],
  ["535cbe9c-f52f-4d10-9031-bfe517fa93a9","PROD-00027.Foto.171345.jpg","/discovery-products/fitness-535cbe9c-f52f-4d10-9031-bfe517fa93a9-v1.webp"],
  ["f24d8865-4813-48e7-aeef-e61bc1d65c30","PROD_94901.Foto.002007.jpg","/discovery-products/fitness-f24d8865-4813-48e7-aeef-e61bc1d65c30-v1.webp"],
  ["d0173dc9-d14f-4a36-81c8-a844fd769aea","PROD-00048.Foto.114114.jpg","/discovery-products/fitness-d0173dc9-d14f-4a36-81c8-a844fd769aea-v1.webp"],
] as const;

export function discoveryCutout(product: PublicStorefrontProduct): string | undefined {
  return cutouts.find(([id, source]) => product.id === id && product.image_url?.endsWith(source))?.[2]
    ?? supplementCutouts.find(row => product.id === row.id && product.image_url?.endsWith(row.source))?.asset;
}

export function discoveryOriginal(url: string): string {
  // The existing uploader writes this full-size sibling before its thumbnail.
  return url.includes("/storage/v1/object/public/product-images/")
    ? url.replace(/-thumb\.webp$/, ".webp") : url;
}

export function discoveryImage(product: PublicStorefrontProduct): string | null {
  const cutout = discoveryCutout(product);
  return (cutout ? supplementCutouts.find(row => row.asset === cutout)?.display ?? cutout : null)
    ?? (product.image_url ? discoveryOriginal(product.image_url) : null);
}
