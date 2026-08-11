import { redirect } from "next/navigation";
import { OperationEntryGatewayV4522 } from "@/components/operation-entry-gateway-v45-22";
import { getCurrentUserAccess } from "@/lib/data";
import { isMobileOperationEntry } from "@/lib/operation-entry-device";

export default async function BankEntryPage() {
  const access = await getCurrentUserAccess();
  if (!access.canAccessBank) redirect("/dashboard");

  if (await isMobileOperationEntry()) {
    redirect("/bank");
  }

  return <OperationEntryGatewayV4522 operation="bank" />;
}
