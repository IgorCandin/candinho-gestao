import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user?.phone && !data.user.email ? "/minha-conta" : data.user ? "/company/inicio" : "/catalogo");
}
