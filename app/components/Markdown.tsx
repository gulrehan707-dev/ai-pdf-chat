import { Fragment, type ReactNode } from "react";

/**
 * A small Markdown renderer covering what the model actually emits: headings,
 * lists, fenced code, blockquotes, bold/italic/inline-code and links.
 * It builds React elements directly, so nothing is ever injected as raw HTML.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE).filter((p) => p !== "" && p !== undefined);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[0.85em] text-iris-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[")) {
      const match = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (match) {
        return (
          <a
            key={key}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-iris-400 underline underline-offset-2 hover:text-iris-500"
          >
            {match[1]}
          </a>
        );
      }
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return (
        <em key={key} className="italic text-mist-100">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

type Block =
  | { type: "p" | "h1" | "h2" | "h3" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; text: string };

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block — consume until the closing fence or end of input.
    if (/^\s*```/.test(line)) {
      flushParagraph();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      blocks.push({ type: level === 1 ? "h1" : level === 2 ? "h2" : "h3", text: heading[2] });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.replace(/^\s*>\s?/, "") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "ol", items });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

/**
 * While a response streams, the closing half of an emphasis or code marker has
 * not arrived yet. Hide the dangling opener so `**Implementation` does not
 * flash as literal asterisks before the pair completes.
 */
function hideDanglingMarkers(text: string) {
  let out = text;
  const fences = (out.match(/```/g) || []).length;
  // An unclosed code fence would swallow the rest of the block; leave it be.
  if (fences % 2 === 1) return out;
  if ((out.match(/\*\*/g) || []).length % 2 === 1) {
    out = out.replace(/\*\*(?=[^*]*$)/, "");
  }
  if ((out.match(/`/g) || []).length % 2 === 1) {
    out = out.replace(/`(?=[^`]*$)/, "");
  }
  return out;
}

export default function Markdown({ children }: { children: string }) {
  const blocks = parse(hideDanglingMarkers(children));

  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed text-mist-100/90">
      {blocks.map((block, i) => {
        const key = `b-${i}`;

        switch (block.type) {
          case "h1":
            return (
              <h3 key={key} className="pt-1 text-lg font-semibold text-white">
                {renderInline(block.text, key)}
              </h3>
            );
          case "h2":
            return (
              <h4 key={key} className="pt-1 text-base font-semibold text-white">
                {renderInline(block.text, key)}
              </h4>
            );
          case "h3":
            return (
              <h5 key={key} className="pt-1 text-sm font-semibold tracking-wide text-mist-300 uppercase">
                {renderInline(block.text, key)}
              </h5>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-iris-500/60 pl-3 text-mist-300 italic"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={key}
                className="scroll-slim overflow-x-auto rounded-xl border border-white/8 bg-black/40 p-3.5 font-mono text-[0.8125rem] text-mist-300"
              >
                <code>{block.text}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={key} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-iris-500" />
                    <span>{renderInline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-px w-5 shrink-0 text-right font-mono text-xs text-iris-400">
                      {j + 1}.
                    </span>
                    <span>{renderInline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          default:
            return <p key={key}>{renderInline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}
