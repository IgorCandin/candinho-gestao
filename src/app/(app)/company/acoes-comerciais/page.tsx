import Link from "next/link";
import { PackageMinus } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyCommercialActionsPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  return (
    <main className="company-stock-expense">
      <header>
        <span>COMPANY · AÇÕES COMERCIAIS</span>
        <h1>Baixas e ações comerciais</h1>
        <p>Registre amostras, avarias e uso interno dentro da Company, sem abrir a operação antiga.</p>
      </header>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Registrar saída de estoque</h2>
            <p>Escolha Suplementos ou Fitness, o item e a quantidade. A baixa não cria uma venda.</p>
          </div>
          <PackageMinus size={20} />
        </div>
        <div className="panel-body">
          <Link className="button company-blue" href="/company/estoque/despesa">
            <PackageMinus size={16} />
            Abrir despesa / baixa
          </Link>
        </div>
      </section>
    </main>
  );
}
