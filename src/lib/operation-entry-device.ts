import { headers } from "next/headers";

export async function isMobileOperationEntry() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";

  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
    userAgent,
  );
}
