"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function OperationSwitcher({
  canAccessSupplements,
  canAccessFitness,
  canAccessBank,
}: {
  canAccessSupplements: boolean;
  canAccessFitness: boolean;
  canAccessBank: boolean;
}) {
  const router = useRouter();
  const [hoveredOperation, setHoveredOperation] = useState<"fitness" | null>(null);

  useEffect(() => {
    if (canAccessSupplements) router.prefetch("/suplementos");
    if (canAccessBank) router.prefetch("/bank");
  }, [canAccessSupplements, canAccessBank, router]);

  useEffect(() => {
    // A página atual monta a saudação no servidor.
    // Enquanto o perfil não possui um campo de gênero próprio, tratamos Giulia
    // como feminino e mantemos o padrão masculino para os demais usuários.
    const heading = document.querySelector(".operation-hub-copy h1");

    if (!heading) return;

    const currentText = heading.textContent ?? "";

    if (/\bGiulia\b/i.test(currentText)) {
      heading.textContent = currentText.replace(
        /Seja bem-vindo de volta,/i,
        "Seja bem-vinda de volta,",
      );
    } else {
      heading.textContent = currentText.replace(
        /Seja bem-vinda de volta,/i,
        "Seja bem-vindo de volta,",
      );
    }
  }, []);

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

  const visibleOperations = Number(canAccessSupplements) + Number(canAccessFitness) + Number(canAccessBank);
  const layoutClass = visibleOperations >= 3 ? "three" : visibleOperations === 2 ? "two" : "one";

  return (
    <>
      <form action="/auth/signout" method="post" className="hub-signout-form">
        <button className="hub-signout-button" type="submit" aria-label="Sair da conta">
          Sair da conta
        </button>
      </form>

      <div className={`operation-buttons ${layoutClass}`}>
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

        {canAccessBank && (
          <Link
            className="operation-button bank"
            href="/bank"
            prefetch
            aria-label="Acessar Candinho Bank"
          >
            <Image src="/operation-bank.png" alt="Bank" width={709} height={236} />
          </Link>
        )}
      </div>

      <style>{`
        .hub-signout-form {
          position: fixed;
          top: max(18px, env(safe-area-inset-top));
          left: 20px;
          z-index: 90;
          margin: 0;
        }

        .hub-signout-button {
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid rgba(154, 163, 178, 0.22);
          border-radius: 11px;
          background: rgba(15, 19, 27, 0.86);
          color: #c9ced7;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(14px);
          transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }

        .hub-signout-button:hover {
          border-color: rgba(154, 163, 178, 0.5);
          background: rgba(27, 32, 43, 0.96);
          color: #ffffff;
        }

        @media (min-width: 821px) and (max-height: 900px) {
          .hub-standalone .content-hub {
            min-height: 100dvh;
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .operation-hub {
            gap: clamp(12px, 2vh, 20px);
            padding-top: 10px;
            padding-bottom: 14px;
          }

          .operation-hub-logo {
            width: min(455px, 62vw);
            max-height: 145px;
          }

          .operation-hub-copy {
            gap: 4px;
          }

          .operation-hub-copy h1 {
            margin-top: 2px;
            font-size: clamp(30px, 4.1vw, 48px);
            line-height: 1.02;
          }

          .operation-hub-copy p {
            font-size: 13px;
          }

          .operation-buttons.three,
          .operation-buttons.two,
          .operation-buttons.one {
            gap: 14px;
          }

          .operation-button {
            min-height: 118px;
            padding: 17px 22px;
          }

          .operation-button img {
            max-height: 72px;
          }
        }

        @media (min-width: 821px) and (max-height: 760px) {
          .operation-hub-logo {
            width: min(395px, 56vw);
            max-height: 120px;
          }

          .operation-hub-copy h1 {
            font-size: clamp(27px, 3.7vw, 42px);
          }

          .operation-button {
            min-height: 102px;
          }

          .operation-button img {
            max-height: 62px;
          }
        }

        @media (max-width: 820px) {
          .hub-signout-form {
            top: max(12px, env(safe-area-inset-top));
            left: 12px;
          }

          .hub-signout-button {
            min-height: 36px;
            padding: 0 12px;
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
