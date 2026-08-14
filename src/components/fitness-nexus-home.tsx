import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  fitnessSignalCopy,
  type FitnessNexusSnapshot,
} from "@/lib/fitness-nexus-data";
import styles from "./fitness-nexus.module.css";

export function FitnessNexusHome({
  snapshot,
}: {
  snapshot: FitnessNexusSnapshot;
}) {
  const priorities = snapshot.products
    .filter((product) => product.signal_type !== "watch")
    .slice(0, 3);

  return (
    <section className={styles.home}>
      <div className={styles.homeHead}>
        <div>
          <span className={styles.eyebrow}>
            <Sparkles size={14} />
            Nexus Fitness
          </span>
          <h2>O que vale olhar hoje</h2>
          <p>
            Uma leitura simples de estoque, giro e comportamento de compra. O histórico ajuda a escolher o próximo mix, mas não manda repetir o mesmo modelo.
          </p>
        </div>

        <Link className="button ghost" href="/fitness/nexus">
          Abrir Nexus Fitness
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className={styles.signalGrid}>
        {priorities.length > 0 ? (
          priorities.map((product) => {
            const signal = fitnessSignalCopy(product);

            return (
              <article className={styles.signal} key={product.product_id}>
                <span>{signal.label}</span>
                <strong>{product.name}</strong>
                <small>{signal.body}</small>
              </article>
            );
          })
        ) : (
          <article className={styles.signal}>
            <span>Operação tranquila</span>
            <strong>Nenhuma prioridade forte agora</strong>
            <small>
              O Nexus continua acompanhando estoque, giro e sinais do mix.
            </small>
          </article>
        )}
      </div>
    </section>
  );
}
