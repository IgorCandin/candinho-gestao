import { redirect } from "next/navigation";
import { OperationEntryGatewayV4522 } from "@/components/operation-entry-gateway-v45-22";
import { getCurrentUserAccess } from "@/lib/data";

export default async function PhysiqueEntryPage() {
  const access = await getCurrentUserAccess();

  if (!access.active) {
    redirect("/dashboard");
  }

  return <OperationEntryGatewayV4522 operation="physique" />;
}
