/** Phone fragments require four digits; ordinary text search remains with the caller. */
export function phoneMatchesQuery(query: string, phone?: string | null): boolean {
  const value = query.trim();
  if (!phone || !/^[\d\s()+.\-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 && phone.replace(/\D/g, "").includes(digits);
}
