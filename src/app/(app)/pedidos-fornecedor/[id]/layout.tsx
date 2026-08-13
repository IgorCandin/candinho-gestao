
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isUuidRouteParam } from "@/lib/route-param-guards";

export default async function SupplierOrderIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuidRouteParam(id)) {
    notFound();
  }

  return children;
}
