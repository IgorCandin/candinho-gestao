import { redirect } from "next/navigation";
import { discoveryUrl, type StorefrontSearchParams } from "@/lib/storefront-navigation";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<StorefrontSearchParams> }) {
  redirect(discoveryUrl(await searchParams));
}
