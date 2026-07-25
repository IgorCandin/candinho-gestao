"use client";

import Link from "next/link";
import { Boxes, Calculator } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./stock-costs-subnav.module.css";

export function StockCostsSubnav({ operation }: { operation: "supplements" | "fitness" }) {
  const pathname = usePathname();
  const stockHref = operation === "fitness" ? "/fitness/estoque" : "/estoque";
  const costsHref = `${stockHref}/custos`;
  const onCosts = pathname.startsWith(costsHref);

  return (
    <nav className={styles.nav} aria-label="Áreas do estoque">
      <Link className={`${styles.link} ${!onCosts ? styles.active : ""}`} href={stockHref}>
        <Boxes size={15} /> Estoque de produtos
      </Link>
      <Link className={`${styles.link} ${onCosts ? styles.active : ""}`} href={costsHref}>
        <Calculator size={15} /> Custos e insumos
      </Link>
    </nav>
  );
}
