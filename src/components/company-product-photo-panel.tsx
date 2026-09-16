/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { Camera, Download, Images, RefreshCw, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CompanyPhotoSlot } from "@/lib/company-product-photos";

type Props = {
  module: "supplements" | "fitness";
  productId: string;
  productName: string;
  initialSlots: CompanyPhotoSlot[];
  canEdit: boolean;
};

export function CompanyProductPhotoPanel({ module, productId, productName, initialSlots, canEdit }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState(initialSlots);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = slots.find((slot) => slot.key === selectedKey) ?? null;
  const apiUrl = `/api/company/products/${productId}/photos?module=${module}`;

  async function refreshPhotos() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(apiUrl, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar as fotos.");
      setSlots(payload.slots);
      setNotice("Fotos atualizadas.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível atualizar as fotos.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    if (!selected || !canEdit) return;
    if (module === "fitness" && !selected.variantIds?.length) {
      setNotice("Cadastre uma variação de cor para poder enviar a foto.");
      return;
    }
    const form = new FormData();
    form.set("product_id", productId);
    form.set("file", file);
    if (module === "supplements") {
      form.set("module", module);
      form.set("slot", selected.key);
    } else {
      form.set("color", selected.color ?? "");
      form.set("variant_ids", JSON.stringify(selected.variantIds));
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(module === "supplements" ? "/api/marketing/product-images/upload" : "/api/marketing/fitness-variants/photo", { method: "POST", body: form });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) throw new Error(payload?.error ?? `Falha ao salvar foto (${response.status}).`);
      await refreshPhotos();
      setNotice("Foto salva. A ficha foi atualizada.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar a foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function downloadPhoto() {
    if (!selected?.url) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`${apiUrl}&download=${encodeURIComponent(selected.key)}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível baixar a foto.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      const contentType = response.headers.get("content-type") ?? "";
      const extension = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
      anchor.download = `${productName}-${selected.label}`.replace(/[^a-zA-Z0-9À-ÿ._-]+/g, "-") + `.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível baixar a foto.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button className="button ghost" type="button" onClick={() => { setOpen(true); setNotice(""); }}><Images size={16}/> Fotos</button>
    {open ? <div className="company-photo-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="company-photo-dialog" role="dialog" aria-modal="true" aria-label={`Fotos de ${productName}`} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
        <header><div><span>COMPANY · {module === "supplements" ? "SUPLEMENTOS" : "FITNESS"}</span><h2>Fotos de {productName}</h2><p>Veja, altere ou baixe sem sair da ficha do produto.</p></div><button type="button" className="company-photo-icon" aria-label="Fechar fotos" onClick={() => setOpen(false)}><X size={20}/></button></header>
        <div className="company-photo-toolbar"><button type="button" className="button ghost" disabled={busy} onClick={refreshPhotos}><RefreshCw size={16}/>Atualizar agora</button><small>{module === "fitness" ? "Uma foto por cor, compartilhada pelos tamanhos." : "Foto do produto, banner e nutrição."}</small></div>
        {selected ? <div className="company-photo-viewer">
          <button type="button" className="company-photo-back" onClick={() => setSelectedKey(null)}>← Todas as fotos</button>
          <div className="company-photo-stage">{selected.url ? <img src={selected.url} alt={`${selected.label} de ${productName}`}/> : <div className="company-photo-empty"><Camera size={36}/><span>Esta foto ainda não foi adicionada.</span></div>}</div>
          <div className="company-photo-viewer-footer"><div><strong>{selected.label}</strong>{selected.sizes?.length ? <small>Tamanhos: {selected.sizes.join(", ")}</small> : null}</div><div>{selected.url ? <button type="button" className="button ghost" disabled={busy} onClick={downloadPhoto}><Download size={16}/>Baixar</button> : null}{canEdit ? <button type="button" className="button company-blue" disabled={busy} onClick={() => input.current?.click()}><UploadCloud size={16}/>{selected.url ? "Alterar foto" : "Adicionar foto"}</button> : null}</div></div>
        </div> : <div className="company-photo-grid">{slots.map((slot) => <button className="company-photo-card" type="button" key={slot.key} onClick={() => setSelectedKey(slot.key)}><div>{slot.url ? <img src={slot.url} alt=""/> : <Camera size={30}/>}</div><strong>{slot.label}</strong><small>{slot.url ? "Abrir foto" : "Adicionar foto"}</small></button>)}</div>}
        {notice ? <p className="company-photo-notice" role="status">{notice}</p> : null}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }}/>
      </section>
    </div> : null}
  </>;
}
