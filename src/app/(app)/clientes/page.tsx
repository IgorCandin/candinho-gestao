import Link from "next/link";
import { Plus } from "lucide-react";
import { CustomersTable } from "@/components/customers-table";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { getCustomers } from "@/lib/data";
export default async function CustomersPage(){const customers=await getCustomers();return <><DemoBanner/><PageHeader eyebrow="Relacionamento" title="Clientes" description="Histórico, leads, pedidos e pós-venda reunidos em uma ficha única." action={<Link className="button gold" href="/clientes/novo"><Plus size={16}/>Novo cliente</Link>}/><article className="panel">{customers.length===0?<div className="empty"><strong>Nenhum cliente cadastrado</strong>Cadastre o primeiro cliente.</div>:<CustomersTable customers={customers}/>}</article></>}
