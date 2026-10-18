"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useModalFocus } from "@/components/use-modal-focus";
import { X } from "lucide-react";

export function BankDashboardDialog({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  const modal = useModalFocus(true, () => router.push("/bank", { scroll: false }));

  return <div className="bank-dashboard-dialog-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) router.push("/bank", { scroll: false });
  }}>
    <section ref={modal} tabIndex={-1} className="bank-dashboard-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bank-dashboard-dialog-top"><strong>{title}</strong><Link href="/bank" scroll={false} className="icon-link" aria-label="Fechar janela"><X size={18}/></Link></div>
      <div className="bank-dashboard-dialog-content">{children}</div>
    </section>
  </div>;
}
