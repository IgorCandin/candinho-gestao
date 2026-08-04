"use client";

import { RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TRIGGER_DISTANCE = 72;
const MAX_DISTANCE = 110;

export function BankPullToRefresh({
  enabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();
  const startYRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const mobile = window.matchMedia(
      "(max-width: 900px) and (pointer: coarse)",
    ).matches;

    if (!mobile) return;

    function setPullDistance(value: number) {
      const next = Math.max(0, Math.min(MAX_DISTANCE, value));
      distanceRef.current = next;
      setDistance(next);
    }

    function handleTouchStart(event: TouchEvent) {
      if (refreshing || window.scrollY > 0) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      if (startYRef.current === null) return;

      if (window.scrollY > 0) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }

      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      const rawDistance = currentY - startYRef.current;
      if (rawDistance <= 0) {
        setPullDistance(0);
        return;
      }

      // Resistência de 55% deixa o gesto natural e evita disparos acidentais.
      setPullDistance(rawDistance * 0.55);
    }

    function handleTouchEnd() {
      if (startYRef.current === null) return;

      const shouldRefresh = distanceRef.current >= TRIGGER_DISTANCE;
      startYRef.current = null;

      if (!shouldRefresh) {
        setPullDistance(0);
        return;
      }

      setRefreshing(true);
      setPullDistance(TRIGGER_DISTANCE);
      router.refresh();

      window.setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 700);
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled, refreshing, router]);

  if (!enabled || (!refreshing && distance < 4)) return null;

  const progress = Math.min(distance / TRIGGER_DISTANCE, 1);

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 90,
        top: 58,
        left: "50%",
        transform: `translate(-50%, ${Math.max(0, distance - 56)}px)`,
        pointerEvents: "none",
        opacity: refreshing ? 1 : Math.max(0.2, progress),
        transition: refreshing ? "transform .18s ease" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          boxShadow: "0 10px 30px rgba(0,0,0,.18)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <RefreshCcw
          size={15}
          style={{
            transform: `rotate(${refreshing ? 180 : progress * 180}deg)`,
            transition: refreshing ? "transform .4s linear" : undefined,
          }}
        />
        <span>
          {refreshing
            ? "Atualizando..."
            : progress >= 1
              ? "Solte para atualizar"
              : "Puxe para atualizar"}
        </span>
      </div>
    </div>
  );
}
