import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../../lib/supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { documentId, question } = await req.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: "Document ID aur Question zaroori hain." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .select("content, filename")
      .eq("id", documentId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Document database mein nahi mila." },
        { status: 404 }
      );
    }

    const prompt = `You are an AI assistant answering questions based on an uploaded document.
Document Name: ${data.filename}
Document Context:
${data.content}

User Question: ${question}

Instructions: Answer accurately using only the provided document context. If the answer is not in the context, clearly state that.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const answer = response.text || "Jawab generate nahi ho saka.";

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}