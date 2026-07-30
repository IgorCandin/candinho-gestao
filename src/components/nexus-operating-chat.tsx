"use client";

import Link from "next/link";
import {
  Bot,
  Copy,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CustomerOption } from "@/lib/types";

type Action = {
  label: string;
  href: string | null;
  reason: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  assumptions?: string[];
  confidence?: string;
};

const QUICK_PROMPTS = [
  "O que eu deveria fazer agora?",
  "Quem eu deveria chamar hoje?",
  "O que está travando a operação?",
  "Tenho pouco caixa. O que merece reposição primeiro?",
  "Gere um prompt técnico para melhorar o gargalo mais repetido da operação.",
] as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function NexusOperatingChat({ customers }: { customers: CustomerOption[] }) {
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

  async function send(override?: string) {
    const current = (override ?? input).trim();
    if (!current || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: current }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nexus/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || null,
          message: current,
          history: messages.slice(-8).map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        next_actions?: Action[];
        assumptions?: string[];
        confidence?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível conversar com o Nexus agora.");
      }

      setMessages([
        ...next,
        {
          role: "assistant",
          content: String(payload.message ?? ""),
          actions: payload.next_actions ?? [],
          assumptions: payload.assumptions ?? [],
          confidence: payload.confidence,
        },
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
    <section className="nexus-chat-layout">
      <article className="panel nexus-chat-panel">
        <div className="panel-head">
          <div>
            <h2><Bot size={18} /> Conversa operacional</h2>
            <p>
              Pergunte sobre clientes, leads, vendas, cobrança, entrega, estoque, compras, parceiros ou simplesmente “o que faço agora?”.
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
            <RotateCcw size={14} /> Nova conversa
          </button>
        </div>

        <div className="panel-body nexus-chat-body">
          {messages.length === 0 ? (
            <div className="nexus-chat-welcome">
              <span className="nexus-command-orb"><Sparkles size={24} /></span>
              <div>
                <strong>O Nexus já tem o contexto do ERP</strong>
                <p>
                  Você não precisa explicar onde olhar. Ele recebe sinais, resumo comercial, estoque, leads, compras e a rotina de navegação recente.
                </p>
              </div>
              <div className="nexus-quick-prompts">
                {QUICK_PROMPTS.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => void send(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="nexus-chat-messages">
              {messages.map((item, index) => (
                <div
                  className={`nexus-chat-message ${item.role}`}
                  key={`${item.role}-${index}`}
                >
                  <small>
                    {item.role === "user" ? <UserRound size={13} /> : <Bot size={13} />}
                    {item.role === "user" ? "Você" : "Nexus"}
                  </small>
                  <p>{item.content}</p>

                  {item.role === "assistant" && item.actions?.length ? (
                    <div className="nexus-chat-actions">
                      {item.actions.map((action, actionIndex) =>
                        action.href ? (
                          <Link
                            href={action.href}
                            className="button ghost compact-button"
                            key={`${action.label}-${actionIndex}`}
                            title={action.reason ?? undefined}
                          >
                            {action.label}
                          </Link>
                        ) : null,
                      )}
                    </div>
                  ) : null}

                  {item.role === "assistant" && item.assumptions?.length ? (
                    <details className="nexus-chat-assumptions">
                      <summary>Premissas / limites da resposta</summary>
                      <ul>
                        {item.assumptions.map((assumption) => (
                          <li key={assumption}>{assumption}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {item.role === "assistant" && (
                    <button
                      className="nexus-copy-message"
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(item.content)}
                    >
                      <Copy size={12} /> Copiar
                    </button>
                  )}
                </div>
              ))}

              {loading && (
                <div className="nexus-chat-loading">
                  <LoaderCircle className="spin" size={17} />
                  Nexus cruzando os módulos da operação...
                </div>
              )}
            </div>
          )}

          {error && <p className="form-message">{error}</p>}

          <div className="nexus-chat-composer">
            <textarea
              className="textarea"
              rows={4}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ex.: quem eu deveria chamar hoje? Por que meu lucro mudou? O que eu compraria com R$ 800? O que está passando despercebido?"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  void send();
                }
              }}
            />

            <div>
              <small className="form-help">
                Ctrl + Enter envia. O Nexus observa e sugere; ações financeiras e comerciais continuam exigindo confirmação humana.
              </small>
              <button
                className="button gold"
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => void send()}
              >
                {loading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                {loading ? "Analisando" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </article>

      <aside className="panel nexus-chat-context">
        <div className="panel-head">
          <div>
            <h2>Contexto específico</h2>
            <p>Opcional. Se escolher um cliente, o Nexus inclui o CRM e os vínculos cadastrados daquela pessoa.</p>
          </div>
        </div>
        <div className="panel-body">
          <label className="field">
            <span>Pesquisar cliente</span>
            <div className="nexus-customer-search">
              <Search size={15} />
              <input
                className="input"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Nome, cidade ou telefone"
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
              <option value="">Conversa geral, operação inteira</option>
              {visibleCustomers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}{customer.city ? ` · ${customer.city}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="nexus-context-note">
            <strong>Quando houver cliente:</strong>
            <span>
              compras, leads, contatos, restrições de atendimento, vínculos com outras pessoas e afiliações de parceria entram no contexto interno.
            </span>
          </div>

          <div className="nexus-context-note safe">
            <strong>Privacidade:</strong>
            <span>
              relações servem para contexto interno. O Nexus não deve colocar numa mensagem para um cliente o histórico privado de outra pessoa relacionada.
            </span>
          </div>
        </div>
      </aside>
    </section>
  );
}
