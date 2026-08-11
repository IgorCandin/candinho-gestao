"use client";

import Link from "next/link";
import { FileBadge2, Presentation } from "lucide-react";
import { usePathname } from "next/navigation";

export function CentralKnowledgeNav({
  canManageUsers,
}: {
  canManageUsers: boolean;
}) {
  const pathname = usePathname();

  if (
    !pathname.startsWith("/central") ||
    pathname === "/central/inicio"
  ) {
    return null;
  }

  return (
    <nav
      className="central-knowledge-nav"
      aria-label="Conhecimento e documentos da Central"
    >
      <Link
        href="/central/apresentacao"
        className={
          pathname.startsWith("/central/apresentacao")
            ? "active"
            : ""
        }
      >
        <Presentation size={15} />
        Apresentação
      </Link>

      {canManageUsers && (
        <Link
          href="/central/documentos"
          className={
            pathname.startsWith("/central/documentos")
              ? "active"
              : ""
          }
        >
          <FileBadge2 size={15} />
          Documentos oficiais
        </Link>
      )}
    </nav>
  );
}
