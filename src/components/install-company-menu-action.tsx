"use client";

import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallCompanyMenuAction() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
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
    setShowHelp(true);
  }

  return <><button type="button" onClick={() => void install()}>{installPrompt ? <Download size={15}/> : <Smartphone size={15}/>}{installPrompt ? "Instalar aplicativo" : "Instalar Company"}</button>{showHelp ? <div className="install-help-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}><section role="dialog" aria-modal="true" aria-label="Instalar Candinho Company"><button className="install-help-close" onClick={() => setShowHelp(false)} aria-label="Fechar"><X/></button><Smartphone/><h2>Instalar a Company</h2><p>O navegador não liberou a instalação automática nesta janela.</p><ol><li>Abra a Company no Chrome ou Edge em uma janela normal.</li><li>Clique no ícone de instalar que aparece ao lado do endereço.</li><li>No iPhone, abra no Safari e use Compartilhar → Adicionar à Tela de Início.</li></ol><small>Em janela anônima/privativa, a instalação de aplicativos fica bloqueada pelo navegador.</small></section></div> : null}</>;
}
