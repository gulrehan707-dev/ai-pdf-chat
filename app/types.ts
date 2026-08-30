export type DocumentMeta = {
  id: string;
  filename: string;
  size: number;
  pages: number;
  characters: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
