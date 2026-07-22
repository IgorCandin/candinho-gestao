import { redirect } from "next/navigation";

export default function CentralNexusPausedPage() {
  // O Nexus de atendimento dependia da Inbox, que está pausada.
  // Mantemos a rota para preservar links antigos sem carregar IA ou histórico.
  redirect("/central");
}
