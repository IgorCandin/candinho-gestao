import Link from "next/link";
import { Building2 } from "lucide-react";
import { PwaInstallAssistant } from "@/components/pwa-install-assistant";

export default function InstallCompanyPage() {
  return <section className="company-install-page"><article className="company-install-card">
    <Building2 size={34}/><span>APLICATIVO PRINCIPAL</span><h1>Instalar Company</h1>
    <p>O ícone principal abre a Company e mantém todas as áreas do novo ERP no mesmo aplicativo.</p>
    <PwaInstallAssistant appName="Company" targetPath="/company/inicio"/>
    <Link className="physique-action-button" href="/company/inicio">Voltar à Company</Link>
  </article></section>;
}
