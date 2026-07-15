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
    <div className={`operation-buttons ${canAccessSupplements && canAccessFitness ? "two" : "one"}`}>
      {canAccessSupplements && (
        <Link
          className="operation-button supplements"
          href="/suplementos"
          prefetch
          aria-label="Acessar Candinho Suplementos"
        >
          <Image src="/operation-suplementos.png" alt="Suplementos" width={709} height={236} />
        </Link>
      )}
      {canAccessFitness && (
        <Link
          className="operation-button fitness"
          href="/fitness"
          prefetch
          aria-label="Acessar Candinho Fitness"
        >
          <Image src="/operation-fitness.png" alt="Fitness" width={709} height={236} />
        </Link>
      )}
    </div>
  );
}
