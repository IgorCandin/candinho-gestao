import Image from "next/image";
import Link from "next/link";
import { getUserAccess, MANAGER_EMAIL } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let email: string | null = MANAGER_EMAIL;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  const access = getUserAccess(email);

  return (
    <section className="operation-hub">
      <Image
        className="operation-hub-logo"
        src="/candinho-company-logo.webp"
        alt="Candinho Company"
        width={1000}
        height={343}
        priority
      />

      <div className="operation-hub-copy">
        <div className="eyebrow">Gestão operacional</div>
        <h1>Seja bem-vindo de volta, {access.name}.</h1>
        <p>Escolha a operação que deseja acessar.</p>
      </div>

      <div className={`operation-buttons ${access.canAccessSupplements && access.canAccessFitness ? "two" : "one"}`}>
        {access.canAccessSupplements && (
          <Link className="operation-button supplements" href="/suplementos" aria-label="Acessar Candinho Suplementos">
            <Image src="/operation-suplementos.png" alt="Suplementos" width={709} height={236} />
          </Link>
        )}

        {access.canAccessFitness && (
          <Link className="operation-button fitness" href="/fitness" aria-label="Acessar Candinho Fitness">
            <Image src="/operation-fitness.png" alt="Fitness" width={709} height={236} />
          </Link>
        )}
      </div>

      {!access.canAccessSupplements && !access.canAccessFitness && (
        <p className="operation-access-warning">Seu usuário ainda não possui uma operação liberada.</p>
      )}
    </section>
  );
}
