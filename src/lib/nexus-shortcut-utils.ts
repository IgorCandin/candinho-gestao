import type { NexusPersonalShortcut } from "@/lib/nexus-personal-types";

export function nexusOperationForHref(
  href: string,
): NexusPersonalShortcut["operation_scope"] {
  const value = href || "/";

  if (value.startsWith("/fitness")) return "fitness";
  if (value.startsWith("/bank")) return "bank";
  if (value.startsWith("/marketing")) return "marketing";
  if (value.startsWith("/central")) return "central";
  if (value.startsWith("/physique")) return "physique";
  if (value === "/dashboard" || value.startsWith("/nexus")) return "company";

  return "supplements";
}

export function operationLabel(scope: string) {
  if (scope === "fitness") return "Fitness";
  if (scope === "bank") return "Bank";
  if (scope === "marketing") return "Marketing";
  if (scope === "central") return "Central";
  if (scope === "physique") return "Physique";
  if (scope === "company") return "Company";
  return "Suplementos";
}

export function personalShortcutSourceLabel(source: string) {
  if (source === "workflow") return "Fluxo aprendido";
  if (source === "learned") return "Aprendido";
  if (source === "command") return "Comando";
  return "Fixado";
}
