export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const appConfig = {
  name: "Candinho Gestão",
  company: "Candinho Suplementos",
  locations: ["CS", "CTS", "ES", "TT", "INGRID", "ADRIANA", "ITAPHARMA"],
};
