import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-visual">
          <div className="brand">
            <span className="brand-mark">CC</span>
            <span>
              <strong>CANDINHO COMPANY</strong>
              <span>Gestão operacional</span>
            </span>
          </div>

          <div>
            <h1>A operação da Candinho em um só lugar.</h1>
            <p>
              Estoque, vendas, clientes, catálogo e histórico com regras seguras e
              uma interface otimizada.
            </p>
          </div>
        </div>

        <div className="login-card">
          <h2>Entrar</h2>
          <LoginForm />

          <div className="login-business-brand" aria-label="Candinho Suplementos">
            <Image
              className="login-business-logo"
              src="/candinho-suplementos-logo.webp"
              alt="Candinho Suplementos"
              width={420}
              height={150}
              priority
            />
            <span>Qualidade que entrega resultado.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
