import { redirect } from "next/navigation";

export default function LegacyFitnessOperationalCostsPage() {
  redirect("/company/custos-insumos?operacao=fitness");
}
