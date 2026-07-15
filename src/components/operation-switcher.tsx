"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function OperationSwitcher({
  canAccessSupplements,
  canAccessFitness,
}: {
  canAccessSupplements: boolean;
  canAccessFitness: boolean;
}) {
  const router = useRouter();
  const [hoveredOperation, setHoveredOperation] = useState<"fitness" | "bank" | null>(null);

  useEffect(() => {
    if (canAccessSupplements) router.prefetch("/suplementos");
  }, [canAccessSupplements, router]);

  const comingSoonStyle = {
    position: "absolute" as const,
    right: 12,
    bottom: 10,
    padding: "4px 9px",
    borderRadius: 999,
    border: "1px solid rgba(160, 166, 178, 0.32)",
    background: "rgba(20, 24, 32, 0.92)",
    color: "#aeb4bf",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    pointerEvents: "none" as const,
  };

  return (
    <div className="operation-buttons three">
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
        <div
          className="operation-button fitness"
          aria-label="Candinho Fitness — em breve"
          style={{ position: "relative", cursor: "default" }}
          onMouseEnter={() => setHoveredOperation("fitness")}
          onMouseLeave={() => setHoveredOperation(null)}
        >
          <Image src="/operation-fitness.png" alt="Fitness" width={709} height={236} />
          {hoveredOperation === "fitness" && <span style={comingSoonStyle}>Em breve</span>}
        </div>
      )}

      <div
        className="operation-button bank"
        aria-label="Candinho Bank — em breve"
        style={{ position: "relative", cursor: "default" }}
        onMouseEnter={() => setHoveredOperation("bank")}
        onMouseLeave={() => setHoveredOperation(null)}
      >
        <Image src="/operation-bank.png" alt="Bank" width={709} height={236} />
        {hoveredOperation === "bank" && <span style={comingSoonStyle}>Em breve</span>}
      </div>
    </div>
  );
}
