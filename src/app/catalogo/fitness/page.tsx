import { PublicCatalogOperationPage } from "@/components/public-catalog-operation-page";

export const revalidate = 10;

export default function FitnessCatalogPage() {
  return (
    <PublicCatalogOperationPage operation="fitness" />
  );
}
