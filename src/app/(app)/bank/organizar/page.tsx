import Link from "next/link";
import {
  Archive,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";

const groups = [
  {
    title: "Ajustes do Bank",
    description: "Coisas que vocÃª altera de vez em quando, nÃ£o no uso diÃ¡rio.",
    items: [
      {
        href: "/bank/atualizar",
        title: "Atualizar saldos",
        description: "Informe o saldo real das contas e carteiras.",
        icon: RefreshCcw,
      },
      {
        href: "/bank/mensalidades",
        title: "Planos e mensalidades",
        description: "Cadastre, altere, pause ou ative recorrÃªncias.",
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
    title: "Planejamento e histÃ³rico",
    description: "Use quando quiser olhar alÃ©m do mÃªs atual.",
    items: [
      {
        href: "/bank/visao-anual",
        title: "VisÃ£o anual",
        description: "Veja a projeÃ§Ã£o dos prÃ³ximos meses.",
        icon: CalendarDays,
      },
      {
        href: "/bank/fechamento",
        title: "HistÃ³rico mensal",
        description: "Salve uma fotografia do Bank para comparar a evoluÃ§Ã£o.",
        icon: Archive,
      },
    ],
  },
  {
    title: "Cadastros avanÃ§ados",
    description: "Ficam aqui para nÃ£o poluir a navegaÃ§Ã£o principal.",
    items: [
      {
        href: "/bank/cobrancas",
        title: "CobranÃ§as avulsas",
        description: "Cadastre valores pontuais que vocÃª precisa pagar.",
        icon: ReceiptText,
      },
      {
        href: "/bank/operacoes",
        title: "Ã€ receber das operaÃ§Ãµes",
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
            O uso do dia a dia fica nas abas principais. Aqui ficam configuraÃ§Ãµes,
            cadastros e consultas que vocÃª usa com menos frequÃªncia.
          </p>
        </div>
      </div>

      <div className="bank-success-banner" style={{ marginBottom: 18 }}>
        <CircleDollarSign size={18} />
        <div>
          <strong>Regra simples</strong>
          <span>
            Para acompanhar o mÃªs, use Este mÃªs, Entradas, Faturas e EmprÃ©stimos.
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
