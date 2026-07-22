import { PageHeader } from "@/components/page-header";
import { ProductComboForm } from "@/components/product-combo-form";
import { getProductOptions } from "@/lib/data";
export default async function NewComboPage(){const products=await getProductOptions();return <><PageHeader eyebrow="Catálogo · Combos" title="Novo combo" description="Monte uma oferta usando os produtos já cadastrados. O estoque do combo será calculado pelos componentes."/><ProductComboForm products={products}/></>}
