import Image from "next/image";
import Link from "next/link";
import { CustomerAccountPortal } from "@/components/customer-account-portal";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const company = BRAND_ASSETS.company.complete;
  return <main className="customer-account-page"><nav><Link href="/catalogo"><Image src={company.src} alt={company.alt} width={company.width} height={company.height}/></Link><Link href="/catalogo">Voltar para a Vitrine</Link></nav><CustomerAccountPortal verifiedEmail={user?.email ?? null}/></main>;
}
