"use client";
import { useState, type CSSProperties } from "react";
import { bankCardBrand } from "@/lib/bank-card-brand";

/** Only verified, locally bundled bank assets; no client data sent to a logo service. */
export function BankPlannerLogo({ institution }: { institution: string }) {
  const [failed, setFailed] = useState(false);
  const src = bankCardBrand(institution).logo;
  // Optical framing, not stretching: supplied files have very different inner margins.
  const name = institution.toLocaleLowerCase("pt-BR");
  const framing = name.includes("nubank")
    ? { "--logo-scale": "2", "--logo-y": "0px", "--logo-bg": "#8a05be" }
    : name.includes("shopee")
      ? { "--logo-scale": "1.4", "--logo-y": "0px", "--logo-bg": "#f44e2b" }
    : name.includes("sicoob")
      ? { "--logo-scale": "1.4", "--logo-y": "0px", "--logo-bg": "#07373d" }
      : name.includes("brasil")
        ? { "--logo-scale": "1.02", "--logo-y": "0px", "--logo-bg": "#ffef38" }
        : { "--logo-scale": "1", "--logo-y": "0px", "--logo-bg": "transparent" };
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- small local authentic bank mark
    return <span className="bank-planner-logo" style={framing as CSSProperties}><img src={src} width={64} height={64} alt={institution} draggable={false} onError={() => setFailed(true)}/></span>;
  }
  return <span className="bank-planner-logo bank-planner-logo-fallback" aria-hidden="true">{institution.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase()}</span>;
}
