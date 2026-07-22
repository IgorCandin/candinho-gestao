import type { ReactNode } from "react";
import { ProfitEvolutionPortal } from "@/components/profit-evolution-portal";

export default function PainelCsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ProfitEvolutionPortal />
    </>
  );
}
