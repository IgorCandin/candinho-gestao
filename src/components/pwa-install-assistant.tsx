"use client";

import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallAssistant({ appName, targetPath }: { appName: string; targetPath: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia("(display-mode: standalone)");
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    () => false,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function capture(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }
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
    const url = new URL(targetPath, window.location.origin).href;
    if (navigator.share && !standalone) {
      await navigator.share({ title: appName, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return <div className="pwa-install-actions">
    <button className="physique-action-button secondary" type="button" onClick={() => void install()}>
      {copied ? <Check size={16}/> : installPrompt ? <Download size={16}/> : standalone ? <Copy size={16}/> : <Share2 size={16}/>}
      {copied ? "Link copiado" : installPrompt ? `Instalar ${appName}` : standalone ? "Copiar link para o Safari" : "Abrir opções de instalação"}
    </button>
    <a className="physique-action-button" href={targetPath} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Abrir destino</a>
    <p>{standalone ? "Você está dentro de um aplicativo instalado. Copie o link, abra o Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”." : "No iPhone, use o Safari. Depois toque em Compartilhar e em “Adicionar à Tela de Início”."}</p>
  </div>;
}
