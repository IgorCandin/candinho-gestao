import { createClient } from "./supabase/server";

export type PartnerLegacyMovement = {
  id: string;
  occurredAt: string;
  movementType: string;
  quantity: number;
  product: string;
  originCode: string | null;
  destinationCode: string | null;
  notes: string | null;
};

export async function getPartnerLegacyHistory(
  partnerId: string,
): Promise<PartnerLegacyMovement[]> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "partner_legacy_history_snapshot",
    {
      p_partner_id:
        partnerId,
    },
  );

  if (error) {
    console.error(
      "partner legacy history",
      {
        partnerId,
        message:
          error.message,
      },
    );

    return [];
  }

  return (data ?? []).map(
    (row) => ({
      id: String(
        row.id ?? "",
      ),
      occurredAt: String(
        row.occurred_at ?? "",
      ),
      movementType: String(
        row.movement_type ??
          "Movimentação",
      ),
      quantity: Number(
        row.quantity ?? 0,
      ),
      product: String(
        row.product ??
          "Produto",
      ),
      originCode:
        typeof row.origin_code ===
        "string"
          ? row.origin_code
          : null,
      destinationCode:
        typeof row.destination_code ===
        "string"
          ? row.destination_code
          : null,
      notes:
        typeof row.notes ===
        "string"
          ? row.notes
          : null,
    }),
  );
}
