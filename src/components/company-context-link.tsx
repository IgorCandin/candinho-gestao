"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { companyDestination } from "@/lib/company-destination";

/** Preserve the current operational context, without rewriting unknown destinations. */
export default function CompanyContextLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const href = pathname.startsWith("/company/") && typeof props.href === "string" ? companyDestination(props.href) : props.href;
  return <Link {...props} href={href}/>;
}
