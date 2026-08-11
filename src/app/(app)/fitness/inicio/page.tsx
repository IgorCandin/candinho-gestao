import { redirect } from "next/navigation";
import { OperationEntryGatewayV4522 } from "@/components/operation-entry-gateway-v45-22";
import { getCurrentUserAccess } from "@/lib/data";
import { isMobileOperationEntry } from "@/lib/operation-entry-device";

export default async function FitnessEntryPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessFitness) redirect("/dashboard");

  if (await isMobileOperationEntry()) {
    redirect("/fitness");
  }

  return <OperationEntryGatewayV4522 operation="fitness" />;
}
