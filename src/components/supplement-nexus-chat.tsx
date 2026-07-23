"use client";

import {
  Bot,
  Copy,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CustomerOption } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SupplementNexusChat({
  customers,
}: {
  customers: CustomerOption[];
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleCustomers = useMemo(() => {
    const needle = normalize(customerSearch.trim());
    const selected = customers.find((customer) => customer.id === customerId) ?? null;

    const matches = needle
      ? customers.filter((customer) =>
          normalize(
            `${customer.name} ${customer.city ?? ""} ${customer.phone ?? ""}`,
          ).includes(needle),
        )
      : customers;

    if (selected && !matches.some((customer) => customer.id === selected.id)) {
      return [selected, ...matches].slice(0, 100);
    }

    return matches.slice(0, 100);
  }, [customerId, customerSearch, customers]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: message },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/suplementos/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || null,
          message,
          history: messages.slice(-8),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Não foi possível conversar com o Nexus agora.",
        );
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: String(payload.message || "") },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível conversar com o Nexus agora.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)",
        gap: 16,
        alignItems: "start",
      }}
    >
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Conversa com o Nexus</h2>
            <p>
              Explique a situação como você falaria comigo: objetivo, rotina,
              sensibilidade, dúvida e o que a cliente está buscando.
            </p>
          </div>

          <button
            className="button ghost compact-button"
            type="button"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
          >
            <RotateCcw size={14} />
            Nova conversa
          </button>
        </div>

        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          {messages.length === 0 ? (
            <div className="empty compact">
              <Bot size={28} />
              <strong>Pronto para analisar o caso</strong>
              Exemplo: “Ela treina à noite, sofre com ansiedade e quer mais
              energia sem atrapalhar o sono. O que temos que faz mais sentido?”
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  style={{
                    justifySelf: item.role === "user" ? "end" : "stretch",
                    maxWidth: item.role === "user" ? "82%" : "100%",
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background:
                      item.role === "user" ? "var(--panel)" : "transparent",
                  }}
                >
                  <small
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--muted)",
                      marginBottom: 6,
                    }}
                  >
                    {item.role === "user" ? (
                      <UserRound size={13} />
                    ) : (
                      <Bot size={13} />
                    )}
                    {item.role === "user" ? "Você" : "Nexus"}
                  </small>

                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    {item.content}
                  </p>

                  {item.role === "assistant" && (
                    <button
                      className="button ghost compact-button"
                      type="button"
                      style={{ marginTop: 9 }}
                      onClick={() =>
                        navigator.clipboard?.writeText(item.content)
                      }
                    >
                      <Copy size={13} />
                      Copiar
                    </button>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "var(--muted)",
                  }}
                >
                  <LoaderCircle className="spin" size={17} />
                  Nexus analisando catálogo, estoque e contexto...
                </div>
              )}
            </div>
          )}

          {error && <p className="form-message">{error}</p>}

          <div style={{ display: "grid", gap: 8 }}>
            <textarea
              className="textarea"
              rows={5}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Explique a situação da cliente ou faça uma pergunta sobre os seus suplementos..."
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.ctrlKey || event.metaKey)
                ) {
                  event.preventDefault();
                  void send();
                }
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <small className="form-help">
                Ctrl + Enter envia. O Nexus não cria venda, não altera estoque e
                não salva decisão automaticamente.
              </small>

              <button
                className="button gold"
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
              >
                {loading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                {loading ? "Analisando" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </article>

      <aside className="panel">
        <div className="panel-head">
          <div>
            <h2>Contexto da cliente</h2>
            <p>
              Opcional. Ao escolher, o Nexus consulta os alertas e o histórico
              recente do CRM.
            </p>
          </div>
        </div>

        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          <label className="field">
            <span>Pesquisar cliente</span>
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--muted)",
                }}
              />
              <input
                className="input"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Digite o nome, cidade ou telefone..."
                style={{ width: "100%", boxSizing: "border-box", paddingLeft: 34 }}
              />
            </div>
          </label>

          <label className="field">
            <span>Cliente</span>
            <select
              className="select"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Conversa geral, sem cliente</option>
              {visibleCustomers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                  {customer.city ? ` · ${customer.city}` : ""}
                </option>
              ))}
            </select>
            {customerSearch.trim() && visibleCustomers.length === 0 && (
              <small className="form-help">
                Nenhuma cliente encontrada com essa busca.
              </small>
            )}
            {customerSearch.trim() && visibleCustomers.length > 0 && (
              <small className="form-help">
                {visibleCustomers.length} resultado(s) encontrado(s).
              </small>
            )}
          </label>

          <div className="form-help">
            <strong>O Nexus considera:</strong>
            <br />
            produtos ativos, disponibilidade em estoque, objetivo e perfil
            cadastrados no produto, sensibilidade à cafeína, ansiedade/insônia,
            produtos proibidos, observações e compras recentes da cliente
            selecionada.
          </div>

          <div className="form-help">
            A resposta é apoio interno para decisão comercial. Casos médicos,
            gestação/amamentação, doença renal, uso de medicamentos ou menores
            devem continuar sendo encaminhados para avaliação profissional
            quando necessário.
          </div>
        </div>
      </aside>
    </section>
  );
}
