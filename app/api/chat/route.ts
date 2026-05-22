import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SMC_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { buildKnowledgeBaseBlock } from "@/lib/knowledge-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-4-7";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

function configError(reason: string) {
  console.error(`[/api/chat] config error: ${reason}`);
  return new Response(
    JSON.stringify({
      error:
        "The assistant is not configured correctly. Please contact the site administrator.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

export async function POST(req: NextRequest) {
  const rawKey = process.env.ANTHROPIC_API_KEY;
  if (!rawKey) return configError("ANTHROPIC_API_KEY missing");

  const apiKey = rawKey.trim();
  // Anthropic keys are `sk-ant-` + alphanumerics + dashes/underscores. No whitespace.
  // Anything else (curl commands, full headers, multi-line blobs, quotes) is rejected
  // before reaching the SDK, where a malformed header value would otherwise throw an
  // error that includes the malformed value itself.
  if (!/^sk-ant-[A-Za-z0-9_-]+$/.test(apiKey)) {
    return configError(
      "ANTHROPIC_API_KEY does not match the expected key format",
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response(
      JSON.stringify({ error: "messages must be a non-empty list ending with a user turn." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: [
            { type: "text", text: SMC_SYSTEM_PROMPT },
            {
              type: "text",
              text: buildKnowledgeBaseBlock(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        // Log full error server-side for debugging, but NEVER echo error
        // messages to the client — they can contain env-var contents, header
        // values, or API keys. Return a generic, non-leaky string.
        console.error("[/api/chat] streaming error:", err);
        controller.enqueue(
          new TextEncoder().encode(
            "\n\n[Assistant error: response could not be completed. Check server logs.]",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
