"use client";

import { useEffect, useRef } from "react";

let scrollLocks = 0;
let originalOverflow = "";

/** Focus close controls rather than inputs, avoiding an unsolicited mobile keyboard. */
export function useModalFocus(open: boolean, onClose: () => void) {
  const modal = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const root = modal.current;
    if (!open || !root) return;
    const previous = document.activeElement as HTMLElement | null;
    if (scrollLocks++ === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('button,a[href],input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])'))
      .filter(element => !element.matches(":disabled") && element.getClientRects().length > 0);
    (controls()[0] ?? root).focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      // A nested modal owns its own focus and Escape key.
      const activeModal = active?.closest('[role="dialog"][aria-modal="true"]');
      if (activeModal && activeModal !== root) return;
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); close.current();
      } else if (event.key === "Tab") {
        const elements = controls();
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); root.focus(); }
        else if (!root.contains(active) || (event.shiftKey ? active === first : active === last)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (--scrollLocks === 0) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return modal;
}
