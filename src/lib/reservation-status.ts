export const RESERVATION_STATUS_LABELS = {
  reserved: "Reservado",
  partial: "Parcial",
  awaiting_stock: "Aguardando estoque",
  fulfilled: "Reserva atendida",
} as const;

export type ReservationStatus = keyof typeof RESERVATION_STATUS_LABELS;
export type ReservationStatusContext = "inventory" | "commercial";

const COMMERCIAL_RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  ...RESERVATION_STATUS_LABELS,
  fulfilled: "Entregue",
};

export function getReservationStatusLabel(
  status: string,
  context: ReservationStatusContext = "inventory",
) {
  const labels =
    context === "commercial"
      ? COMMERCIAL_RESERVATION_STATUS_LABELS
      : RESERVATION_STATUS_LABELS;

  return labels[status as ReservationStatus] ?? status.replaceAll("_", " ");
}

export function isReservationStatus(status: string): status is ReservationStatus {
  return status in RESERVATION_STATUS_LABELS;
}
