import Image from "next/image";
import Link from "next/link";
import { Handshake, Link2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { getAppBootstrapSnapshot } from "@/lib/central-data";
import { formatCurrency } from "@/lib/format";

function num(source: Record<string, unknown> | null | undefined, key: string) {
  return Number(source?.[key] ?? 0);
}

export default async function DashboardPage() {
  const [access, bootstrap] = await Promise.all([getCurrentUserAccess(), getAppBootstrapSnapshot()]);

  if (access.role === "partner") {
    return (
      <section className="company-home partner-entry-home">
        <form action="/auth/signout" method="post" className="company-home-signout"><button type="submit">Sair</button></form>
        <Image className="company-home-logo" src="/candinho-company-logo.png" alt="Candinho Company" width={1356} height={480} priority />
        <div className="company-home-heading"><span>Portal do Parceiro</span><h1>Olá, {access.name}.</h1><p>Acompanhe sua parceria, vendas e estoque em um só lugar.</p></div>
        <Link className="company-home-central partner-entry-card" href="/parceiro">
          <span className="company-home-central-icon"><Handshake size={30} /></span>
          <span><small>Seu acesso</small><strong>Abrir meu painel</strong><em>Vendas, estoque, metas e condições da parceria.</em></span>
          <Sparkles size={22} />
        </Link>
      </section>
    );
  }

  const home = bootstrap?.home;
  const supplements = home?.supplements ?? null;
  const fitness = home?.fitness ?? null;
  const bank = home?.bank ?? null;
  const central = home?.central ?? null;
  const marketing = home?.marketing ?? null;
  const centralVisible = bootstrap?.feature_flags?.central_enabled !== false && (access.canManageUsers || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing);
  const marketingVisible = bootstrap?.feature_flags?.marketing_enabled !== false && access.canAccessMarketing;

  return (
    <section className="company-home">
      <form action="/auth/signout" method="post" className="company-home-signout"><button type="submit">Sair</button></form>

      <Image className="company-home-logo" src="/candinho-company-logo.png" alt="Candinho Company" width={1356} height={480} priority />
      <div className="company-home-heading">
        <h1>Olá, {access.name}.</h1>
        <p>Escolha sua operação.</p>
      </div>

      <div className="company-home-operations">
        {centralVisible && (
          <Link className="company-operation-card central" href="/central">
            <div className="company-operation-logo-wrap central-logo-wrap">
              <Image src="/operation-central.png" alt="Candinho Central" width={1203} height={190} />
            </div>
            <div className="company-operation-mini-kpis">
              <span><small>Não lidas</small><strong>{num(central, "unread")}</strong></span>
              <span><small>Conversas abertas</small><strong>{num(central, "open_conversations")}</strong></span>
              <span><small>Status</small><strong>Ativo</strong></span>
            </div>
          </Link>
        )}

        {access.canAccessSupplements && (
          <Link className="company-operation-card supplements" href="/suplementos">
            <div className="company-operation-logo-wrap"><Image src="/operation-suplementos.png" alt="Candinho Suplementos" width={1475} height={258} /></div>
            <div className="company-operation-mini-kpis">
              <span><small>Vendas no mês</small><strong>{num(supplements, "current_month_sales")}</strong></span>
              <span><small>Faturamento</small><strong>{formatCurrency(num(supplements, "current_month_revenue"))}</strong></span>
              <span><small>Estoque</small><strong>{num(supplements, "available_units")} un.</strong></span>
            </div>
          </Link>
        )}

        {access.canAccessFitness && (
          <Link className="company-operation-card fitness" href="/fitness">
            <div className="company-operation-logo-wrap"><Image src="/operation-fitness.png" alt="Candinho Fitness" width={1109} height={190} /></div>
            <div className="company-operation-mini-kpis">
              <span><small>Vendas no mês</small><strong>{num(fitness, "month_sales")}</strong></span>
              <span><small>Faturamento</small><strong>{formatCurrency(num(fitness, "month_revenue"))}</strong></span>
              <span><small>Estoque</small><strong>{num(fitness, "available_units")} un.</strong></span>
            </div>
          </Link>
        )}

        {marketingVisible && (
          <Link className="company-operation-card marketing" href="/marketing">
            <div className="company-operation-logo-wrap"><Image src="/operation-marketing.png" alt="Candinho Marketing" width={1244} height={184} /></div>
            <div className="company-operation-mini-kpis">
              <span><small>Status</small><strong>Base pronta</strong></span>
              <span><small>Estrutura</small><strong>{marketing ? "Ativa" : "Preparada"}</strong></span>
              <span><small>Próximo passo</small><strong>Definir operação</strong></span>
            </div>
          </Link>
        )}

        {access.canAccessBank && (
          <Link className="company-operation-card bank" href="/bank">
            <div className="company-operation-logo-wrap"><Image src="/operation-bank.png" alt="Candinho Bank" width={664} height={146} /></div>
            <div className="company-operation-mini-kpis">
              <span><small>Saldo atual</small><strong>{formatCurrency(num(bank, "total_balance"))}</strong></span>
              <span><small>Faturas do mês</small><strong>{formatCurrency(num(bank, "invoices_this_month"))}</strong></span>
              <span><small>Dívidas</small><strong>{formatCurrency(num(bank, "total_debt_remaining"))}</strong></span>
            </div>
          </Link>
        )}
      </div>

      {access.canManageUsers && (
        <div className="company-home-admin-row">
          <Link href="/parceiros/gerencial"><Handshake size={18} /><span><strong>PARCEIROS</strong><small>Gestão, regras e acessos do portal</small></span></Link>
          <Link href="/configuracoes"><UserRound size={18} /><span><strong>PERFIL</strong><small>Perfis e permissões da equipe</small></span></Link>
          <Link href="/central/integracoes"><Link2 size={18} /><span><strong>INTEGRAÇÕES</strong><small>Meta, OpenAI e saúde dos canais</small></span></Link>
          <Link href="/central/governanca"><ShieldCheck size={18} /><span><strong>GOVERNANÇA</strong><small>Auditoria e integridade da Central</small></span></Link>
        </div>
      )}

      {(!access.active || (!centralVisible && !access.canAccessSupplements && !access.canAccessFitness && !access.canAccessBank && !access.canAccessMarketing)) && (
        <p className="operation-access-warning">Seu usuário ainda não possui uma operação liberada.</p>
      )}
    </section>
  );
}
