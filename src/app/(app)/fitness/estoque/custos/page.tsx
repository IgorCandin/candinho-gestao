import { redirect } from "next/navigation";

export default function LegacyFitnessOperationalCostsPage() {
  redirect("/central/custos-insumos?operacao=fitness");
}
