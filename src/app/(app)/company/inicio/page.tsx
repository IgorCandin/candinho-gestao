import { redirect } from "next/navigation";
import { OperationEntryGatewayV4522 } from "@/components/operation-entry-gateway-v45-22";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyEntryPage() {
  const access = await getCurrentUserAccess();

  if (!access.active || access.role === "partner") {
    redirect("/dashboard");
  }

  return <OperationEntryGatewayV4522 operation="company" />;
}
