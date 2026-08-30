"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setDocId(data.id);
        setMessages([
          {
            role: "assistant",
            content: `Document "${data.filename}" upload ho gaya hai! Aap ab is ke baare mein koi bhi sawaal pooch sakte hain.`,
          },
        ]);
      } else {
        alert("Upload fail ho gaya: " + data.error);
      }
    } catch (err) {
      alert("Koi masla hua upload mein.");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !docId) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, question: userMessage }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "Koi jawab nahi mila.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Jawab fetch nahi ho saka." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 min-h-screen flex flex-col justify-center">
      <h1 className="text-3xl font-bold text-center mb-6">AI PDF Chat</h1>

      {!docId ? (
        <form
          onSubmit={handleUpload}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 block mx-auto"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {uploading ? "Processing PDF..." : "Upload PDF"}
          </button>
        </form>
      ) : (
        <div className="border rounded-lg p-4 h-[500px] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 p-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white ml-auto"
                    : "bg-gray-100 text-black mr-auto"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-100 text-gray-500 p-3 rounded-lg mr-auto">
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="PDF ke baare mein sawaal poochein..."
              className="flex-1 border border-gray-300 rounded-md p-2 text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </main>
  );
}