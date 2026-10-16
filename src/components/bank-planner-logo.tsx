"use client";
import { useState } from "react";

/** Only verified, locally bundled bank assets; no client data sent to a logo service. */
export function BankPlannerLogo({ institution }: { institution: string }) {
  const [failed, setFailed] = useState(false);
  const src = institution.toLowerCase().includes("sicoob") ? "/bank-sicoob.png" : null;
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- small local authentic bank mark
    return <img src={src} width={100} height={32} alt="Sicoob" style={{ objectFit: "contain", background: "white", borderRadius: 6, padding: 4 }} onError={() => setFailed(true)}/>;
  }
  return <span className="bank-planner-initials" aria-hidden="true">{institution.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase()}</span>;
}
