import { createClient } from "@/lib/supabase/server";

export type PublicFitnessAvailabilityOption = {
  size: string;
  color: string;
  available_quantity: number;
};

export type PublicFitnessAvailabilityMap = Record<
  string,
  PublicFitnessAvailabilityOption[]
>;

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getPublicFitnessAvailabilityMap(): Promise<
  PublicFitnessAvailabilityMap
> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "public_fitness_available_options_v1",
  );

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    if (error) {
      console.warn(
        "[Public Fitness Availability]",
        error.message,
      );
    }
    return {};
  }

  const result: PublicFitnessAvailabilityMap = {};

  for (const [productId, rawOptions] of Object.entries(
    data as Record<string, unknown>,
  )) {
    if (!Array.isArray(rawOptions)) continue;

    result[productId] = rawOptions
      .filter(
        (option): option is Record<string, unknown> =>
          Boolean(
            option &&
              typeof option === "object" &&
              !Array.isArray(option),
          ),
      )
      .map((option) => ({
        size: String(option.size ?? ""),
        color: String(option.color ?? ""),
        available_quantity: number(option.available_quantity),
      }))
      .filter(
        (option) =>
          option.size &&
          option.color &&
          option.available_quantity > 0,
      );
  }

  return result;
}
