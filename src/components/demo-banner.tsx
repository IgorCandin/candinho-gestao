import { isSupabaseConfigured } from "@/lib/config";

export function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return <div className="demo-banner"><strong>Modo demonstração:</strong> a interface já funciona com dados de exemplo. Depois de criar o Supabase e colar as duas chaves no arquivo <code>.env.local</code>, estas telas passam a ler o banco real.</div>;
}
