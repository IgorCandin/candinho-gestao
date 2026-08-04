"use client";

import {
  Bot,
  Check,
  ChevronRight,
  Clock3,
  CornerDownLeft,
  History,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  BankNexusHistoryItem,
  BankNexusPlan,
} from "@/lib/bank-nexus-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: BankNexusPlan;
  originalMessage?: string;
  batchId?: string;
  status?: "draft" | "applied" | "undone";
};

const examples = [
  "Nubank Igor esse mês ficou 843,27 e BB Igor 110.",
  "Recebi o salário Igor de 3.000 hoje. O vale ainda não caiu.",
  "Adia o Ian este mês.",
  "Tudo igual ao mês passado, só o Nubank Igor mudou para 950.",
];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function BankNexusChat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Me fale como fechou o mês. Eu organizo as alterações, mostro a prévia e só mexo no Bank depois da sua confirmação.",
    },
  ]);
  const [history, setHistory] = useState<BankNexusHistoryItem[]>([]);
  const [sending, setSending] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const compactHistory = useMemo(() => history.slice(0, 8), [history]);

  async function loadHistory() {
    const response = await fetch("/api/bank/nexus/history", {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) return;

    const payload = (await response.json()) as {
      history?: BankNexusHistoryItem[];
    };

    setHistory(Array.isArray(payload.history) ? payload.history : []);
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, sending]);

  function conversationHistory() {
    return messages
      .filter((item) => item.id !== "welcome")
      .slice(-8)
      .map((item) => ({
        role: item.role,
        text: item.text,
      }));
  }

  async function submit(message: string) {
    const clean = message.trim();
    if (!clean || sending) return;

    setError(null);
    setDraft("");

    const userMessage: ChatMessage = {
      id: id(),
      role: "user",
      text: clean,
    };

    setMessages((current) => [...current, userMessage]);
    setSending(true);

    try {
      const response = await fetch("/api/bank/nexus/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: clean,
          history: conversationHistory(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            code?: string;
            plan?: BankNexusPlan;
          }
        | null;

      if (!response.ok || !payload?.plan) {
        const fallback =
          payload?.code === "OPENAI_NOT_CONFIGURED"
            ? "O Nexus Bank está instalado, mas falta configurar a chave da IA no servidor."
            : payload?.error ||
              "Não consegui interpretar essa atualização agora.";

        setError(fallback);
        setMessages((current) => [
          ...current,
          {
            id: id(),
            role: "assistant",
            text: fallback,
          },
        ]);
        return;
      }

      const plan = payload.plan;

      setMessages((current) => [
        ...current,
        {
          id: id(),
          role: "assistant",
          text: plan.reply,
          plan,
          originalMessage: clean,
          status: "draft",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await submit(draft);
  }

  async function apply(message: ChatMessage) {
    if (
      !message.plan ||
      !message.originalMessage ||
      message.status !== "draft"
    ) {
      return;
    }

    setApplyingId(message.id);
    setError(null);

    try {
      const response = await fetch("/api/bank/nexus/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.originalMessage,
          summary: message.plan.summary,
          actions: message.plan.actions,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; batchId?: string }
        | null;

      if (!response.ok || !payload?.batchId) {
        setError(
          payload?.error ||
            "Não foi possível aplicar as alterações.",
        );
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                status: "applied",
                batchId: payload.batchId,
              }
            : item,
        ),
      );

      await loadHistory();
    } finally {
      setApplyingId(null);
    }
  }

  async function undo(message: ChatMessage) {
    if (!message.batchId || message.status !== "applied") return;

    setUndoingId(message.id);
    setError(null);

    try {
      const response = await fetch("/api/bank/nexus/undo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId: message.batchId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(
          payload?.error ||
            "Não foi possível desfazer essa atualização.",
        );
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, status: "undone" }
            : item,
        ),
      );

      await loadHistory();
    } finally {
      setUndoingId(null);
    }
  }

  function editAgain(message: ChatMessage) {
    setDraft(message.originalMessage ?? "");
    textareaRef.current?.focus();
  }

  return (
    <div className="bank-nexus-grid">
      <section className="bank-nexus-chat-panel">
        <div className="bank-nexus-chat-head">
          <div className="bank-nexus-avatar">
            <Bot size={22} />
          </div>

          <div>
            <strong>Nexus Bank</strong>
            <span>Fale para organizar. Clique para confirmar.</span>
          </div>

          <span className="bank-nexus-safe">
            <ShieldCheck size={14} />
            Preview antes de alterar
          </span>
        </div>

        <div className="bank-nexus-example-row">
          {examples.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setDraft(example);
                textareaRef.current?.focus();
              }}
            >
              <Sparkles size={13} />
              {example}
            </button>
          ))}
        </div>

        <div className="bank-nexus-messages">
          {messages.map((message) => (
            <div
              className={`bank-nexus-message ${message.role}`}
              key={message.id}
            >
              <div className="bank-nexus-message-icon">
                {message.role === "assistant" ? (
                  <Bot size={16} />
                ) : (
                  <UserRound size={16} />
                )}
              </div>

              <div className="bank-nexus-bubble">
                <p>{message.text}</p>

                {message.plan && (
                  <div className="bank-nexus-preview">
                    <div className="bank-nexus-preview-head">
                      <div>
                        <strong>Prévia</strong>
                        <span>{message.plan.summary}</span>
                      </div>

                      {message.status === "applied" ? (
                        <span className="badge green">
                          <Check size={13} />
                          Aplicado
                        </span>
                      ) : message.status === "undone" ? (
                        <span className="badge gray">
                          <RotateCcw size={13} />
                          Desfeito
                        </span>
                      ) : (
                        <span className="badge gold">
                          {message.plan.actions.length} alteração(ões)
                        </span>
                      )}
                    </div>

                    <div className="bank-nexus-action-list">
                      {message.plan.actions.map((action, index) => (
                        <div
                          className="bank-nexus-action"
                          key={`${action.type}-${action.entity_id}-${index}`}
                        >
                          <div>
                            <strong>{action.label}</strong>
                            <span>
                              {action.entity_name}
                              {action.reason
                                ? ` · ${action.reason}`
                                : ""}
                            </span>
                          </div>

                          <div className="bank-nexus-change">
                            {action.before && (
                              <>
                                <span>{action.before}</span>
                                <ChevronRight size={14} />
                              </>
                            )}
                            <strong>{action.after}</strong>
                          </div>

                          {action.requires_attention && (
                            <TriangleAlert
                              className="bank-nexus-attention"
                              size={17}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {message.plan.warnings.length > 0 && (
                      <div className="bank-nexus-warnings">
                        <TriangleAlert size={15} />
                        <div>
                          {message.plan.warnings.map((warning) => (
                            <span key={warning}>{warning}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bank-nexus-preview-actions">
                      {message.status === "draft" && (
                        <>
                          <button
                            className="button ghost"
                            type="button"
                            onClick={() => editAgain(message)}
                          >
                            <X size={15} />
                            Corrigir
                          </button>

                          <button
                            className="button gold"
                            type="button"
                            disabled={
                              !message.plan.can_apply ||
                              message.plan.actions.length === 0 ||
                              applyingId === message.id
                            }
                            onClick={() => void apply(message)}
                          >
                            {applyingId === message.id ? (
                              <LoaderCircle
                                className="bank-nexus-spin"
                                size={16}
                              />
                            ) : (
                              <Check size={16} />
                            )}
                            Confirmar tudo
                          </button>
                        </>
                      )}

                      {message.status === "applied" && (
                        <button
                          className="button ghost"
                          type="button"
                          disabled={undoingId === message.id}
                          onClick={() => void undo(message)}
                        >
                          {undoingId === message.id ? (
                            <LoaderCircle
                              className="bank-nexus-spin"
                              size={16}
                            />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                          Desfazer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="bank-nexus-message assistant">
              <div className="bank-nexus-message-icon">
                <Bot size={16} />
              </div>
              <div className="bank-nexus-bubble bank-nexus-thinking">
                <LoaderCircle
                  className="bank-nexus-spin"
                  size={16}
                />
                Conferindo o Bank e montando a prévia...
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <div className="bank-nexus-error">
            <TriangleAlert size={16} />
            {error}
          </div>
        )}

        <form className="bank-nexus-composer" onSubmit={onSubmit}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void submit(draft);
              }
            }}
            placeholder="Ex.: Nubank Igor 843,27; salário já caiu 3.000; adia Ian..."
            rows={3}
          />

          <div className="bank-nexus-composer-bottom">
            <span>
              <CornerDownLeft size={13} />
              Enter envia · Shift+Enter quebra linha
            </span>

            <button
              className="button gold"
              type="submit"
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <LoaderCircle
                  className="bank-nexus-spin"
                  size={16}
                />
              ) : (
                <Send size={16} />
              )}
              Enviar
            </button>
          </div>
        </form>
      </section>

      <aside className="bank-nexus-history-panel">
        <div className="bank-nexus-history-head">
          <History size={17} />
          <div>
            <strong>Últimas atualizações</strong>
            <span>Auditoria do que o Nexus aplicou.</span>
          </div>
        </div>

        {compactHistory.length === 0 ? (
          <div className="bank-nexus-history-empty">
            Nenhuma atualização pelo Nexus ainda.
          </div>
        ) : (
          <div className="bank-nexus-history-list">
            {compactHistory.map((item) => (
              <div className="bank-nexus-history-item" key={item.id}>
                <div>
                  <strong>
                    {item.summary || "Atualização do Bank"}
                  </strong>
                  <span>
                    <Clock3 size={12} />
                    {formatDate(item.createdAt)} · {item.actionCount} ação(ões)
                  </span>
                </div>

                <span
                  className={`badge ${
                    item.status === "applied" ? "green" : "gray"
                  }`}
                >
                  {item.status === "applied"
                    ? "Aplicado"
                    : "Desfeito"}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
