import { redirect } from "next/navigation";

export default function LegacySupplementsOperationalCostsPage() {
  redirect("/central/custos-insumos?operacao=supplements");
}
