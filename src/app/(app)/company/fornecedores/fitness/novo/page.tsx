import { FitnessSupplierForm } from "@/components/fitness-supplier-form";
import { PageHeader } from "@/components/page-header";
export default function Page(){return <><PageHeader eyebrow="Company · Fitness" title="Novo fornecedor" description="Cadastre fornecedores ou marketplaces usados nas compras."/><FitnessSupplierForm returnBase="/company/fornecedores/fitness"/></>}
