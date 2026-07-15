import Image from "next/image";
import { LoginForm } from "@/components/login-form";

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
            <h1>A operação da Candinho em um só lugar.</h1>
            <p>Estoque, vendas, clientes, catálogo e histórico com regras seguras e uma interface otimizada.</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Entrar</h2>
          <LoginForm />

          <div className="login-operations login-operations-three" aria-label="Operações da Candinho Company">
            <div className="login-operation-logo">
              <Image src="/candinho-suplementos-logo.webp" alt="Candinho Suplementos" width={1000} height={343} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo">
              <Image src="/candinho-fitness-logo.webp" alt="Candinho Fitness" width={1000} height={343} />
            </div>
            <span className="login-operation-divider" aria-hidden="true" />
            <div className="login-operation-logo login-bank-logo">
              <Image src="/candinho-bank-logo.png" alt="Candinho Bank" width={1000} height={343} />
            </div>
          </div>

          <p className="login-slogan">Qualidade que entrega resultado.</p>
        </div>
      </section>
    </main>
  );
}
