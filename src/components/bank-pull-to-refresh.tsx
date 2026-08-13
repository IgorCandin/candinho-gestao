"use client";

import { RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

const TRIGGER_DISTANCE = 72;
const MAX_DISTANCE = 110;
const DIRECTION_LOCK_DISTANCE = 10;

type GestureMode =
  | "pending"
  | "pull"
  | "cancelled";

function scrollTop() {
  return (
    document.scrollingElement?.scrollTop ??
    window.scrollY ??
    0
  );
}

function shouldIgnoreTouch(
  target: EventTarget | null,
) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], .mobile-menu-panel',
    ),
  );
}

export function BankPullToRefresh({
  enabled,
}: {
  enabled: boolean;
}) {
  const pathname = usePathname();

  // A atualização por gesto é útil no ERP, mas não deve instalar um
  // listener touchmove não-passivo na Vitrine pública.
  const active =
    enabled &&
    !(
      pathname === "/catalogo" ||
      pathname.startsWith("/catalogo/")
    );

  const startRef =
    useRef<{
      x: number;
      y: number;
    } | null>(null);

  const modeRef =
    useRef<GestureMode>("pending");
  const distanceRef =
    useRef(0);
  const refreshingRef =
    useRef(false);

  const [distance, setDistance] =
    useState(0);
  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    if (!active) return;

    const narrowScreen =
      window.matchMedia(
        "(max-width: 900px)",
      ).matches;

    const touchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;

    if (
      !narrowScreen ||
      !touchCapable
    ) {
      return;
    }

    function setPullDistance(
      value: number,
    ) {
      const next = Math.max(
        0,
        Math.min(
          MAX_DISTANCE,
          value,
        ),
      );

      distanceRef.current = next;
      setDistance(next);
    }

    function resetGesture() {
      startRef.current = null;
      modeRef.current = "pending";
    }

    function cancelGesture() {
      startRef.current = null;
      modeRef.current = "cancelled";
      setPullDistance(0);
    }

    function handleTouchStart(
      event: TouchEvent,
    ) {
      if (
        refreshingRef.current ||
        scrollTop() > 1 ||
        document.querySelector(
          ".mobile-menu[open]",
        ) ||
        shouldIgnoreTouch(
          event.target,
        )
      ) {
        return;
      }

      const touch =
        event.touches[0];

      if (!touch) return;

      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };

      modeRef.current =
        "pending";
    }

    function handleTouchMove(
      event: TouchEvent,
    ) {
      const start =
        startRef.current;
      const touch =
        event.touches[0];

      if (
        !start ||
        !touch ||
        modeRef.current ===
          "cancelled"
      ) {
        return;
      }

      if (scrollTop() > 1) {
        cancelGesture();
        return;
      }

      const deltaX =
        touch.clientX - start.x;
      const deltaY =
        touch.clientY - start.y;

      const horizontal =
        Math.abs(deltaX);
      const vertical =
        Math.abs(deltaY);

      if (
        modeRef.current ===
        "pending"
      ) {
        if (
          horizontal >=
            DIRECTION_LOCK_DISTANCE &&
          horizontal > vertical
        ) {
          cancelGesture();
          return;
        }

        if (deltaY < 0) {
          cancelGesture();
          return;
        }

        if (
          deltaY >=
            DIRECTION_LOCK_DISTANCE &&
          deltaY >
            horizontal * 1.15
        ) {
          modeRef.current =
            "pull";
        } else {
          return;
        }
      }

      if (
        modeRef.current !==
          "pull" ||
        deltaY <= 0
      ) {
        return;
      }

      event.preventDefault();

      setPullDistance(
        deltaY * 0.55,
      );
    }

    function handleTouchEnd() {
      if (
        modeRef.current !==
        "pull"
      ) {
        resetGesture();
        return;
      }

      const shouldRefresh =
        distanceRef.current >=
        TRIGGER_DISTANCE;

      resetGesture();

      if (!shouldRefresh) {
        setPullDistance(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);

      setPullDistance(
        TRIGGER_DISTANCE,
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    }

    function handleTouchCancel() {
      resetGesture();
      setPullDistance(0);
    }

    window.addEventListener(
      "touchstart",
      handleTouchStart,
      { passive: true },
    );

    window.addEventListener(
      "touchmove",
      handleTouchMove,
      { passive: false },
    );

    window.addEventListener(
      "touchend",
      handleTouchEnd,
      { passive: true },
    );

    window.addEventListener(
      "touchcancel",
      handleTouchCancel,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        "touchstart",
        handleTouchStart,
      );

      window.removeEventListener(
        "touchmove",
        handleTouchMove,
      );

      window.removeEventListener(
        "touchend",
        handleTouchEnd,
      );

      window.removeEventListener(
        "touchcancel",
        handleTouchCancel,
      );
    };
  }, [active]);

  if (
    !active ||
    (!refreshing &&
      distance < 4)
  ) {
    return null;
  }

  const progress =
    Math.min(
      distance /
        TRIGGER_DISTANCE,
      1,
    );

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 120,
        top:
          "max(70px, calc(env(safe-area-inset-top) + 54px))",
        left: "50%",
        transform:
          `translate(-50%, ${Math.max(
            0,
            distance - 56,
          )}px)`,
        pointerEvents: "none",
        opacity:
          refreshing
            ? 1
            : Math.max(
                0.2,
                progress,
              ),
        transition:
          refreshing
            ? "transform .18s ease"
            : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          border:
            "1px solid var(--line)",
          background:
            "var(--panel)",
          boxShadow:
            "0 10px 30px rgba(0,0,0,.28)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <RefreshCcw
          size={15}
          style={{
            transform:
              `rotate(${
                refreshing
                  ? 180
                  : progress * 180
              }deg)`,
            transition:
              refreshing
                ? "transform .4s linear"
                : undefined,
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
