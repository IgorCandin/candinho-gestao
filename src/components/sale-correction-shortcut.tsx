import Link from "next/link";
import { FilePenLine, PackagePlus } from "lucide-react";
import styles from "./sale-correction.module.css";

export function SaleCorrectionShortcut({
  saleId,
  generalStatus,
  paymentStatus,
  deliveryStatus,
}: {
  saleId: string;
  generalStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
}) {
  if (generalStatus === "cancelled") return null;

  const paid = paymentStatus === "received";

  return (
    <article className={styles.shortcut}>
      <div className={styles.shortcutIcon}>
        <PackagePlus size={20} />
      </div>

      <div className={styles.shortcutCopy}>
        <strong>Esqueceu algum produto nesta venda?</strong>
        <span>
          {paid
            ? "A venda já está marcada como recebida. A tela de correção mostrará a proteção financeira antes de permitir qualquer alteração."
            : deliveryStatus === "delivered"
              ? "Você pode incluir o item esquecido. Como a entrega já foi registrada, o estoque do novo item será baixado na mesma correção."
              : "Você pode incluir o item esquecido. O novo produto será reservado para esta venda antes da entrega."}
        </span>
      </div>

      <Link
        className={`button ${paid ? "ghost" : "gold"} ${styles.shortcutButton}`}
        href={`/vendas/${saleId}/corrigir`}
      >
        <FilePenLine size={16} />
        Corrigir venda
      </Link>
    </article>
  );
}
