export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const appConfig = {
  name: "Candinho Company",
  company: "Candinho Company",
  locations: ["CS", "CTS", "ES", "TT", "INGRID", "ADRIANA", "ITAPHARMA"],
};
