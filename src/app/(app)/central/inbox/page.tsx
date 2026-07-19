import { redirect } from "next/navigation";

export default function CentralInboxPausedPage() {
  // Inbox pausado por decisão operacional.
  // Mantemos a rota para não quebrar links antigos, mas ela não carrega
  // snapshots, mensagens, anexos, Realtime ou componentes de atendimento.
  redirect("/central");
}
