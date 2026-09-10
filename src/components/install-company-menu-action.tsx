"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallCompanyMenuAction() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    function capture(event: Event) { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); }
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    const url = new URL("/company/inicio", window.location.origin).href;
    if (navigator.share) {
      await navigator.share({ title: "Candinho Company", text: "Instalar Candinho Company", url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    window.alert("Link copiado. Abra no navegador e escolha Instalar aplicativo.");
  }

  return <button type="button" onClick={() => void install()}>{installPrompt ? <Download size={15}/> : <Smartphone size={15}/>}{installPrompt ? "Instalar aplicativo" : "Instalar Company"}</button>;
}
