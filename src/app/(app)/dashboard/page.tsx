import Image from "next/image";
import Link from "next/link";
import { getCurrentUserAccess } from "@/lib/data";

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();

  return (
    <section className="operation-hub">
      <Image className="operation-hub-logo" src="/candinho-company-logo.webp" alt="Candinho Company" width={1000} height={343} priority />
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
      {(!access.active || (!access.canAccessSupplements && !access.canAccessFitness)) && (
        <p className="operation-access-warning">Seu usuário ainda não possui uma operação liberada.</p>
      )}
    </section>
  );
}
