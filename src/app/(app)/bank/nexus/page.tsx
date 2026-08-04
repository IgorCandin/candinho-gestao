import { Bot, ShieldCheck, Sparkles } from "lucide-react";
import { BankNexusChat } from "@/components/bank-nexus-chat";

export default function BankNexusPage() {
  return (
    <section className="bank-nexus-page">
      <div className="page-header bank-page-header bank-nexus-page-header">
        <div>
          <div className="eyebrow">Candinho Bank · V40</div>
          <h1>Nexus Bank</h1>
          <p>
            Me diga como fechou o mês. Eu encontro os itens, monto a prévia e
            você confirma antes de qualquer alteração.
          </p>
        </div>

        <div className="bank-nexus-header-badges">
          <span className="bank-module-badge">
            <Sparkles size={15} />
            Linguagem natural
          </span>
          <span className="bank-module-badge">
            <ShieldCheck size={15} />
            Com confirmação
          </span>
          <span className="bank-module-badge">
            <Bot size={15} />
            Auditoria
          </span>
        </div>
      </div>

      <BankNexusChat />
    </section>
  );
}
