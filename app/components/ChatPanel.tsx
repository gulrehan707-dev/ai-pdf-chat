"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { AlertIcon, BackIcon, FileIcon, LogoMark, SendIcon, StopIcon } from "./icons";
import { streamAnswer } from "../lib/streamAnswer";
import type { ChatMessage, DocumentMeta } from "../types";

const SUGGESTIONS = [
  "Summarise this document in five bullet points.",
  "What are the key dates and deadlines?",
  "List every obligation or requirement mentioned.",
  "What is missing or left ambiguous here?",
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatPanel({
  doc,
  onReset,
}: {
  doc: DocumentMeta;
  onReset: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  // Grow the composer with its content, up to a fixed ceiling. When it is empty
  // the inline height is cleared so the `rows={1}` height applies, rather than
  // measuring a layout that has not settled yet.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    if (!input) {
      el.style.height = "";
      return;
    }

    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || streaming) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];

    setInput("");
    setError(null);
    // The empty assistant message is the target the stream writes into.
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = await streamAnswer(
        doc.id,
        history,
        (soFar) =>
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: soFar };
            return next;
          }),
        controller.signal
      );

      if (!answer.trim()) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "I could not produce an answer for that. Try rephrasing the question.",
          };
          return next;
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Drop a stopped answer if nothing had streamed in yet.
        setMessages((prev) =>
          prev[prev.length - 1]?.content.trim() ? prev : prev.slice(0, -1)
        );
      } else {
        setMessages((prev) => prev.slice(0, -1));
        setError((err as Error).message);
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const lastIsStreaming =
    streaming && messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-white/8 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-iris-500 to-orchid-500 text-white">
            <FileIcon className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-mist-100">{doc.filename}</h1>
            <p className="text-xs text-mist-600">
              {doc.pages} {doc.pages === 1 ? "page" : "pages"} · {formatSize(doc.size)} ·{" "}
              {(doc.characters / 1000).toFixed(1)}k characters read
            </p>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-mist-300 transition-colors hover:bg-white/10 hover:text-mist-100"
          >
            <BackIcon className="size-3.5" />
            <span className="hidden sm:inline">New PDF</span>
          </button>
        </div>
      </header>

      <div className="scroll-slim flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 py-8">
          {messages.length === 0 ? (
            <div className="animate-rise flex flex-col items-center py-10 text-center">
              <LogoMark className="size-12" />
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-mist-100">
                Your document is ready
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist-500">
                Ask anything about it, or start with one of these.
              </p>

              <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="ring-hairline cursor-pointer rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 text-left text-[0.8125rem] leading-relaxed text-mist-300 transition-all hover:border-iris-500/40 hover:bg-white/[0.05] hover:text-mist-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, i) =>
                message.role === "user" ? (
                  <div key={i} className="animate-rise flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-iris-500 to-iris-600 px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-white">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="animate-fade flex gap-3.5">
                    <LogoMark className="mt-0.5 size-7 shrink-0" />
                    <div className="min-w-0 flex-1 pt-0.5">
                      {message.content ? (
                        <>
                          <Markdown>{message.content}</Markdown>
                          {lastIsStreaming && i === messages.length - 1 && (
                            <span className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-iris-400" />
                          )}
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 py-1.5">
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              className="size-1.5 animate-bounce rounded-full bg-iris-400"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {error && (
            <p className="animate-fade mt-6 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/8 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-5 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="ring-hairline flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-900/80 p-2 transition-colors focus-within:border-iris-500/50"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about this document…"
              className="scroll-slim max-h-[180px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] text-mist-100 placeholder:text-mist-600 focus:outline-none"
            />

            {streaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop generating"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist-300 transition-colors hover:bg-white/10 hover:text-mist-100"
              >
                <StopIcon className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-iris-500 to-orchid-500 text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:from-ink-700 disabled:to-ink-700 disabled:text-mist-600"
              >
                <SendIcon className="size-4" />
              </button>
            )}
          </form>

          <p className="mt-2.5 text-center text-[0.6875rem] text-mist-600">
            Enter to send, Shift + Enter for a new line. Answers come from your PDF and can
            still contain mistakes.
          </p>
        </div>
      </div>
    </div>
  );
}
