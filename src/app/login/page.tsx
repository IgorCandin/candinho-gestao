import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <main className="login-page"><section className="login-shell"><div className="login-visual"><div className="brand"><span className="brand-mark">CS</span><span><strong>CANDINHO</strong><span>Gestão interna</span></span></div><div><div className="eyebrow">Sistema próprio</div><h1>A operação da Candinho em um só lugar.</h1><p>Estoque, vendas, clientes, catálogo e histórico com regras seguras e uma interface feita para celular.</p></div><p style={{ fontSize: 12 }}>Qualidade que entrega resultado.</p></div><div className="login-card"><h2>Entrar</h2><p>Use o e-mail autorizado no Supabase.</p><LoginForm /></div></section></main>;
}
