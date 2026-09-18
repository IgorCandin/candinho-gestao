import { redirect } from "next/navigation";

export default async function CompanyFitnessNewQuotePage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const { interest } = await searchParams;
  redirect(interest ? `/company/vendas/nova/fitness?interest=${encodeURIComponent(interest)}` : "/company/vendas/nova/fitness");
}
