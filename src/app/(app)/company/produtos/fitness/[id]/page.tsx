import FitnessProductPage from "../../../../fitness/produtos/[id]/page";
import Link from "next/link";
import { Boxes } from "lucide-react";

export default function CompanyFitnessProductPage({ params }: { params: Promise<{ id: string }> }) {
  return <><div className="company-product-detail-stock-link"><Link className="button ghost" href="/company/estoque?operacao=fitness"><Boxes size={16}/>Abrir estoque</Link></div><FitnessProductPage params={params} companyMode /></>;
}

export const dynamic = "force-dynamic";
