"use client";

import { ImagePlus, LoaderCircle, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CentralContact } from "@/lib/central-data";
import { createClient } from "@/lib/supabase/client";

function safeFilename(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export function CentralMediaUploader({ scopes, contacts }: { scopes: string[]; contacts: CentralContact[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState(scopes[0] ?? "company");
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableContacts = contacts.filter((contact) => contact.operation_scope === "company" || contact.operation_scope === scope || scope === "company");

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) { setMessage("Escolha um arquivo primeiro."); return; }
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessão expirada.");
      const path = `${scope}/${userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const uploadResult = await supabase.storage.from("central-media").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadResult.error) throw uploadResult.error;

      const assetResult = await supabase.from("central_media_assets").insert({
        operation_scope: scope,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type || null,
        source: "upload",
        search_text: file.name,
        contact_id: contactId || null,
      }).select("id").single();
      if (assetResult.error) {
        await supabase.storage.from("central-media").remove([path]);
        throw assetResult.error;
      }

      const canClassify = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      if (canClassify) {
        const classification = await supabase.functions.invoke("central-media-classify", { body: { asset_id: assetResult.data.id } });
        if (classification.error) setMessage("Arquivo enviado. A classificação por IA ficará pendente até a chave da OpenAI estar configurada.");
        else setMessage("Arquivo enviado e classificado pelo Nexus.");
      } else {
        setMessage(file.type.includes("heic") || file.type.includes("heif") ? "Arquivo HEIC/HEIF armazenado. A análise visual requer conversão para JPEG, PNG ou WebP." : "Arquivo enviado para a biblioteca.");
      }
      if (inputRef.current) inputRef.current.value = "";
      setContactId("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally { setLoading(false); }
  }

  return <div className="central-media-uploader">
    <div className="central-media-uploader-head"><ImagePlus size={20}/><span><strong>Adicionar à biblioteca</strong><small>Fotos, vídeos e PDFs ficam privados e podem ser ligados a um cliente.</small></span></div>
    <div className="central-media-uploader-fields central-media-uploader-fields-v2">
      <select className="select" value={scope} onChange={(event) => { setScope(event.target.value); setContactId(""); }}>{scopes.map((item) => <option value={item} key={item}>{item === "company" ? "Candinho Company" : item === "supplements" ? "Suplementos" : "Fitness"}</option>)}</select>
      <select className="select" value={contactId} onChange={(event) => setContactId(event.target.value)}><option value="">Sem vínculo com contato</option>{availableContacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.display_name}</option>)}</select>
      <input ref={inputRef} className="input central-file-input" type="file" accept="image/*,video/*,application/pdf" />
      <button className="button gold" type="button" onClick={upload} disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <UploadCloud size={16}/>}Enviar</button>
    </div>
    <div className="central-media-ai-note"><Sparkles size={14}/><span>JPEG, PNG e WebP podem receber descrição e tags automáticas quando a OpenAI estiver configurada.</span></div>
    {message && <p className="central-media-upload-message">{message}</p>}
  </div>;
}
