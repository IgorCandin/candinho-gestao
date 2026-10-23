"use client";

import Link from "next/link";

export default function DiscoveryError({ reset }: { reset: () => void }) {
  return <main style={{ minHeight: "80vh", display: "grid", placeContent: "center", gap: 20, padding: 32 }}><h1>Não conseguimos carregar a seleção</h1><p>Tente novamente para consultar os produtos e preços atualizados.</p><button className="button" onClick={reset}>Tentar novamente</button><Link href="/minha-conta">Acessar minha conta</Link></main>;
}
