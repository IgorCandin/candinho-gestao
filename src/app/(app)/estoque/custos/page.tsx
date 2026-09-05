import { redirect } from "next/navigation";

export default function LegacySupplementsOperationalCostsPage() {
  redirect("/company/custos-insumos?operacao=supplements");
}
