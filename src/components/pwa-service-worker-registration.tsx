"use client";

import { useEffect } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    candinhoInstallPrompt?: InstallPromptEvent;
  }
}

export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    function captureInstallPrompt(event: Event) {
      event.preventDefault();
      window.candinhoInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new CustomEvent("candinho-install-ready"));
    }
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);
  return null;
}
