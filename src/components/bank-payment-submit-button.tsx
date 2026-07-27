"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function BankPaymentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button gold" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? <LoaderCircle size={16} /> : <CheckCircle2 size={16} />}
      {pending ? "Registrando..." : "Registrar pagamento"}
    </button>
  );
}
