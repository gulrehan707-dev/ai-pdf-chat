"use client";

import { useRef, useState } from "react";
import {
  AlertIcon,
  FileIcon,
  LogoMark,
  QuoteIcon,
  ShieldIcon,
  SparkIcon,
  UploadCloud,
} from "./icons";
import type { DocumentMeta } from "../types";

const MAX_BYTES = 20 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FEATURES = [
  {
    icon: SparkIcon,
    title: "Answers in seconds",
    body: "Ask in plain language and watch the response stream back as it is written.",
  },
  {
    icon: QuoteIcon,
    title: "Grounded in your file",
    body: "Every answer is drawn from the document, with page references where they exist.",
  },
  {
    icon: ShieldIcon,
    title: "Only what you upload",
    body: "One PDF at a time. Nothing else is read, and nothing is shared between sessions.",
  },
];

export default function UploadPanel({
  onReady,
}: {
  onReady: (doc: DocumentMeta) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("That file is not a PDF.");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("That PDF is larger than the 20MB limit.");
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "This PDF could not be processed.");
        return;
      }

      onReady({
        id: data.id,
        filename: data.filename,
        size: data.size,
        pages: data.pages,
        characters: data.characters,
      });
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-5">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-8" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">Paperlens</span>
        </div>
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-mist-500 sm:block">
          Powered by OpenRouter
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10">
        <div className="animate-rise text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-mist-300">
            <span className="size-1.5 rounded-full bg-iris-400" />
            Reads text-based PDFs up to 20MB
          </span>

          <h1 className="mt-7 text-[2.5rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            Chat with any
            <span className="bg-gradient-to-r from-iris-400 to-orchid-500 bg-clip-text text-transparent">
              {" "}
              PDF
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-pretty text-mist-500">
            Drop in a contract, paper, or report and ask it anything. Paperlens answers from
            the document itself, never from guesswork.
          </p>
        </div>

        <div
          className="animate-rise mt-10 [animation-delay:80ms]"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files?.[0]);
          }}
        >
          <div
            className={`ring-hairline rounded-3xl border bg-ink-900/70 p-2 backdrop-blur-xl transition-all duration-300 ${
              dragging
                ? "border-iris-500/70 shadow-[0_0_0_4px_rgba(109,94,248,0.12),0_28px_60px_-24px_rgba(109,94,248,0.6)]"
                : "border-white/10 shadow-[0_28px_60px_-32px_rgba(0,0,0,0.9)]"
            }`}
          >
            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="group flex w-full cursor-pointer flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-white/12 px-6 py-14 text-center transition-colors hover:border-iris-500/50 hover:bg-white/[0.02]"
              >
                <span
                  className={`flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-iris-400 transition-transform duration-300 ${
                    dragging ? "scale-110" : "group-hover:scale-105"
                  }`}
                >
                  <UploadCloud className="size-6" />
                </span>
                <span className="space-y-1.5">
                  <span className="block text-base font-medium text-mist-100">
                    {dragging ? "Release to add your PDF" : "Drop a PDF here, or click to browse"}
                  </span>
                  <span className="block text-sm text-mist-600">PDF only, 20MB maximum</span>
                </span>
              </button>
            ) : (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-iris-500 to-orchid-500 text-white">
                    <FileIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-mist-100">
                      {file.name}
                    </span>
                    <span className="block text-xs text-mist-600">{formatSize(file.size)}</span>
                  </span>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-mist-500 transition-colors hover:bg-white/5 hover:text-mist-100"
                    >
                      Replace
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-iris-500 to-orchid-500 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-progress disabled:opacity-70"
                >
                  {uploading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Reading your document
                    </>
                  ) : (
                    <>
                      <SparkIcon className="size-4" />
                      Start chatting
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              accept(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {error && (
            <p className="animate-fade mt-4 flex items-center justify-center gap-2 text-sm text-rose-400">
              <AlertIcon className="size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <ul className="animate-rise mt-14 grid gap-3 [animation-delay:160ms] sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="ring-hairline rounded-2xl border border-white/8 bg-white/[0.02] p-5"
            >
              <Icon className="size-5 text-iris-400" />
              <h2 className="mt-3.5 text-sm font-medium text-mist-100">{title}</h2>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-600">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto w-full max-w-5xl py-8 text-center text-xs text-mist-600">
        Scanned PDFs without selectable text cannot be read.
      </footer>
    </div>
  );
}
