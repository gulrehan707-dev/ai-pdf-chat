import type { ChatMessage } from "../types";

/**
 * Posts a question to the chat route and reports the answer as it streams in.
 * `onChunk` receives the full answer so far, so callers can render directly.
 * Lives outside the component tree so the accumulator is plain local state.
 */
export async function streamAnswer(
  documentId: string,
  messages: ChatMessage[],
  onChunk: (answerSoFar: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "The assistant could not respond.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    answer += decoder.decode(value, { stream: true });
    onChunk(answer);
  }

  return answer;
}
