"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function PhysiqueTrainingAttachmentUpload({ planId }: { planId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload() {
    if (!file || loading) return;
    if (file.size === 0) {
      setMessage("O arquivo selecionado está vazio.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const path = `plans/${planId}/${Date.now()}-${safeFileName(file.name)}`;

    try {
      const result = await supabase.storage
        .from("physique-training-files")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (result.error) throw result.error;

      const insert = await supabase.from("physique_training_attachments").insert({
        plan_id: planId,
        file_name: file.name,
        file_url: path,
        mime_type: file.type || null,
        file_size_bytes: file.size,
      });

      if (insert.error) {
        await supabase.storage.from("physique-training-files").remove([path]);
        throw insert.error;
      }

      setFile(null);
      setInputKey((value) => value + 1);
      setMessage("Arquivo anexado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="physique-inline-upload">
      <input key={inputKey} className="input" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button className="physique-action-button" type="button" onClick={upload} disabled={!file || loading}>
        {loading ? <LoaderCircle className="spin" size={15} /> : <FileUp size={15} />}
        {loading ? "Anexando" : "Anexar arquivo"}
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
