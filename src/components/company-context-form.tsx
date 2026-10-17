"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { companyDestination } from "@/lib/company-destination";

/** The flag controls only the return URL; actions still perform their existing authorization. */
export default function CompanyContextForm({children,action,...props}: ComponentProps<"form">) {
  const company = usePathname().startsWith("/company/");
  const destination = company && typeof action === "string" ? companyDestination(action) : action;
  return <form {...props} action={destination}>{company && typeof action === "function" ? <input type="hidden" name="company_context" value="1"/> : null}{children}</form>;
}
