"use client";

import { Download, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PhysiqueTrainingShareActions({ title }: { title: string }) {
  const [installHelp, setInstallHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    window.localStorage.setItem("candinho:app-start-url", currentUrl);
    document.cookie = `candinho_app_start_url=${encodeURIComponent(currentUrl)}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  async function share() {
    const payload = { title, text: `Abrir ficha de treino: ${title}`, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return <div className="physique-training-share-actions">
    <button type="button" className="physique-action-button secondary" onClick={() => void share()}><Share2 size={15}/>{copied ? "Link copiado" : "Compartilhar"}</button>
    <button type="button" className="physique-action-button secondary" onClick={() => setInstallHelp(true)}><Download size={15}/>Instalar atalho</button>
    {installHelp ? <div className="physique-install-help" role="dialog" aria-modal="true" aria-label="Instalar ficha no iPhone" onClick={() => setInstallHelp(false)}><article onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Fechar" onClick={() => setInstallHelp(false)}><X/></button><span>IPHONE · ATALHO DA FICHA</span><h2>Adicionar à Tela de Início</h2><ol><li>Abra esta ficha no Safari.</li><li>Toque no botão Compartilhar do iPhone.</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Confirme em “Adicionar”.</li></ol><p>Ao abrir o ícone, a Company volta para a última ficha de treino acessada.</p></article></div> : null}
  </div>;
}
