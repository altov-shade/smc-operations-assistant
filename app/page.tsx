"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SMCLogo, SMCWordmark } from "./_components/Logo";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What's the lightning protocol during a championship event?",
  "When must event staff check in before gate opening?",
  "What do we do if a credential is lost?",
  "Who has final authority on weather delays?",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const canSend = input.trim().length > 0 && !isStreaming;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      const nextHistory = [...messages, userMsg];
      setMessages([...nextHistory, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          let detail = `Request failed (${response.status}).`;
          try {
            const data = await response.json();
            if (data?.error) detail = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m,
            ),
          );
        }
        accumulated += decoder.decode();
        if (accumulated) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m,
            ),
          );
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Response was cancelled.");
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.content.length === 0
                ? { ...m, content: `[Could not generate a response: ${message}]` }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (canSend) sendMessage(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage(input);
    }
  }

  function onCancel() {
    abortRef.current?.abort();
  }

  function onReset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-smc-line relative">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-smc-brand via-smc-gold to-smc-brand"
        />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SMCLogo className="h-11 w-9 sm:h-12 sm:w-10 shrink-0" />
            <SMCWordmark />
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 text-[11px] tracking-wide text-smc-brand border border-smc-goldSoft rounded-full px-3 py-1 bg-smc-goldSoft/40">
            <span className="h-1.5 w-1.5 rounded-full bg-smc-gold" />
            Demo · Fictional materials
          </span>
        </div>
      </header>

      <section
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        aria-live="polite"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
          {isEmpty ? <EmptyState onPick={sendMessage} /> : null}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              streaming={
                isStreaming && m.role === "assistant" && m.id === messages[messages.length - 1]?.id
              }
            />
          ))}
        </div>
      </section>

      <footer className="border-t border-smc-line bg-white sticky bottom-0">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 sm:py-4">
          {error ? (
            <p className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask about SMC operations, credentials, weather protocol…"
              className="flex-1 resize-none rounded-lg border border-smc-line bg-white px-3 py-2 text-sm text-smc-ink placeholder:text-smc-slate focus:outline-none focus:ring-2 focus:ring-smc-accent/40 focus:border-smc-accent transition min-h-[42px] max-h-40"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-lg border border-smc-line bg-smc-fog px-3 py-2 text-sm font-medium text-smc-slate hover:bg-smc-line transition"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="shrink-0 rounded-lg bg-smc-brand px-4 py-2 text-sm font-medium text-white hover:bg-smc-brandDeep disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Send
              </button>
            )}
            {!isEmpty ? (
              <button
                type="button"
                onClick={onReset}
                className="shrink-0 hidden sm:inline-flex rounded-lg border border-smc-line bg-white px-3 py-2 text-sm font-medium text-smc-slate hover:bg-smc-fog transition"
              >
                Reset
              </button>
            ) : null}
          </form>
          <p className="mt-2 text-[11px] text-smc-slate">
            Responses are grounded in uploaded SMC documents. Event staff retain final authority.
          </p>
        </div>
      </footer>
    </main>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="rounded-xl border border-smc-line bg-white px-5 py-6 sm:px-6 sm:py-7 shadow-[0_1px_0_rgba(11,31,58,0.04)]">
      <div className="flex items-center gap-2">
        <span className="h-px w-6 bg-smc-gold" aria-hidden />
        <p className="text-[10px] tracking-[0.22em] uppercase text-smc-gold font-semibold">
          Conference Operations
        </p>
      </div>
      <h2 className="mt-2 font-serif text-xl sm:text-2xl text-smc-brand">
        Ready when you are.
      </h2>
      <p className="mt-1.5 text-sm text-smc-slate">
        Ask any operational question. Answers cite the source manual, section, and a
        confidence level.
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-left rounded-lg border border-smc-line bg-smc-fog hover:bg-white hover:border-smc-brand/50 px-3 py-2 text-sm text-smc-ink transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
}) {
  const isUser = role === "user";
  const label = isUser ? "You" : "SMC Operations Assistant";

  const rendered = useMemo(() => {
    if (isUser) return null;
    return renderAssistant(content);
  }, [content, isUser]);

  return (
    <article className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-[0.16em] text-smc-slate px-1">
        {label}
      </p>
      <div
        className={[
          "rounded-xl border px-4 py-3 sm:px-5 sm:py-4 text-sm leading-relaxed",
          isUser
            ? "bg-smc-brand text-white border-smc-brand self-end max-w-[85%]"
            : "bg-white text-smc-ink border-smc-line shadow-[0_1px_0_rgba(11,31,58,0.04)]",
        ].join(" ")}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="smc-prose space-y-3">
            {rendered}
            {streaming ? <Cursor /> : null}
            {!streaming && content.length === 0 ? (
              <p className="text-smc-slate italic">Thinking…</p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function Cursor() {
  return (
    <span
      aria-hidden
      className="inline-block w-2 h-4 align-[-2px] ml-0.5 bg-smc-accent animate-pulse"
    />
  );
}

/**
 * Render the assistant's structured operational response. The system prompt
 * requests labeled sections (PRIMARY GUIDANCE SOURCE:, EVENT OPERATIONS GUIDANCE:,
 * etc.) — we surface those as section headings while leaving free-form text intact.
 */
function renderAssistant(text: string) {
  if (!text) return null;

  const SECTION_LABELS = [
    "PRIMARY GUIDANCE SOURCE",
    "EVENT OPERATIONS GUIDANCE",
    "SUPPORTING SOURCES",
    "CONFIDENCE",
    "OPEN QUESTIONS",
    "KEY PROCEDURAL LANGUAGE",
    "EVENT STAFF TAKEAWAYS",
  ];

  const lines = text.split(/\r?\n/);
  type Block = { heading: string | null; lines: string[] };
  const blocks: Block[] = [{ heading: null, lines: [] }];

  for (const raw of lines) {
    const trimmed = raw.trim();
    const headingMatch = SECTION_LABELS.find(
      (label) => trimmed === `${label}:` || trimmed.toUpperCase() === `${label}:`,
    );
    if (headingMatch) {
      blocks.push({ heading: headingMatch, lines: [] });
    } else {
      blocks[blocks.length - 1].lines.push(raw);
    }
  }

  return blocks
    .filter((b) => b.heading || b.lines.some((l) => l.trim().length > 0))
    .map((b, i) => (
      <section key={i} className="space-y-1">
        {b.heading ? (
          <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-smc-brand">
            {b.heading}
          </h3>
        ) : null}
        {renderBlockLines(b.lines)}
      </section>
    ));
}

function renderBlockLines(lines: string[]) {
  const nodes: ReactElement[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul
        key={`ul-${nodes.length}`}
        className="list-disc pl-5 space-y-1 marker:text-smc-slate"
      >
        {bullets.map((b, i) => (
          <li key={i} className="text-smc-ink">
            {b}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushBullets();
      continue;
    }
    if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.replace(/^[•\-\*]\s*/, ""));
    } else {
      flushBullets();
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-smc-ink whitespace-pre-wrap">
          {trimmed}
        </p>,
      );
    }
  }
  flushBullets();

  return nodes;
}
