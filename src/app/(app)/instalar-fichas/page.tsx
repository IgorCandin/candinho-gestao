import Link from "next/link";
import { Dumbbell, ExternalLink, Share2 } from "lucide-react";

export default function InstallTrainingPage() {
  return <section className="company-install-fichas"><article>
    <Dumbbell size={28}/><span>ATALHO PARA IPHONE</span><h1>Instalar Fichas</h1>
    <p>Este é um segundo atalho, separado da Company. Ao tocar no novo ícone, você entra diretamente na lista de fichas.</p>
    <ol><li>Abra esta página no Safari.</li><li>Toque no botão <Share2 size={15}/> Compartilhar do iPhone.</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Confirme o nome “Fichas”.</li></ol>
    <div><Link className="button company-blue" href="/physique/fichas"><ExternalLink size={15}/>Abrir Fichas</Link><Link className="button ghost" href="/company/inicio">Voltar à Company</Link></div>
  </article></section>;
}
