import { redirect } from "next/navigation";
import { OperationEntryGatewayV4522 } from "@/components/operation-entry-gateway-v45-22";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralEntryPage() {
  const access = await getCurrentUserAccess();
  const allowed =
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing;

  if (!allowed) redirect("/dashboard");
return <OperationEntryGatewayV4522 operation="central" />;
}
