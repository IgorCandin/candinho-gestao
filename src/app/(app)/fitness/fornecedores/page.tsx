import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getFitnessSuppliers } from "@/lib/data";
import { formatDateOnly } from "@/lib/format";

export default async function Page() {
  const suppliers = await getFitnessSuppliers();

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Compras"
        title="Fornecedores"
        description="Fornecedores, marketplaces e histórico de reposições."
        action={
          <Link className="button gold" href="/fitness/fornecedores/novo">
            <Plus size={16} />
            Novo fornecedor
          </Link>
        }
      />

      <article className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Contato</th>
                <th>Pedidos</th>
                <th>Em aberto</th>
                <th>A caminho</th>
                <th>Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <Link
                      className="table-link fitness-readable-label"
                      href={`/fitness/fornecedores/${supplier.id}`}
                    >
                      {supplier.name} - {supplier.active ? "Ativo" : "Inativo"}
                    </Link>
                  </td>
                  <td>
                    {supplier.contact_name ||
                      supplier.phone ||
                      supplier.email ||
                      "—"}
                  </td>
                  <td>{supplier.order_count}</td>
                  <td>{supplier.open_orders}</td>
                  <td>{supplier.incoming_units}</td>
                  <td>
                    {supplier.last_order_on
                      ? formatDateOnly(supplier.last_order_on)
                      : "—"}
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6}>Nenhum fornecedor cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
