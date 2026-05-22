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
import { SMCLogo } from "./_components/Logo";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUERIES: { label: string; query: string }[] = [
  {
    label: "Lightning protocol",
    query: "What is the lightning protocol during a championship event?",
  },
  {
    label: "Lost credential",
    query: "What is the procedure if an event credential is lost?",
  },
  {
    label: "Weather authority",
    query: "Who has final authority on weather delays and venue evacuation?",
  },
  {
    label: "Staff check-in",
    query: "When must event staff check in before gate opening?",
  },
];

const INDEXED_SOURCES = [
  { tier: "Primary", name: "Championship Operations Manual" },
  { tier: "Secondary", name: "Weather & Emergency Guide" },
  { tier: "Secondary", name: "Credentialing Policies" },
  { tier: "Secondary", name: "Fan Experience Standards" },
];

const RESPONSE_FIELDS = [
  "Primary Guidance Source",
  "Event Operations Guidance",
  "Supporting Sources",
  "Confidence Rating",
  "Key Procedural Language",
  "Event Staff Takeaways",
];

const TOPIC_COVERAGE = [
  "Lightning Policy",
  "Shelter Procedures",
  "Weather Authority",
  "Venue Access",
  "Media Credentialing",
  "Lost Credential",
  "Restricted Areas",
  "Guest Services",
  "Accessibility",
  "Game Day Standards",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const responseAreaRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          setError("Query cancelled.");
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

  useEffect(() => {
    if (!responseAreaRef.current) return;
    responseAreaRef.current.scrollTo({
      top: responseAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

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
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;
  const queryCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );

  return (
    <main className="min-h-screen flex flex-col">
      <div className="smc-backdrop" aria-hidden />
      <div className="smc-grid" aria-hidden />

      {/* Top hairline accent */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent"
      />

      {/* Header */}
      <header className="border-b border-smc-line">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <SMCLogo className="h-12 w-10 shrink-0 drop-shadow-[0_2px_8px_rgba(212,175,92,0.18)]" />
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase text-smc-gold font-semibold">
                Southern Metro Conference
              </p>
              <h1 className="font-display text-[26px] sm:text-[30px] leading-none text-smc-cream mt-1 tracking-tight">
                Operations Assistant
              </h1>
            </div>
          </div>
          <StatusRail queryCount={queryCount} streaming={isStreaming} />
        </div>
      </header>

      {/* Sticky command bar */}
      <section className="sticky top-0 z-20 border-b border-smc-line bg-smc-canvas/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-4">
          <form
            onSubmit={onSubmit}
            className="flex items-stretch gap-2 sm:gap-3"
          >
            <div className="relative flex-1">
              <SearchGlyph className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-smc-creamFaint" />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Query operational guidance — credentialing, weather, venue access, fan experience…"
                className="w-full resize-none rounded-md bg-smc-surface/70 border border-smc-lineStrong pl-11 pr-4 py-3 text-[14px] text-smc-cream placeholder:text-smc-creamFaint focus:outline-none focus:border-smc-gold/60 focus:ring-2 focus:ring-smc-goldGlow transition shadow-innerGold min-h-[46px] max-h-32 leading-snug"
                disabled={isStreaming}
                aria-label="Operational query"
              />
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-md border border-smc-lineStrong bg-smc-surfaceMuted px-4 text-[12px] font-semibold tracking-[0.16em] uppercase text-smc-creamMuted hover:text-smc-cream hover:border-smc-cream/30 transition"
              >
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="shrink-0 rounded-md bg-smc-gold px-5 text-[12px] font-semibold tracking-[0.16em] uppercase text-smc-brand hover:bg-smc-goldBright disabled:opacity-30 disabled:cursor-not-allowed transition shadow-[0_8px_20px_-8px_rgba(212,175,92,0.55)]"
              >
                Query
              </button>
            )}
            {!isEmpty && !isStreaming ? (
              <button
                type="button"
                onClick={onReset}
                title="Clear session"
                className="shrink-0 rounded-md border border-smc-lineStrong bg-smc-surfaceMuted px-3 text-smc-creamFaint hover:text-smc-cream hover:border-smc-cream/30 transition"
                aria-label="Clear session"
              >
                <ResetGlyph className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </form>

          <QuickQueries onPick={sendMessage} disabled={isStreaming} />
        </div>
      </section>

      {error ? (
        <div className="mx-auto max-w-5xl w-full px-5 sm:px-8 pt-3">
          <p className="rounded-md border border-smc-confEsc/30 bg-smc-confEsc/10 px-3 py-2 text-[12px] text-smc-confEsc">
            {error}
          </p>
        </div>
      ) : null}

      {/* Response area */}
      <section
        ref={responseAreaRef}
        className="flex-1 overflow-y-auto"
        aria-live="polite"
      >
        <div className="mx-auto max-w-5xl w-full px-5 sm:px-8 py-6 sm:py-8 space-y-6">
          {isEmpty ? <OperationsBrief /> : null}
          {!isEmpty
            ? messages.map((m, idx) => {
                if (m.role === "user") {
                  const queryNumber =
                    messages
                      .slice(0, idx + 1)
                      .filter((x) => x.role === "user").length;
                  return (
                    <QueryHeader
                      key={m.id}
                      number={queryNumber}
                      content={m.content}
                    />
                  );
                }
                const isLast = idx === messages.length - 1;
                return (
                  <ResponsePanel
                    key={m.id}
                    content={m.content}
                    streaming={isStreaming && isLast}
                  />
                );
              })
            : null}
        </div>
      </section>

      <footer className="border-t border-smc-line">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-3 flex items-center justify-between gap-3 text-[10px] tracking-[0.18em] uppercase text-smc-creamDim">
          <span>SMC OPS · v1.0 · Demo Build</span>
          <span className="hidden sm:inline">
            Event staff retain final operational authority
          </span>
        </div>
      </footer>
    </main>
  );
}

function StatusRail({
  queryCount,
  streaming,
}: {
  queryCount: number;
  streaming: boolean;
}) {
  return (
    <div className="hidden md:flex items-center gap-5 text-[10px] tracking-[0.18em] uppercase">
      <div className="flex items-center gap-2">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            streaming ? "bg-smc-gold animate-pulse" : "bg-smc-confHigh",
          ].join(" ")}
        />
        <span className="text-smc-creamMuted font-medium">
          {streaming ? "Processing" : "System Active"}
        </span>
      </div>
      <span className="h-3 w-px bg-smc-line" aria-hidden />
      <Stat label="Manuals" value="4" />
      <span className="h-3 w-px bg-smc-line" aria-hidden />
      <Stat label="Queries" value={String(queryCount).padStart(2, "0")} />
      <span className="h-3 w-px bg-smc-line" aria-hidden />
      <span className="text-smc-creamDim">Demo Build</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-smc-creamDim">{label}</span>
      <span className="text-smc-cream font-semibold font-mono">{value}</span>
    </div>
  );
}

function QuickQueries({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] tracking-[0.18em] uppercase text-smc-creamDim shrink-0">
        Common
      </span>
      {QUICK_QUERIES.map((q) => (
        <button
          key={q.label}
          type="button"
          onClick={() => onPick(q.query)}
          disabled={disabled}
          className="text-[11px] px-2.5 py-1 rounded border border-smc-lineStrong bg-smc-surfaceMuted/60 text-smc-creamMuted hover:text-smc-gold hover:border-smc-gold/45 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}

function OperationsBrief() {
  return (
    <article className="relative rounded-lg bg-smc-surface/60 border border-smc-line shadow-panel overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/40 to-transparent"
      />

      {/* Subtle shield watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-10 opacity-[0.06] select-none"
      >
        <SMCLogo className="h-64 w-56" />
      </div>

      <div className="px-5 sm:px-7 py-5 border-b border-smc-line flex items-center justify-between gap-4 relative">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-smc-gold" aria-hidden />
          <p className="text-[10px] tracking-[0.24em] uppercase text-smc-gold font-semibold">
            Operations Brief
          </p>
          <span className="text-[10px] tracking-[0.18em] uppercase text-smc-creamDim font-mono">
            · SMC / OPS / RETRIEVAL
          </span>
        </div>
        <span className="text-[10px] tracking-[0.2em] uppercase text-smc-creamFaint">
          Standing by
        </span>
      </div>

      <div className="relative px-5 sm:px-7 py-7 grid lg:grid-cols-[1.1fr_1fr_1fr] gap-x-8 gap-y-7">
        <div>
          <BriefHeading count={INDEXED_SOURCES.length}>Indexed Sources</BriefHeading>
          <ul className="mt-3 space-y-2.5">
            {INDEXED_SOURCES.map((s) => (
              <li
                key={s.name}
                className="flex items-baseline gap-3 text-[13px] leading-snug"
              >
                <span
                  className={[
                    "text-[9px] tracking-[0.2em] uppercase shrink-0 w-[68px] font-semibold font-mono",
                    s.tier === "Primary" ? "text-smc-gold" : "text-smc-creamDim",
                  ].join(" ")}
                >
                  {s.tier}
                </span>
                <span className="text-smc-cream">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <BriefHeading count={RESPONSE_FIELDS.length}>Response Format</BriefHeading>
          <ul className="mt-3 space-y-2.5">
            {RESPONSE_FIELDS.map((f) => (
              <li
                key={f}
                className="flex items-baseline gap-3 text-[13px] text-smc-creamMuted leading-snug"
              >
                <span className="text-smc-gold/80 text-[10px]">▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <BriefHeading count={TOPIC_COVERAGE.length}>Topic Coverage</BriefHeading>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TOPIC_COVERAGE.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded border border-smc-line bg-smc-surfaceMuted/60 text-smc-creamMuted"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative px-5 sm:px-7 py-3 border-t border-smc-line bg-smc-canvasDeep/40 text-[11px] text-smc-creamFaint flex items-center gap-2 flex-wrap">
        <KeyboardHint>↩</KeyboardHint>
        <span>Submit query</span>
        <span className="text-smc-creamDim">·</span>
        <KeyboardHint>⇧↩</KeyboardHint>
        <span>New line</span>
        <span className="ml-auto text-smc-creamDim hidden md:inline tracking-wide">
          Fictional SMC materials · portfolio demo
        </span>
      </div>
    </article>
  );
}

function BriefHeading({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <p className="text-[10px] tracking-[0.24em] uppercase text-smc-creamFaint font-semibold">
        {children}
      </p>
      {typeof count === "number" ? (
        <span className="text-[10px] font-mono text-smc-gold/70">
          [{String(count).padStart(2, "0")}]
        </span>
      ) : null}
    </div>
  );
}

function KeyboardHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded border border-smc-lineStrong bg-smc-surfaceMuted/70 text-[10px] font-mono text-smc-creamMuted">
      {children}
    </kbd>
  );
}

function QueryHeader({
  number,
  content,
}: {
  number: number;
  content: string;
}) {
  const tag = `Q-${String(number).padStart(2, "0")}`;
  return (
    <div className="flex items-baseline gap-4 pt-1">
      <span className="text-[10px] tracking-[0.24em] uppercase text-smc-gold font-semibold shrink-0 font-mono">
        {tag}
      </span>
      <span className="h-px w-6 bg-smc-lineGold shrink-0 translate-y-[-3px]" aria-hidden />
      <p className="text-[15px] sm:text-base text-smc-cream font-medium leading-snug whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}

function ResponsePanel({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const parsed = useMemo(() => parseResponse(content), [content]);

  return (
    <article className="relative rounded-lg bg-smc-surface/85 border border-smc-line shadow-panel overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/45 to-transparent"
      />

      <div className="px-5 sm:px-7 py-4 border-b border-smc-line flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-smc-gold" aria-hidden />
          <p className="text-[10px] tracking-[0.24em] uppercase text-smc-gold font-semibold">
            Operational Response
          </p>
        </div>
        {parsed.confidence ? (
          <ConfidenceChip value={parsed.confidence} />
        ) : streaming ? (
          <span className="text-[10px] tracking-[0.2em] uppercase text-smc-creamFaint animate-pulse">
            Synthesizing
          </span>
        ) : null}
      </div>

      <div className="px-5 sm:px-7 py-6 smc-prose">
        {parsed.sections.length === 0 && streaming ? (
          <p className="text-smc-creamFaint italic">
            Retrieving operational guidance…
          </p>
        ) : null}
        <div className="space-y-6">
          {parsed.sections.map((s, i) => (
            <ResponseSection key={i} section={s} />
          ))}
        </div>
        {streaming ? <Cursor /> : null}
        {!streaming && content.length === 0 ? (
          <p className="text-smc-creamFaint italic">No response.</p>
        ) : null}
      </div>
    </article>
  );
}

function ConfidenceChip({ value }: { value: string }) {
  const v = value.toUpperCase();
  const map: Record<
    string,
    { dot: string; text: string; border: string; bg: string }
  > = {
    HIGH: {
      dot: "bg-smc-confHigh",
      text: "text-smc-confHigh",
      border: "border-smc-confHigh/35",
      bg: "bg-smc-confHigh/10",
    },
    MEDIUM: {
      dot: "bg-smc-gold",
      text: "text-smc-gold",
      border: "border-smc-gold/40",
      bg: "bg-smc-gold/10",
    },
    LOW: {
      dot: "bg-smc-confLow",
      text: "text-smc-confLow",
      border: "border-smc-confLow/35",
      bg: "bg-smc-confLow/10",
    },
    ESCALATE: {
      dot: "bg-smc-confEsc",
      text: "text-smc-confEsc",
      border: "border-smc-confEsc/40",
      bg: "bg-smc-confEsc/10",
    },
  };
  const c = map[v] ?? {
    dot: "bg-smc-creamFaint",
    text: "text-smc-creamMuted",
    border: "border-smc-lineStrong",
    bg: "bg-smc-surfaceMuted/40",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1",
        "text-[10px] tracking-[0.22em] uppercase font-semibold font-mono",
        c.border,
        c.bg,
        c.text,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", c.dot].join(" ")} />
      Confidence · {v}
    </span>
  );
}

function Cursor() {
  return (
    <span
      aria-hidden
      className="inline-block w-[6px] h-[14px] align-[-2px] ml-0.5 bg-smc-gold animate-pulse"
    />
  );
}

/* ---------- Response parsing & rendering ---------- */

type ParsedSection = {
  heading: string | null;
  lines: string[];
};

type ParsedResponse = {
  confidence?: string;
  sections: ParsedSection[];
};

const SECTION_LABELS = [
  "PRIMARY GUIDANCE SOURCE",
  "EVENT OPERATIONS GUIDANCE",
  "SUPPORTING SOURCES",
  "CONFIDENCE",
  "OPEN QUESTIONS",
  "KEY PROCEDURAL LANGUAGE",
  "EVENT STAFF TAKEAWAYS",
] as const;

function parseResponse(text: string): ParsedResponse {
  if (!text) return { sections: [] };
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [{ heading: null, lines: [] }];

  for (const raw of lines) {
    const trimmed = raw.trim();
    const heading = SECTION_LABELS.find(
      (label) => trimmed === `${label}:` || trimmed.toUpperCase() === `${label}:`,
    );
    if (heading) {
      sections.push({ heading, lines: [] });
    } else {
      sections[sections.length - 1].lines.push(raw);
    }
  }

  // Extract confidence value and drop the section
  let confidence: string | undefined;
  const out: ParsedSection[] = [];
  for (const s of sections) {
    if (s.heading === "CONFIDENCE") {
      const first = s.lines
        .map((l) => l.trim())
        .find((l) => l.length > 0);
      if (first) {
        confidence = first
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .split(/[\s/]+/)[0]
          .trim();
      }
      continue;
    }
    if (s.heading === null && s.lines.every((l) => l.trim().length === 0))
      continue;
    out.push(s);
  }

  return { confidence, sections: out };
}

function ResponseSection({ section }: { section: ParsedSection }) {
  if (section.heading === "PRIMARY GUIDANCE SOURCE") {
    const value = section.lines.find((l) => l.trim().length > 0)?.trim() ?? "";
    return (
      <div>
        <SectionLabel>{section.heading}</SectionLabel>
        <p className="font-display text-[20px] sm:text-[22px] leading-tight text-smc-cream mt-1.5">
          {value || "—"}
        </p>
      </div>
    );
  }

  if (section.heading === "SUPPORTING SOURCES") {
    const subs = splitSupportingSources(section.lines);
    return (
      <div>
        <SectionLabel>{section.heading}</SectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {subs.map((sub, i) => (
            <div
              key={i}
              className="rounded-md border border-smc-line bg-smc-canvasDeep/40 px-4 py-3"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-smc-gold font-mono font-semibold">
                {sub.label}
              </p>
              <p className="text-[13px] text-smc-cream mt-1 font-medium">
                {sub.citation || "—"}
              </p>
              {sub.body ? (
                <p className="text-[13px] text-smc-creamMuted mt-2 leading-relaxed">
                  {sub.body}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.heading === "KEY PROCEDURAL LANGUAGE") {
    const items = extractBullets(section.lines);
    return (
      <div>
        <SectionLabel>{section.heading}</SectionLabel>
        <ul className="mt-3 space-y-2.5">
          {items.map((q, i) => (
            <li
              key={i}
              className="border-l-2 border-smc-gold/60 pl-4 py-1 text-[13.5px] italic text-smc-creamMuted leading-relaxed"
            >
              “{q.replace(/^[“"']|[”"']$/g, "")}”
            </li>
          ))}
          {items.length === 0 ? (
            <ParagraphLines lines={section.lines} />
          ) : null}
        </ul>
      </div>
    );
  }

  if (section.heading === "OPEN QUESTIONS") {
    const items = extractBullets(section.lines);
    if (items.length === 0 && !section.lines.some((l) => l.trim())) return null;
    return (
      <div className="rounded-md border border-smc-confLow/30 bg-smc-confLow/5 px-4 py-3">
        <SectionLabel tone="warn">{section.heading}</SectionLabel>
        <ul className="mt-2 space-y-1.5 list-disc pl-5 marker:text-smc-confLow text-[13.5px] text-smc-creamMuted">
          {items.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
          {items.length === 0 ? (
            <ParagraphLines lines={section.lines} />
          ) : null}
        </ul>
      </div>
    );
  }

  if (section.heading === "EVENT STAFF TAKEAWAYS") {
    const items = extractBullets(section.lines);
    return (
      <div>
        <SectionLabel>{section.heading}</SectionLabel>
        <ol className="mt-3 space-y-2">
          {items.map((t, i) => (
            <li
              key={i}
              className="flex items-baseline gap-3 text-[13.5px] text-smc-cream leading-relaxed"
            >
              <span className="text-[10px] font-mono text-smc-gold shrink-0 w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{t}</span>
            </li>
          ))}
          {items.length === 0 ? (
            <ParagraphLines lines={section.lines} />
          ) : null}
        </ol>
      </div>
    );
  }

  if (section.heading === "EVENT OPERATIONS GUIDANCE") {
    const items = extractBullets(section.lines);
    return (
      <div>
        <SectionLabel>{section.heading}</SectionLabel>
        <ul className="mt-3 space-y-2">
          {items.map((b, i) => (
            <li
              key={i}
              className="flex items-baseline gap-3 text-[14px] text-smc-cream leading-relaxed"
            >
              <span className="text-smc-gold mt-1 shrink-0" aria-hidden>
                ◆
              </span>
              <span>{b}</span>
            </li>
          ))}
          {items.length === 0 ? (
            <ParagraphLines lines={section.lines} />
          ) : null}
        </ul>
      </div>
    );
  }

  // Preface text or unknown section
  if (!section.heading) {
    const hasContent = section.lines.some((l) => l.trim().length > 0);
    if (!hasContent) return null;
    return (
      <div>
        <ParagraphLines lines={section.lines} />
      </div>
    );
  }

  return (
    <div>
      <SectionLabel>{section.heading}</SectionLabel>
      <div className="mt-2">
        <ParagraphLines lines={section.lines} />
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <h3
      className={[
        "text-[10px] font-semibold tracking-[0.22em] uppercase font-mono",
        tone === "warn" ? "text-smc-confLow" : "text-smc-gold",
      ].join(" ")}
    >
      {children}
    </h3>
  );
}

function ParagraphLines({ lines }: { lines: string[] }) {
  const nodes: ReactElement[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul
        key={`ul-${nodes.length}`}
        className="space-y-1.5 mt-1 text-[13.5px] text-smc-creamMuted"
      >
        {bullets.map((b, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span className="text-smc-gold/70 text-[10px]">▸</span>
            <span>{b}</span>
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
    if (
      trimmed.startsWith("•") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      bullets.push(trimmed.replace(/^[•\-\*]\s*/, ""));
    } else {
      flushBullets();
      nodes.push(
        <p
          key={`p-${nodes.length}`}
          className="text-[13.5px] text-smc-creamMuted whitespace-pre-wrap leading-relaxed"
        >
          {trimmed}
        </p>,
      );
    }
  }
  flushBullets();
  return <>{nodes}</>;
}

function extractBullets(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("•") || t.startsWith("- ") || t.startsWith("* ")) {
      out.push(t.replace(/^[•\-\*]\s*/, ""));
    }
  }
  return out;
}

type SubSource = { label: string; citation: string; body: string };

function splitSupportingSources(lines: string[]): SubSource[] {
  const subs: SubSource[] = [];
  let current: SubSource | null = null;
  let mode: "citation" | "guidance" | "body" = "citation";

  for (const raw of lines) {
    const t = raw.trim();
    const labelMatch = t.match(/^SOURCE\s*\d+\s*:?$/i);
    if (labelMatch) {
      if (current) subs.push(current);
      current = { label: t.replace(/:$/, ""), citation: "", body: "" };
      mode = "citation";
      continue;
    }
    if (!current) continue;
    if (/^GUIDANCE\s*:?$/i.test(t)) {
      mode = "body";
      continue;
    }
    if (!t) continue;
    if (mode === "citation" && !current.citation) {
      current.citation = t.replace(/^\[|\]$/g, "");
      mode = "guidance";
    } else {
      current.body = current.body ? `${current.body} ${t}` : t;
    }
  }
  if (current) subs.push(current);
  return subs;
}

/* ---------- Icons ---------- */

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10.5 10.5L13.5 13.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M3 3v4h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 9a5 5 0 1 0 1-4.5L3 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
