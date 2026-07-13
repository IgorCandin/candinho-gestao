import { Database, GitBranch, KeyRound, Rocket } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  const items = [
    { icon: Database, title: "Supabase", text: "Banco, autenticação, arquivos e regras de segurança." },
    { icon: GitBranch, title: "GitHub", text: "Histórico do código e ponto de entrada para atualizações automáticas." },
    { icon: Rocket, title: "Vercel", text: "Publicação automática do aplicativo a cada atualização aprovada." },
    { icon: KeyRound, title: "Permissões", text: "Administrador, operador e parceiro com acesso separado." },
  ];
  return <><DemoBanner /><PageHeader eyebrow="Sistema" title="Configurações" description="Conexões, usuários, permissões e implantação do ambiente." />
    <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>{items.map(({ icon: Icon, title, text }) => <article className="panel" key={title}><div className="panel-body"><span className="stat-icon"><Icon size={18} /></span><h2 style={{ fontSize: 17, margin: "18px 0 8px" }}>{title}</h2><p style={{ color: "var(--muted)", lineHeight: 1.55, fontSize: 13 }}>{text}</p><button className="button ghost">Configurar</button></div></article>)}</section></>;
}
