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

function relationName(value: unknown) {
  const source = Array.isArray(value)
    ? value[0]
    : value;

  if (!source || typeof source !== "object") {
    return "Produto";
  }

  const name = (source as { name?: unknown }).name;

  return typeof name === "string" && name.trim()
    ? name
    : "Produto";
}

export async function getPartnerLegacyHistory(
  partnerId: string,
): Promise<PartnerLegacyMovement[]> {
  const supabase = await createClient();

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("original_id,source_sheet")
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerError) throw partnerError;

  if (
    !partner?.original_id ||
    partner.source_sheet !== "PARCEIROS"
  ) {
    return [];
  }

  const marker = `parceiro original: ${partner.original_id}`;

  const { data, error } = await supabase
    .from("inventory_history")
    .select(
      "partner_movement_original_id,occurred_at,movement_type,quantity,product_id,product:products(name),origin_code,destination_code,notes",
    )
    .ilike("notes", `%${marker}%`)
    .order("occurred_at", {
      ascending: false,
    });

  if (error) throw error;

  const grouped = new Map<
    string,
    PartnerLegacyMovement
  >();

  for (
    const raw of (data ?? []) as Array<
      Record<string, unknown>
    >
  ) {
    const notes =
      typeof raw.notes === "string"
        ? raw.notes
        : null;

    if (
      notes
        ?.toLocaleLowerCase("pt-BR")
        .includes("marco zero teste")
    ) {
      continue;
    }

    const movementOriginalId = String(
      raw.partner_movement_original_id ?? "",
    );

    const occurredAt = String(
      raw.occurred_at ?? "",
    );

    const product = relationName(raw.product);

    const movementType = String(
      raw.movement_type ?? "Movimentação",
    );

    const key =
      movementOriginalId ||
      `${occurredAt}:${product}:${movementType}`;

    const candidate: PartnerLegacyMovement = {
      id: key,
      occurredAt,
      movementType,
      quantity: Number(raw.quantity ?? 0),
      product,
      originCode:
        typeof raw.origin_code === "string"
          ? raw.origin_code
          : null,
      destinationCode:
        typeof raw.destination_code === "string"
          ? raw.destination_code
          : null,
      notes,
    };

    const existing = grouped.get(key);

    if (
      !existing ||
      (
        !existing.destinationCode &&
        candidate.destinationCode
      )
    ) {
      grouped.set(key, candidate);
    }
  }

  return Array.from(
    grouped.values(),
  ).sort((a, b) =>
    b.occurredAt.localeCompare(
      a.occurredAt,
    ),
  );
}
