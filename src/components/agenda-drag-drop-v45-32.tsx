"use client";

import { CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgendaEvent } from "@/lib/types";

type DragView = "month" | "week";

type DragPayload = {
  source_type: AgendaEvent["source_type"];
  source_id: string;
  source_date: string;
  source_due_at: string;
  source_index: number;
  view: DragView;
};

const categoryLabels: Record<
  AgendaEvent["category"],
  string
> = {
  task: "Tarefa",
  delivery: "Entrega",
  payment: "Cobrança",
  follow_up: "Retorno",
  post_sale: "Pós-venda",
  supplier: "Fornecedor",
  other: "Outro",
};

function labelFor(event: AgendaEvent) {
  return `${categoryLabels[event.category]} · ${event.title}`;
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value
    .slice(0, 10)
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
  );

  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const nextDay = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function eventTime(event: AgendaEvent) {
  if (event.source_type !== "task") {
    return "12:00";
  }

  const date = new Date(event.due_at);

  if (!Number.isFinite(date.getTime())) {
    return "12:00";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

function toDueIso(
  date: string,
  time: string,
) {
  return new Date(
    `${date}T${time || "12:00"}:00-03:00`,
  ).toISOString();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    },
  ).format(
    new Date(`${date}T12:00:00-03:00`),
  );
}

function elementFromTarget(
  target: EventTarget | null,
) {
  return target instanceof Element
    ? target
    : null;
}

export function AgendaDragDropV4532({
  events,
  enabled,
}: {
  events: AgendaEvent[];
  enabled: boolean;
}) {
  const router = useRouter();
  const payloadRef =
    useRef<DragPayload | null>(null);
  const busyRef = useRef(false);
  const suppressClickUntil =
    useRef(0);
  const hideTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [
    feedback,
    setFeedback,
  ] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const rootCandidate =
      document.querySelector<HTMLElement>(
        ".agenda-layout",
      );

    if (!rootCandidate) return;

    const root: HTMLElement = rootCandidate;

    function clearTargets() {
      root
        .querySelectorAll(
          ".v4532-agenda-drop-target",
        )
        .forEach((element) =>
          element.classList.remove(
            "v4532-agenda-drop-target",
          ),
        );

      root
        .querySelectorAll(
          ".v4532-agenda-event-dragging",
        )
        .forEach((element) =>
          element.classList.remove(
            "v4532-agenda-event-dragging",
          ),
        );

      root.classList.remove(
        "v4532-agenda-is-dragging",
      );
    }

    function findEvent(
      button: HTMLButtonElement,
    ) {
      const title =
        button.getAttribute("title") ??
        "";

      const candidates =
        events.filter(
          (event) =>
            event.status === "planned" &&
            labelFor(event) === title,
        );

      if (candidates.length <= 1) {
        return candidates[0] ?? null;
      }

      const dayText =
        button
          .closest(
            ".agenda-day-cell, .agenda-week-day",
          )
          ?.querySelector(
            ".agenda-day-number > span, :scope > button > strong",
          )
          ?.textContent?.trim() ?? "";

      const day = Number(dayText);

      if (Number.isFinite(day) && day > 0) {
        const byDay =
          candidates.filter(
            (event) =>
              Number(
                event.due_date.slice(8, 10),
              ) === day,
          );

        if (byDay.length === 1) {
          return byDay[0];
        }
      }

      return candidates[0] ?? null;
    }

    function annotate() {
      root
        .querySelectorAll<HTMLButtonElement>(
          ".agenda-event",
        )
        .forEach((button) => {
          const found =
            findEvent(button);

          if (!found) {
            button.removeAttribute(
              "draggable",
            );
            button.classList.remove(
              "v4532-agenda-draggable",
            );
            return;
          }

          button.draggable = true;
          button.classList.add(
            "v4532-agenda-draggable",
          );
        });
    }

    function viewInfo(
      element: Element,
    ):
      | {
          view: DragView;
          index: number;
        }
      | null {
      const monthCell =
        element.closest<HTMLElement>(
          ".agenda-day-cell",
        );

      if (monthCell) {
        const cells = Array.from(
          root.querySelectorAll<HTMLElement>(
            ".agenda-day-cell",
          ),
        );

        const index =
          cells.indexOf(monthCell);

        return index >= 0
          ? {
              view: "month",
              index,
            }
          : null;
      }

      const weekCell =
        element.closest<HTMLElement>(
          ".agenda-week-day",
        );

      if (weekCell) {
        const cells = Array.from(
          root.querySelectorAll<HTMLElement>(
            ".agenda-week-day",
          ),
        );

        const index =
          cells.indexOf(weekCell);

        return index >= 0
          ? {
              view: "week",
              index,
            }
          : null;
      }

      return null;
    }

    function onDragStart(
      nativeEvent: DragEvent,
    ) {
      const element =
        elementFromTarget(
          nativeEvent.target,
        );

      const button =
        element?.closest<HTMLButtonElement>(
          ".agenda-event",
        );

      if (
        !button ||
        !nativeEvent.dataTransfer
      ) {
        return;
      }

      const agendaEvent =
        findEvent(button);

      if (!agendaEvent) {
        nativeEvent.preventDefault();
        return;
      }

      const info =
        viewInfo(button);

      if (!info) {
        nativeEvent.preventDefault();
        return;
      }

      const payload: DragPayload = {
        source_type:
          agendaEvent.source_type,
        source_id:
          agendaEvent.source_id,
        source_date:
          agendaEvent.due_date,
        source_due_at:
          agendaEvent.due_at,
        source_index: info.index,
        view: info.view,
      };

      payloadRef.current =
        payload;

      nativeEvent.dataTransfer.effectAllowed =
        "move";

      nativeEvent.dataTransfer.setData(
        "application/x-candinho-agenda",
        JSON.stringify(payload),
      );

      nativeEvent.dataTransfer.setData(
        "text/plain",
        agendaEvent.title,
      );

      button.classList.add(
        "v4532-agenda-event-dragging",
      );

      root.classList.add(
        "v4532-agenda-is-dragging",
      );
    }

    function onDragOver(
      nativeEvent: DragEvent,
    ) {
      if (!payloadRef.current) {
        return;
      }

      const element =
        elementFromTarget(
          nativeEvent.target,
        );

      if (!element) return;

      const info =
        viewInfo(element);

      if (
        !info ||
        info.view !==
          payloadRef.current.view
      ) {
        return;
      }

      nativeEvent.preventDefault();

      if (nativeEvent.dataTransfer) {
        nativeEvent.dataTransfer.dropEffect =
          "move";
      }

      const target =
        info.view === "month"
          ? element.closest(
              ".agenda-day-cell",
            )
          : element.closest(
              ".agenda-week-day",
            );

      root
        .querySelectorAll(
          ".v4532-agenda-drop-target",
        )
        .forEach((item) => {
          if (item !== target) {
            item.classList.remove(
              "v4532-agenda-drop-target",
            );
          }
        });

      target?.classList.add(
        "v4532-agenda-drop-target",
      );
    }

    async function onDrop(
      nativeEvent: DragEvent,
    ) {
      const payload =
        payloadRef.current;

      if (
        !payload ||
        busyRef.current
      ) {
        return;
      }

      const element =
        elementFromTarget(
          nativeEvent.target,
        );

      if (!element) return;

      const info =
        viewInfo(element);

      if (
        !info ||
        info.view !== payload.view
      ) {
        return;
      }

      nativeEvent.preventDefault();

      const targetDate =
        addDays(
          payload.source_date,
          info.index -
            payload.source_index,
        );

      clearTargets();
      payloadRef.current = null;
      suppressClickUntil.current =
        Date.now() + 450;

      if (
        targetDate ===
        payload.source_date
      ) {
        return;
      }

      busyRef.current = true;

      try {
        const sourceEvent =
          events.find(
            (event) =>
              event.source_type ===
                payload.source_type &&
              event.source_id ===
                payload.source_id,
          );

        const supabase =
          createClient();

        const {
          error,
        } = await supabase.rpc(
          "reschedule_operational_event",
          {
            p_source_type:
              payload.source_type,
            p_source_id:
              payload.source_id,
            p_due_at: toDueIso(
              targetDate,
              sourceEvent
                ? eventTime(sourceEvent)
                : "12:00",
            ),
          },
        );

        if (error) throw error;

        setFeedback({
          tone: "success",
          text: `Reagendado para ${formatDate(
            targetDate,
          )}. A Agenda foi atualizada automaticamente.`,
        });

        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Não foi possível reagendar este compromisso.",
        });
      } finally {
        busyRef.current = false;

        if (
          hideTimer.current
        ) {
          clearTimeout(
            hideTimer.current,
          );
        }

        hideTimer.current =
          setTimeout(
            () =>
              setFeedback(null),
            3200,
          );
      }
    }

    function onDragEnd() {
      suppressClickUntil.current =
        Date.now() + 350;
      payloadRef.current = null;
      clearTargets();
    }

    function onClick(
      nativeEvent: MouseEvent,
    ) {
      if (
        Date.now() >
        suppressClickUntil.current
      ) {
        return;
      }

      const element =
        elementFromTarget(
          nativeEvent.target,
        );

      if (
        element?.closest(
          ".agenda-event",
        )
      ) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        nativeEvent.stopImmediatePropagation();
      }
    }

    annotate();

    const observer =
      new MutationObserver(
        annotate,
      );

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    root.addEventListener(
      "dragstart",
      onDragStart,
    );
    root.addEventListener(
      "dragover",
      onDragOver,
    );
    root.addEventListener(
      "drop",
      onDrop,
    );
    root.addEventListener(
      "dragend",
      onDragEnd,
    );
    root.addEventListener(
      "click",
      onClick,
      true,
    );

    return () => {
      observer.disconnect();

      root.removeEventListener(
        "dragstart",
        onDragStart,
      );
      root.removeEventListener(
        "dragover",
        onDragOver,
      );
      root.removeEventListener(
        "drop",
        onDrop,
      );
      root.removeEventListener(
        "dragend",
        onDragEnd,
      );
      root.removeEventListener(
        "click",
        onClick,
        true,
      );

      clearTargets();

      if (hideTimer.current) {
        clearTimeout(
          hideTimer.current,
        );
      }
    };
  }, [enabled, events, router]);

  if (!enabled) return null;

  return (
    <>
      <div className="agenda-drag-helper-v4532">
        <CalendarClock
          size={14}
        />
        <span>
          No computador, arraste um compromisso pendente para outro dia para reagendar.
        </span>
      </div>

      {feedback && (
        <div
          className={`agenda-drag-feedback-v4532 ${feedback.tone}`}
          role="status"
        >
          {feedback.text}
        </div>
      )}
    </>
  );
}
