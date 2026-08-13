import { PublicCatalogOperationPage } from "@/components/public-catalog-operation-page";

export const revalidate = 10;

export default function SupplementsCatalogPage() {
  return (
    <PublicCatalogOperationPage operation="supplements" />
  );
}
