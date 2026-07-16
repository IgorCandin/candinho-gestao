import Image from "next/image";
import { OperationSwitcher } from "@/components/operation-switcher";
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
      <OperationSwitcher
        canAccessSupplements={access.canAccessSupplements}
        canAccessFitness={access.canAccessFitness}
        canAccessBank={access.canAccessBank}
      />
      {(!access.active || (!access.canAccessSupplements && !access.canAccessFitness && !access.canAccessBank)) && (
        <p className="operation-access-warning">Seu usuário ainda não possui uma operação liberada.</p>
      )}
    </section>
  );
}
