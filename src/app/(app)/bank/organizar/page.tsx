import Link from "next/link";
import {
  Archive,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FlaskConical,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";

const groups = [
  {
    title: "Ajustes do Bank",
    description: "Coisas que você altera de vez em quando, não no uso diário.",
    items: [
      {
        href: "/bank-lab",
        title: "Bank 2.0 — laboratório",
        description: "Teste a conexão bancária sem alterar o Bank atual.",
        icon: FlaskConical,
      },
      {
        href: "/bank/atualizar",
        title: "Atualizar saldos",
        description: "Informe o saldo real das contas e carteiras.",
        icon: RefreshCcw,
      },
      {
        href: "/bank/mensalidades",
        title: "Planos e mensalidades",
        description: "Cadastre, altere, pause ou ative recorrências.",
        icon: CalendarDays,
      },
      {
        href: "/bank/contas",
        title: "Contas e carteiras",
        description: "Organize onde o dinheiro fica.",
        icon: Building2,
      },
    ],
  },
  {
    title: "Planejamento e histórico",
    description: "Use quando quiser olhar além do mês atual.",
    items: [
      {
        href: "/bank/visao-anual",
        title: "Visão anual",
        description: "Veja a projeção dos próximos meses.",
        icon: CalendarDays,
      },
      {
        href: "/bank/fechamento",
        title: "Histórico mensal",
        description: "Salve uma fotografia do Bank para comparar a evolução.",
        icon: Archive,
      },
    ],
  },
  {
    title: "Cadastros avançados",
    description: "Ficam aqui para não poluir a navegação principal.",
    items: [
      {
        href: "/bank/cobrancas",
        title: "Cobranças avulsas",
        description: "Cadastre valores pontuais que você precisa pagar.",
        icon: ReceiptText,
      },
      {
        href: "/bank/operacoes",
        title: "À receber das operações",
        description: "Consulte valores vindos de Suplementos e Fitness.",
        icon: ShoppingBag,
      },
      {
        href: "/bank/entradas",
        title: "Entradas recorrentes",
        description: "Gerencie fontes mensais e valores a receber.",
        icon: CircleDollarSign,
      },
    ],
  },
];

export default function BankOrganizePage() {
  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Organizar Bank</h1>
          <p>
            O uso do dia a dia fica nas abas principais. Aqui ficam configurações,
            cadastros e consultas que você usa com menos frequência.
          </p>
        </div>
      </div>

      <div className="bank-success-banner" style={{ marginBottom: 18 }}>
        <CircleDollarSign size={18} />
        <div>
          <strong>Regra simples</strong>
          <span>
            Para acompanhar o mês, use Este mês, Entradas, Faturas e Empréstimos.
            Se precisar configurar alguma coisa, volte aqui.
          </span>
        </div>
      </div>

      {groups.map((group) => (
        <article className="panel" key={group.title} style={{ marginTop: 18 }}>
          <div className="panel-head">
            <div>
              <h2>{group.title}</h2>
              <p>{group.description}</p>
            </div>
          </div>

          <div className="panel-body">
            <div className="bank-quick-actions" style={{ marginTop: 0 }}>
              {group.items.map(({ href, title, description, icon: Icon }) => (
                <Link className="bank-quick-card" href={href} key={href}>
                  <Icon size={20} />
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                  <ChevronRight size={17} />
                </Link>
              ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
