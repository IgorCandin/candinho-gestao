import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { PwaInstallAssistant } from "@/components/pwa-install-assistant";

export default function InstallTrainingPage() {
  return <section className="company-install-fichas"><article>
    <Dumbbell size={28}/><span>ATALHO PARA IPHONE</span><h1>Instalar Fichas</h1>
    <p>Este é um segundo atalho, separado da Company. Ao tocar no novo ícone, você entra diretamente na lista de fichas.</p>
    <ol><li>Abra este endereço no Safari.</li><li>Toque em Compartilhar e depois em “Adicionar à Tela de Início”.</li><li>Confirme o nome “Fichas”.</li></ol>
    <PwaInstallAssistant appName="Fichas" targetPath="/physique/fichas"/>
    <div><Link className="button ghost" href="/company/inicio">Voltar à Company</Link></div>
  </article></section>;
}
