"use client";
import { useState } from "react";
import { bankCardBrand } from "@/lib/bank-card-brand";

/** Only verified, locally bundled bank assets; no client data sent to a logo service. */
export function BankPlannerLogo({ institution }: { institution: string }) {
  const [failed, setFailed] = useState(false);
  const src = bankCardBrand(institution).logo;
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- small local authentic bank mark
    return <span className="bank-planner-logo"><img src={src} width={64} height={64} alt={institution} draggable={false} onError={() => setFailed(true)}/></span>;
  }
  return <span className="bank-planner-logo bank-planner-logo-fallback" aria-hidden="true">{institution.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase()}</span>;
}
