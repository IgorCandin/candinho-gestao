import { DemoBanner } from "@/components/demo-banner";
import { NewLeadForm } from "@/components/new-lead-form";
import { PageHeader } from "@/components/page-header";
import { getCustomerOptions,getProductOptions } from "@/lib/data";
export default async function NewLeadPage(){const[customers,products]=await Promise.all([getCustomerOptions(),getProductOptions()]);return <><DemoBanner/><PageHeader eyebrow="Comercial" title="Novo lead" description="Registre o interesse sem criar pagamento, entrega ou baixa de estoque."/><NewLeadForm customers={customers} products={products}/></>}
