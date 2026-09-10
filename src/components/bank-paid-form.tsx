"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markBankCommitmentAsPaid } from "@/app/(app)/bank/actions";

export function BankPaidForm({ commitmentKey, referenceMonth }: { commitmentKey: string; referenceMonth: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return <span className="badge green">Pago · atualizando</span>;

  return <form action={(formData) => {
    setHidden(true);
    startTransition(async () => {
      try {
        await markBankCommitmentAsPaid(formData);
        router.refresh();
      } catch (error) {
        setHidden(false);
        throw error;
      }
    });
  }}>
    <input type="hidden" name="commitment_key" value={commitmentKey}/>
    <input type="hidden" name="reference_month" value={referenceMonth}/>
    <button className="button ghost compact-button" type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="spin" size={14}/> : <CheckCircle2 size={14}/>}
      {pending ? "Pagando..." : "Paguei"}
    </button>
  </form>;
}
