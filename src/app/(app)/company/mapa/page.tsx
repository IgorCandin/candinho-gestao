import Link from "next/link";
import { Activity, Banknote, Boxes, Building2, CheckCircle2, CircleDot, Dumbbell, Mail, MonitorSmartphone, ShoppingBag, Store, UsersRound } from "lucide-react";

const branches = [
  { key: "comercial", title: "Comercial", icon: ShoppingBag, status: "testing", note: "Clientes, vendas, orçamentos e entregas migrados; rodada funcional em andamento.", href: "/company/vender" },
  { key: "produtos", title: "Produtos e estoque", icon: Boxes, status: "testing", note: "Catálogo unificado, combos, promoções, parceiros e custo do saldo em validação.", href: "/company/produtos" },
  { key: "gestao", title: "Gestão e Central", icon: Building2, status: "progress", note: "Central está sendo dissolvida dentro da Gestão; telas antigas ainda serão aposentadas.", href: "/company/gestao" },
  { key: "bank", title: "Bank", icon: Banknote, status: "progress", note: "Cabeçalho e objetivos financeiros prontos; aprofundamento do Bank 2.0 continua pendente.", href: "/bank" },
  { key: "atletas", title: "Atletas", icon: Dumbbell, status: "progress", note: "Base e fichas migradas; faltam avaliações, histórico, fotos e troca de ficha por atleta.", href: "/atletas" },
  { key: "vitrine", title: "Vitrine", icon: Store, status: "audit", note: "Necessidade final ainda precisa ser descoberta no teste real.", href: "/vitrine" },
  { key: "integracoes", title: "E-mail e Twilio", icon: Mail, status: "paused", note: "Integrações pausadas para retomada depois dos fluxos principais.", href: "/company/gestao/central/integracoes" },
  { key: "devices", title: "Dispositivos", icon: MonitorSmartphone, status: "testing", note: "Computador em uso; revisão final ainda inclui iPhone, tablet e paisagem.", href: "/company/inicio" },
  { key: "legacy", title: "ERP antigo", icon: UsersRound, status: "progress", note: "Auditar aba por aba de Suplementos, depois Fitness, até zerar acessos necessários.", href: "/dashboard" },
] as const;
const status = { testing: ["Em teste", "testing"], progress: ["Em migração", "progress"], audit: ["A auditar", "audit"], paused: ["Pausado", "paused"] } as const;

export default function CompanyMigrationMapPage() {
  return <div className="company-map-page"><header><span>COMPANY · MAPA VIVO</span><h1>Migração sem pontas soltas</h1><p>Este é o controle oficial do ERP 2.0. Cada pacote atualiza uma ramificação até o sistema antigo deixar de ser necessário.</p></header><section className="company-mindmap" aria-label="Mapa da migração"><div className="company-map-core"><CircleDot/><strong>Candinho Company</strong><span>Um cadastro · uma navegação · uma verdade</span></div><div className="company-map-branches">{branches.map(({ key, title, icon: Icon, status: state, note, href }) => <Link href={href} className={`company-map-node ${state}`} key={key}><Icon/><div><span>{status[state][0]}</span><h2>{title}</h2><p>{note}</p></div><Activity/></Link>)}</div></section><section className="company-dna"><div><span>DNA DA COMPANY</span><h2>Regras que nenhum módulo pode quebrar</h2></div><div className="company-dna-grid"><article><CheckCircle2/><strong>Responsivo de origem</strong><p>Computador, telefone, tablet e paisagem sem remendos por tela.</p></article><article><CheckCircle2/><strong>Dados únicos</strong><p>Cliente, produto, estoque e financeiro sem cadastros duplicados.</p></article><article><CheckCircle2/><strong>Navegação previsível</strong><p>Logo volta ao início; perfil troca de operação; menus permanecem alcançáveis.</p></article><article><CheckCircle2/><strong>Migração comprovada</strong><p>Só inativar uma tela antiga quando a equivalente estiver migrada, testada e sem acesso necessário.</p></article></div></section></div>;
}
