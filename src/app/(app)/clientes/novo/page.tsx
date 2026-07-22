import { DemoBanner } from "@/components/demo-banner";
import { NewCustomerForm } from "@/components/new-customer-form";
import { PageHeader } from "@/components/page-header";
export default function NewCustomerPage(){return <><DemoBanner/><PageHeader eyebrow="Relacionamento" title="Novo cliente" description="Cadastre os dados básicos para usar em leads, vendas e pós-venda."/><NewCustomerForm/></>}
