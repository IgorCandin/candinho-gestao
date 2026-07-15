import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-page login-company-theme">
      <section className="login-shell">
        <div className="login-visual">
          <Image
            className="login-company-logo"
            src="/candinho-company-logo.webp"
            alt="Candinho Company"
            width={1000}
            height={343}
            priority
          />

          <div className="login-intro">
            <h1>A operaÃ§Ã£o da Candinho em um sÃ³ lugar.</h1>
            <p>
              Estoque, vendas, clientes, catÃ¡logo e histÃ³rico com regras seguras e
              uma interface otimizada.
            </p>
          </div>
        </div>

        <div className="login-card">
          <h2>Entrar</h2>
          <LoginForm />

          <div className="login-operations login-operations-three" aria-label="OperaÃ§Ãµes da Candinho Company">
            <div className="login-operation-logo">
              <Image src="/candinho-suplementos-logo.webp" alt="Candinho Suplementos" width={900} height={326} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo">
              <Image src="/candinho-fitness-logo.webp" alt="Candinho Fitness" width={900} height={333} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo login-bank-logo">
              <Image src="/operation-bank.png" alt="Candinho Bank" width={709} height={236} />
            </div>
          </div>

          <p className="login-slogan">Qualidade que entrega resultado.</p>
        </div>
      </section>
    </main>
  );
}

