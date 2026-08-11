import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupplementsEntryGatewayV4521 } from "@/components/supplements-entry-gateway-v45-21";

function isMobileUserAgent(value: string) {
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
    value,
  );
}

export default async function SupplementsEntryPage() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";

  if (isMobileUserAgent(userAgent)) {
    redirect("/suplementos/hoje");
  }

  return <SupplementsEntryGatewayV4521 />;
}
