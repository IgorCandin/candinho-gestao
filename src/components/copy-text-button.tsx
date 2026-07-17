"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyTextButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <button className="button ghost compact-button integration-copy-button" type="button" onClick={copy}>
    {copied ? <Check size={14}/> : <Copy size={14}/>}
    {copied ? "Copiado" : label}
  </button>;
}
