import { companyDestination } from "@/lib/company-destination";

export function routinePath(href: string | null | undefined) {
  return (href ?? "").split("?")[0].split("#")[0];
}

export function routineHref(pathname: string, href: string) {
  if (pathname !== "/company" && !pathname.startsWith("/company/")) return href;
  const path = routinePath(href);
  // Only migrated surfaces with preserved step identity, not lead→sale or list regrouping.
  if (!/^\/(?:suplementos\/)?(?:clientes|produtos|vendas|pos-venda|pedidos-fornecedor)\/[0-9a-f-]{36}$/i.test(path)
    && !/^\/fitness\/(?:clientes|produtos|vendas|pos-venda)\/[0-9a-f-]{36}$/i.test(path)
    && !["/nexus/fila", "/nexus/rotinas", "/suplementos/fila-comercial"].includes(path)) return href;
  return companyDestination(href);
}

export function routineArrivalHref(expectedHref: string, observedHref: string) {
  const expected = routinePath(expectedHref);
  const observed = routinePath(observedHref);
  if (!expected || !observed) return null;
  if (observed === expected) return observedHref;
  return observed.startsWith("/company/") && routinePath(routineHref(observed, expectedHref)) === observed
    ? expectedHref : null;
}
