import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

const SECTORS: Record<string, { title: string; description: string }> = {
  vender: { title: "Vender agora", description: "A próxima etapa reunirá recompra, leads quentes e oportunidades em uma fila única de venda." },
  receber: { title: "Receber dinheiro", description: "A próxima etapa reunirá cobranças vencidas, valores de hoje e acordos pendentes." },
  acompanhar: { title: "Atender e acompanhar", description: "A próxima etapa reunirá pós-vendas, respostas aguardadas e retornos combinados." },
  entregar: { title: "Entregar", description: "A próxima etapa reunirá pedidos prontos, retiradas, rotas e pendências logísticas." },
  dia: { title: "Organizar o dia", description: "A próxima etapa reunirá agenda, tarefas, alertas e itens sem próxima ação." },
};

export default async function CompanySectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const { sector } = await params;
  const config = SECTORS[sector];
  if (!config) notFound();

  return <div className="company-v2-page"><div className="company-coming-soon"><Construction size={34} /><span>ERP 2.0 · Próximo módulo</span><h1>{config.title}</h1><p>{config.description}</p><Link className="button ghost" href="/company/inicio"><ArrowLeft size={16} />Voltar à Company</Link></div></div>;
}
