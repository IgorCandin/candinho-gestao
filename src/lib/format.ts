export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

/** Formata datas de banco do tipo YYYY-MM-DD sem aplicar conversão UTC. */
export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateOnly(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatMonthYear(value: string | null | undefined) {
  if (!value) return "Sem mês";
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return "Sem mês";
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${months[Number(match[2]) - 1]} de ${match[1]}`;
}
