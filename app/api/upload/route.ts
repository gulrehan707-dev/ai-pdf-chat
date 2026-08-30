import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import PDFParser from "pdf2json";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_STORED_CHARS = 400_000;

// Thrown for problems with the uploaded file itself rather than the server.
class BadPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadPdfError";
  }
}

type ParseErrorEvent = Error | { parserError: Error };

function extractText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // The second constructor argument enables raw text extraction, which the
    // shipped pdf2json types do not describe.
    const parser = new (PDFParser as unknown as new (
      context: null,
      mode: number
    ) => PDFParser & { getRawTextContent(): string })(null, 1);

    parser.on("pdfParser_dataError", (errData: ParseErrorEvent) => {
      const message =
        "parserError" in errData ? errData.parserError.message : errData.message;
      reject(new BadPdfError(message || "This PDF could not be read."));
    });

    parser.on("pdfParser_dataReady", () => {
      try {
        resolve(parser.getRawTextContent());
      } catch {
        reject(new BadPdfError("This PDF could not be read."));
      }
    });

    parser.parseBuffer(buffer);
  });
}

// pdf2json separates pages with "----------------Page (n) Break----------------".
// Turn those into readable markers and collapse the excess whitespace around them.
function normalize(raw: string) {
  const pageBreak = /-{4,}\s*Page \((\d+)\) Break\s*-{4,}/g;
  const pages = (raw.match(pageBreak) || []).length;

  const text = raw
    .replace(pageBreak, (_m, n) => `\n\n[Page ${Number(n) + 1}]\n`)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, pages: pages || 1 };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Expected a multipart form upload." },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "That PDF is larger than the 20MB limit." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, pages } = normalize(await extractText(buffer));

    if (!text || text.replace(/\[Page \d+\]/g, "").trim().length < 20) {
      return NextResponse.json(
        {
          error:
            "No readable text found. This PDF is probably a scan — try one with selectable text.",
        },
        { status: 422 }
      );
    }

    const content =
      text.length > MAX_STORED_CHARS ? text.slice(0, MAX_STORED_CHARS) : text;

    const { data, error } = await supabase
      .from("documents")
      .insert([{ filename: file.name, content }])
      .select("id")
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      filename: file.name,
      size: file.size,
      pages,
      characters: content.length,
    });
  } catch (err) {
    console.error("Upload error:", err);

    // A file we could not parse is the user's problem to fix, not a server fault.
    if (err instanceof BadPdfError) {
      return NextResponse.json(
        { error: "This PDF could not be read. It may be corrupted or password-protected." },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Failed to process this PDF." }, { status: 500 });
  }
}
