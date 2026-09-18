import { redirect } from "next/navigation";

export default async function CompanyNewSupplementQuotePage({ searchParams }: { searchParams: Promise<{ quote?: string }> }) {
  const { quote } = await searchParams;
  redirect(quote ? `/company/vendas/nova/suplementos?quote=${encodeURIComponent(quote)}` : "/company/vendas/nova/suplementos");
}
