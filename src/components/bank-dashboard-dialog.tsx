"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function BankDashboardDialog({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push("/bank", { scroll: false });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  return <div className="bank-dashboard-dialog-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) router.push("/bank", { scroll: false });
  }}>
    <section className="bank-dashboard-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bank-dashboard-dialog-top"><strong>{title}</strong><Link href="/bank" scroll={false} className="icon-link" aria-label="Fechar janela"><X size={18}/></Link></div>
      <div className="bank-dashboard-dialog-content">{children}</div>
    </section>
  </div>;
}
