export type StorefrontSearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function discoveryUrl(params: StorefrontSearchParams = {}, operation?: "fitness" | "supplements") {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  if (operation) query.set("operacao", operation);
  return `/catalogo/descobrir${query.size ? `?${query}` : ""}`;
}

export function discoveryFilters(params: StorefrontSearchParams): { initialOperation: "fitness" | "supplements"; initialQuery: string } {
  const operation = first(params.operacao ?? params.operation)?.toLowerCase();
  return { initialOperation: operation === "fitness" ? "fitness" : "supplements", initialQuery: first(params.busca ?? params.q ?? params.search) ?? "" };
}
