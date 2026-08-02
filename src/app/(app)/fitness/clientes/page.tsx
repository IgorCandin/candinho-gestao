import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getFitnessCustomers } from "@/lib/data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";

function customerContact(
  name: string,
  phone: string | null,
  instagram: string | null,
) {
  const contact =
    phone?.trim() || instagram?.trim();

  return contact
    ? `${name} - ${contact}`
    : name;
}

export default async function Page() {
  const customers =
    await getFitnessCustomers();

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Relacionamento"
        title="Clientes Fitness"
        description="Nome, telefone e cidade vêm da mesma identidade da Candinho Company. Aqui ficam somente histórico, Instagram e relacionamento da Fitness."
        action={
          <Link
            className="button gold"
            href="/fitness/clientes/novo"
          >
            <Plus size={16} />
            Novo cliente
          </Link>
        }
      />

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Quem já passou pela Fitness</h2>
            <p>
              Clientes de Suplementos que ainda não
              compraram Fitness continuam disponíveis
              na busca de venda/orçamento sem inflar
              esta lista.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cidade</th>
                <th>Compras</th>
                <th>Total gasto</th>
                <th>Última compra</th>
                <th>Classificação</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link
                      className="table-link fitness-readable-label"
                      href={`/fitness/clientes/${customer.id}`}
                    >
                      {customerContact(
                        customer.name,
                        customer.phone,
                        customer.instagram,
                      )}
                    </Link>
                  </td>
                  <td>
                    {customer.city || "—"}
                  </td>
                  <td>
                    {customer.total_purchases}
                  </td>
                  <td>
                    {formatCurrency(
                      customer.total_spent,
                    )}
                  </td>
                  <td>
                    {customer.last_purchase_on
                      ? formatDateOnly(
                          customer.last_purchase_on,
                        )
                      : "—"}
                  </td>
                  <td>
                    {customer.classification}
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    Nenhum cliente com histórico
                    Fitness ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
