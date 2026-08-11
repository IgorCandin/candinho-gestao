import { redirect } from "next/navigation";

export default function ProductManagementRedirect() {
  redirect("/suplementos/estoque#gestao-produtos");
}
