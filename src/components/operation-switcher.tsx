"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OperationSwitcher({
  canAccessSupplements,
  canAccessFitness,
}: {
  canAccessSupplements: boolean;
  canAccessFitness: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (canAccessSupplements) router.prefetch("/suplementos");
    if (canAccessFitness) router.prefetch("/fitness");
  }, [canAccessFitness, canAccessSupplements, router]);

  return (
    <div className="operation-buttons three">
      {canAccessSupplements && (
        <Link className="operation-button supplements" href="/suplementos" prefetch aria-label="Acessar Candinho Suplementos">
          <Image src="/operation-suplementos.png" alt="Suplementos" width={709} height={236} />
        </Link>
      )}
      {canAccessFitness && (
        <Link className="operation-button fitness" href="/fitness" prefetch aria-label="Acessar Candinho Fitness">
          <Image src="/operation-fitness.png" alt="Fitness" width={709} height={236} />
        </Link>
      )}
      <div className="operation-button bank coming-soon" aria-label="Candinho Bank — em breve">
        <Image src="/operation-bank.png" alt="Bank" width={709} height={236} />
        <span className="operation-coming-soon">Em breve</span>
      </div>
    </div>
  );
}
