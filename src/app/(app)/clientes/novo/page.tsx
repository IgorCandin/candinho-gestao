import { DemoBanner } from "@/components/demo-banner";
import { NewCustomerForm } from "@/components/new-customer-form";
import { PageHeader } from "@/components/page-header";
import { getCustomerOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewCustomerPage() {
  const [customers, supabase] = await Promise.all([
    getCustomerOptions(),
    createClient(),
  ]);

  const { data: partners, error } = await supabase
    .from("partners")
    .select("id,name,partner_type,city")
    .eq("active", true)
    .neq("partner_type", "supplier")
    .order("name");

  if (error) throw error;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Relacionamento"
        title="Novo cliente"
        description="Cadastre os dados básicos e, se já souber, os vínculos com outras pessoas ou parceiros. Isso alimenta o Nexus e evita marcações manuais depois."
      />
      <NewCustomerForm customers={customers} partners={partners ?? []} />
    </>
  );
}
