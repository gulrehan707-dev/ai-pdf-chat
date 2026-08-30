"use client";

import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import ChatPanel from "./components/ChatPanel";
import type { DocumentMeta } from "./types";

export default function Home() {
  const [doc, setDoc] = useState<DocumentMeta | null>(null);

  if (!doc) return <UploadPanel onReady={setDoc} />;

  // Keying on the document id resets all chat state when a new PDF is opened.
  return <ChatPanel key={doc.id} doc={doc} onReset={() => setDoc(null)} />;
}
