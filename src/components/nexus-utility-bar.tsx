"use client";

import Link from "next/link";
import { Bug, ChevronDown, Gauge, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NexusUtilityBar({
  enabled = true,
}: {
  enabled?: boolean;
  canUseNexus?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;
  if (pathname.startsWith("/portal-parceiro")) return null;

  return (
    <div className={`nexus-utility ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="nexus-utility-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Abrir ferramentas"
      >
        <Gauge size={16} />
        <span>Ferramentas</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="nexus-utility-backdrop"
            aria-label="Fechar ferramentas"
            onClick={() => setOpen(false)}
          />
          <div className="nexus-utility-menu">
            <Link href="/central/meu-dia" onClick={() => setOpen(false)}>
              <Gauge size={16} />
              <span>
                <strong>Meu Dia</strong>
                <small>Nexus, comando, rotinas e prioridades em um só lugar.</small>
              </span>
            </Link>

            <Link href="/central/qualidade" onClick={() => setOpen(false)}>
              <ShieldCheck size={16} />
              <span>
                <strong>Qualidade</strong>
                <small>Saúde, consistência e pontos de atenção do ERP.</small>
              </span>
            </Link>

            <Link
              className="danger"
              href="/central/problemas/novo"
              onClick={() => setOpen(false)}
            >
              <Bug size={16} />
              <span>
                <strong>Relatar problema</strong>
                <small>Registre algo estranho para revisar depois.</small>
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
