"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BanknoteArrowDown,
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";

export type ReturnCaseActionItem = {
  id: string;
  item_name: string;
  variant_label: string | null;
  product_id: string | null;
  flavor_id: string | null;
  variant_id: string | null;
  quantity_requested: number;
  quantity_received: number;
  item_condition: string;
  disposition: string;
  unit_price: number;
};

export type ReturnLotOption = {
  id: string;
  product_id: string;
  flavor_id: string | null;
  lot_number: string;
  expires_on: string | null;
  quantity_on_hand: number;
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReceiveReturnCaseAction({
  caseId,
  items,
}: {
  caseId: string;
  items: ReturnCaseActionItem[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [receivedOn, setReceivedOn] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [values, setValues] = useState<
    Record<
      string,
      {
        quantity: number;
        condition: string;
      }
    >
  >(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          quantity: item.quantity_requested,
          condition: "unused",
        },
      ]),
    ),
  );

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const payload = items.map((item) => ({
        item_id: item.id,
        quantity_received: values[item.id]?.quantity ?? 0,
        condition: values[item.id]?.condition ?? "unused",
      }));

      const { error } = await supabase.rpc("receive_return_case", {
        p_case_id: caseId,
        p_received_on: receivedOn,
        p_items: payload,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o recebimento.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="button gold" type="button" onClick={() => setOpen(true)}>
        <PackageCheck size={16} />
        Registrar devolução recebida
      </button>
    );
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>Conferir o que voltou</h2>
          <p>
            Registrar recebimento não devolve nada ao estoque. Primeiro a peça
            ou produto passa pela conferência.
          </p>
        </div>

        <button className="icon-button" type="button" onClick={() => setOpen(false)}>
          <XCircle size={17} />
        </button>
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Data do recebimento</span>
          <input
            className="input"
            type="date"
            value={receivedOn}
            onChange={(event) => setReceivedOn(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Observação geral</span>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: recebido pela Giulia"
          />
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Solicitado</th>
              <th>Recebido</th>
              <th>Condição</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.item_name}</strong>
                  <small>{item.variant_label ?? ""}</small>
                </td>

                <td>{item.quantity_requested}</td>

                <td>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max={item.quantity_requested}
                    value={values[item.id]?.quantity ?? 0}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [item.id]: {
                          ...current[item.id],
                          quantity: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </td>

                <td>
                  <select
                    className="select"
                    value={values[item.id]?.condition ?? "unused"}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [item.id]: {
                          ...current[item.id],
                          condition: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="sealed">Lacrado</option>
                    <option value="unused">Sem uso</option>
                    <option value="opened">Aberto</option>
                    <option value="used">Usado</option>
                    <option value="damaged">Avariado</option>
                    <option value="defective">Defeito</option>
                    <option value="wrong_item">Item incorreto</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-body">
        <button className="button gold" type="button" onClick={submit} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={16} /> : <PackageCheck size={16} />}
          {loading ? "Salvando" : "Confirmar recebimento"}
        </button>

        {message && <p className="sale-action-message">{message}</p>}
      </div>
    </article>
  );
}

export function ResolveReturnCaseAction({
  caseId,
  operation,
  items,
  lots,
}: {
  caseId: string;
  operation: "supplements" | "fitness";
  items: ReturnCaseActionItem[];
  lots: ReturnLotOption[];
}) {
  const router = useRouter();
  const receivedItems = items.filter((item) => item.quantity_received > 0);

  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("exchange");
  const [refundAmount, setRefundAmount] = useState("0");
  const [resolvedOn, setResolvedOn] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [values, setValues] = useState<
    Record<
      string,
      {
        disposition: string;
        lot_id: string;
      }
    >
  >(
    Object.fromEntries(
      receivedItems.map((item) => [
        item.id,
        {
          disposition:
            item.item_condition === "sealed" || item.item_condition === "unused"
              ? "restock"
              : "quarantine",
          lot_id: "",
        },
      ]),
    ),
  );

  const receivedValue = useMemo(
    () =>
      receivedItems.reduce(
        (sum, item) => sum + item.quantity_received * item.unit_price,
        0,
      ),
    [receivedItems],
  );

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const payload = receivedItems.map((item) => ({
        item_id: item.id,
        disposition: values[item.id]?.disposition ?? "quarantine",
        lot_id: values[item.id]?.lot_id || null,
      }));

      const { error } = await supabase.rpc("resolve_return_case", {
        p_case_id: caseId,
        p_resolution: resolution,
        p_items: payload,
        p_refund_amount: Number(refundAmount || 0),
        p_resolved_on: resolvedOn,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível resolver a ocorrência.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="button gold" type="button" onClick={() => setOpen(true)}>
        <CheckCircle2 size={16} />
        Resolver ocorrência
      </button>
    );
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>Destino dos itens e resolução</h2>
          <p>
            Item devolvido só volta ao estoque vendável quando você escolher
            explicitamente "Voltar ao estoque".
          </p>
        </div>

        <button className="icon-button" type="button" onClick={() => setOpen(false)}>
          <XCircle size={17} />
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Condição</th>
              <th>Qtd.</th>
              <th>Destino físico</th>
              {operation === "supplements" && <th>Lote de retorno</th>}
            </tr>
          </thead>

          <tbody>
            {receivedItems.map((item) => {
              const matchingLots = lots.filter(
                (lot) =>
                  lot.product_id === item.product_id &&
                  lot.flavor_id === item.flavor_id,
              );

              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.item_name}</strong>
                    <small>{item.variant_label ?? ""}</small>
                  </td>

                  <td>{item.item_condition}</td>
                  <td>{item.quantity_received}</td>

                  <td>
                    <select
                      className="select"
                      value={values[item.id]?.disposition ?? "quarantine"}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [item.id]: {
                            ...current[item.id],
                            disposition: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="restock">Voltar ao estoque</option>
                      <option value="quarantine">Quarentena / separado</option>
                      <option value="discard">Descarte</option>
                      <option value="return_supplier">Devolver ao fornecedor</option>
                    </select>
                  </td>

                  {operation === "supplements" && (
                    <td>
                      <select
                        className="select"
                        value={values[item.id]?.lot_id ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              lot_id: event.target.value,
                            },
                          }))
                        }
                        disabled={
                          values[item.id]?.disposition !== "restock" ||
                          matchingLots.length === 0
                        }
                      >
                        <option value="">
                          {matchingLots.length === 0
                            ? "Sem lote rastreado"
                            : "Automático / estoque legado"}
                        </option>

                        {matchingLots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lot_number}
                            {lot.expires_on ? ` · val. ${lot.expires_on}` : ""}
                            {` · saldo ${lot.quantity_on_hand}`}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Resolução comercial</span>

          <select
            className="select"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
          >
            <option value="exchange">Troca</option>
            <option value="refund">Reembolso</option>
            <option value="replacement">Reposição / substituição</option>
            <option value="no_action">Sem compensação</option>
          </select>
        </label>

        <label className="field">
          <span>Resolvido em</span>
          <input
            className="input"
            type="date"
            value={resolvedOn}
            onChange={(event) => setResolvedOn(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Valor de reembolso</span>
          <input
            className="input"
            type="number"
            min="0"
            max={receivedValue}
            step="0.01"
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value)}
          />
          <small>Máximo recebido: {formatCurrency(receivedValue)}</small>
        </label>

        <label className="field">
          <span>Observação</span>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: cliente escolheu outra peça"
          />
        </label>

        <div className="field field-span-two">
          <button className="button gold" type="button" onClick={submit} disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
            {loading ? "Resolvendo" : "Concluir ocorrência"}
          </button>

          {message && <small className="form-message">{message}</small>}
        </div>
      </div>
    </article>
  );
}

export function ScheduleReturnRefundAction({
  caseId,
  refundAmount,
}: {
  caseId: string;
  refundAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("schedule_return_refund_in_bank", {
        p_case_id: caseId,
        p_due_date: dueDate,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível agendar o reembolso no Bank.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="button gold" type="button" onClick={() => setOpen(true)}>
        <BanknoteArrowDown size={16} />
        Agendar {formatCurrency(refundAmount)} no Bank
      </button>
    );
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>Agendar reembolso</h2>
          <p>
            Cria uma conta a pagar no Candinho Bank vinculada a esta ocorrência.
          </p>
        </div>

        <ShieldAlert size={20} />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Data prevista</span>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Observação</span>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex.: devolver via Pix"
          />
        </label>

        <div className="field field-span-two">
          <button className="button gold" type="button" onClick={submit} disabled={loading}>
            {loading ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <BanknoteArrowDown size={16} />
            )}
            {loading ? "Agendando" : "Criar conta no Bank"}
          </button>

          {message && <small className="form-message">{message}</small>}
        </div>
      </div>
    </article>
  );
}


export function CloseReturnCaseAction({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("cancelled");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("close_return_case", {
        p_case_id: caseId,
        p_status: status,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a ocorrência.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="button ghost" type="button" onClick={() => setOpen(true)}>
        <XCircle size={16} />
        Encerrar sem prosseguir
      </button>
    );
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>Encerrar ocorrência</h2>
          <p>
            Use quando o cliente desistiu da troca/devolução ou quando a
            solicitação foi recusada. Nenhum estoque é movimentado.
          </p>
        </div>
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Motivo do encerramento</span>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="cancelled">Cliente desistiu / cancelado</option>
            <option value="rejected">Solicitação recusada</option>
          </select>
        </label>

        <label className="field">
          <span>Observação</span>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Explique o encerramento"
          />
        </label>

        <div className="field field-span-two">
          <button className="button ghost" type="button" onClick={submit} disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <XCircle size={16} />}
            {loading ? "Encerrando" : "Confirmar encerramento"}
          </button>

          {message && <small className="form-message">{message}</small>}
        </div>
      </div>
    </article>
  );
}
