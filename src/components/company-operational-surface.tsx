"use client";
import { usePathname } from "next/navigation";
import "./company-operational-surface.css";

export function CompanyOperationalSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fitness = ["/company/fitness", "/company/estoque/fitness", "/company/produtos/fitness", "/company/clientes/fitness", "/company/compras/novo/fitness", "/company/compras/fitness", "/company/vendas/nova/fitness", "/company/concluir/fitness"].some(prefix => pathname.startsWith(prefix));
  return fitness ? <div className="company-fitness-surface">{children}</div> : children;
}
