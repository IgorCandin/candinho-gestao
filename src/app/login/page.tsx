import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page login-company-theme">
      <section className="login-shell">
        <div className="login-visual">
          <Image
            className="login-company-logo"
            src="/candinho-company-logo.png"
            alt="Candinho Company"
            width={1356}
            height={480}
            priority
          />

          <div className="login-intro">
            <h1>A operação da Candinho em um só lugar.</h1>
            <p>Central de atendimento, operações, estoque, parceiros e finanças com regras seguras em uma única plataforma.</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Entrar</h2>
          <LoginForm />

          <div className="login-operations login-operations-five" aria-label="Operações da Candinho Company">
            <div className="login-operation-logo">
              <Image src="/candinho-suplementos-logo.png" alt="Candinho Suplementos" width={1475} height={258} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo">
              <Image src="/candinho-fitness-logo.png" alt="Candinho Fitness" width={1109} height={190} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo login-bank-logo">
              <Image src="/candinho-bank-logo.png" alt="Candinho Bank" width={664} height={146} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo">
              <Image src="/candinho-central-logo.png" alt="Candinho Central" width={1203} height={190} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo">
              <Image src="/candinho-marketing-logo.png" alt="Candinho Marketing" width={1244} height={184} />
            </div>
          </div>

          <p className="login-slogan">Qualidade que entrega resultado.</p>
        </div>
      </section>
    </main>
  );
}
