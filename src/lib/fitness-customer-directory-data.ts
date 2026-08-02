import { createClient } from "@/lib/supabase/server";

export type FitnessCustomerOption = {
  id: string;
  fitness_customer_id: string | null;
  core_customer_id: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  total_purchases: number;
  total_spent: number;
  last_purchase_on: string | null;
  days_without_purchase: number | null;
  classification: string;
  has_fitness_profile: boolean;
};

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFitnessCompanyCustomerDirectory(): Promise<
  FitnessCustomerOption[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fitness_company_customer_directory_v1")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(
      `Falha ao carregar clientes compartilhados: ${error.message}`,
    );
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    fitness_customer_id:
      typeof row.fitness_customer_id === "string"
        ? row.fitness_customer_id
        : null,
    core_customer_id:
      typeof row.core_customer_id === "string"
        ? row.core_customer_id
        : null,
    name: String(row.name ?? "Cliente"),
    phone: typeof row.phone === "string" ? row.phone : null,
    instagram:
      typeof row.instagram === "string" ? row.instagram : null,
    city: typeof row.city === "string" ? row.city : null,
    source: typeof row.source === "string" ? row.source : null,
    notes: null,
    active: row.active !== false,
    created_at: "",
    updated_at: "",
    total_purchases: number(row.total_purchases),
    total_spent: number(row.total_spent),
    last_purchase_on:
      typeof row.last_purchase_on === "string"
        ? row.last_purchase_on
        : null,
    days_without_purchase: null,
    classification: number(row.total_purchases) > 0 ? "Fitness" : "Company",
    has_fitness_profile: Boolean(row.has_fitness_profile),
  }));
}
