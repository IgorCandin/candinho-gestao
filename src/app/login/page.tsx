import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { BRAND_ASSETS } from "@/lib/brand-assets";

export default function LoginPage() {
  const company = BRAND_ASSETS.company.complete;
  const operations = [
    BRAND_ASSETS.fitness.reduced,
    BRAND_ASSETS.supplements.reduced,
    BRAND_ASSETS.bank.reduced,
    BRAND_ASSETS.central.reduced,
    BRAND_ASSETS.marketing.reduced,
  ];

  return (
    <main className="login-page login-company-theme">
      <section className="login-shell">
        <div className="login-visual">
          <Image className="login-company-logo" src={company.src} alt={company.alt} width={company.width} height={company.height} priority />

          <div className="login-intro">
            <h1>A operação da Candinho em um só lugar.</h1>
            <p>Central de atendimento, operações, estoque, parceiros e finanças com regras seguras em uma única plataforma.</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Entrar</h2>
          <LoginForm />

          <div className="login-operations login-operations-five" aria-label="Operações da Candinho Company">
            {operations.map((operation, index) => (
              <div className="login-operation-segment" key={operation.src}>
                {index > 0 && <span className="login-operation-divider" aria-hidden="true" />}
                <div className={`login-operation-logo ${operation.src.includes("bank") ? "login-bank-logo" : ""}`}>
                  <Image src={operation.src} alt={operation.alt} width={operation.width} height={operation.height} />
                </div>
              </div>
            ))}
          </div>

          <p className="login-slogan">Qualidade que entrega resultado.</p>
        </div>
      </section>
    </main>
  );
}
