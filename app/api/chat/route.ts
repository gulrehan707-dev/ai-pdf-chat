import { NextRequest } from "next/server";
import { supabase } from "../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Fast, cheap, and long-context enough to hold a whole PDF.
const MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
// OpenRouter falls through to the next entry when the primary is out of
// credits, rate-limited, or unavailable. These are free-tier models with
// million-token context windows.
const FALLBACK_MODELS = [
  "minimax/minimax-m3:free",
  "nvidia/nemotron-3.5-lightning:free",
];

// Keep the injected document well inside the model's context window.
const MAX_CONTEXT_CHARS = 300_000;
// Only the tail of the conversation is replayed, to keep requests small.
const MAX_HISTORY_MESSAGES = 12;
// Generous for a document answer, and small enough that OpenRouter does not
// reserve a large credit balance up front.
const MAX_ANSWER_TOKENS = 2048;

type ChatMessage = { role: "user" | "assistant"; content: string };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(filename: string, content: string) {
  const context =
    content.length > MAX_CONTEXT_CHARS
      ? content.slice(0, MAX_CONTEXT_CHARS) +
        "\n\n[... document truncated because it exceeds the context limit ...]"
      : content;

  return `You are a precise document analyst. You answer questions about a single PDF the user uploaded.

Rules:
- Answer only from the document below. Never invent facts.
- If the answer is not in the document, say so plainly and suggest what the document does cover instead.
- Quote short excerpts when they support your answer, and mention the page number when the marker is available.
- Format answers in Markdown: short paragraphs, bullet lists, and **bold** for key terms. Keep it tight.

Document name: ${filename}
--- BEGIN DOCUMENT ---
${context}
--- END DOCUMENT ---`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OPENROUTER_API_KEY is not set in .env.local" }, 500);
  }

  let documentId: string | undefined;
  let messages: ChatMessage[] = [];

  try {
    const body = await req.json();
    documentId = body.documentId;
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  if (!documentId || messages.length === 0) {
    return json({ error: "A document and a question are required." }, 400);
  }

  const { data, error } = await supabase
    .from("documents")
    .select("content, filename")
    .eq("id", documentId)
    .single();

  if (error || !data) {
    return json({ error: "That document could not be found." }, 404);
  }

  const history = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.nextUrl.origin,
        "X-Title": "Paperlens",
      },
      body: JSON.stringify({
        model: MODEL,
        models: [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)],
        stream: true,
        temperature: 0.2,
        // Without this, OpenRouter reserves the model's full output window and
        // rejects the request on accounts with a small balance.
        max_tokens: MAX_ANSWER_TOKENS,
        messages: [
          { role: "system", content: buildSystemPrompt(data.filename, data.content ?? "") },
          ...history,
        ],
      }),
    });
  } catch {
    return json({ error: "Could not reach OpenRouter." }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("OpenRouter error:", upstream.status, detail);

    const message =
      upstream.status === 401
        ? "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env.local."
        : upstream.status === 402
          ? `This OpenRouter account has no credits and "${MODEL}" is a paid model. Add credits, or set OPENROUTER_MODEL to a model ending in :free.`
          : upstream.status === 429
            ? "OpenRouter is rate-limiting this key. Wait a moment and try again."
            : `OpenRouter returned ${upstream.status}. Please try again.`;

    return json({ error: message }, 502);
  }

  // Translate OpenRouter's SSE frames into a plain UTF-8 text stream so the
  // browser can append chunks straight to the message being rendered.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const sseToText = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      // The final element may be a partial line; hold it for the next chunk.
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        // OpenRouter sends `: OPENROUTER PROCESSING` keep-alive comments.
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload);
          const text = parsed?.choices?.[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // Ignore frames that arrive malformed mid-stream.
        }
      }
    },
  });

  return new Response(upstream.body.pipeThrough(sseToText), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
