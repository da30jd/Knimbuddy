"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Mode =
  | "ask"
  | "summary"
  | "keypoints"
  | "flashcards"
  | "quiz"
  | "examguide";

const MODES: { id: Mode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "summary", label: "Summary" },
  { id: "keypoints", label: "Key Points" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Practice Quiz" },
  { id: "examguide", label: "Exam Guide" },
];

type ChatMessage = { role: "user" | "assistant"; content: string };

// --- Inline icons (no extra deps) ---
function CloudUploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 10.2 4.5 4.5 0 0 0 6.5 19" />
      <path d="M12 12v7" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z" />
    </svg>
  );
}

function KnimAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
      <SparkleIcon className="h-3.5 w-3.5" />
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center text-primary">
      <span className="knim-dot" />
      <span className="knim-dot" />
      <span className="knim-dot" />
    </span>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        components={{
          h1: (props) => (
            <h1
              className="mt-4 mb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0"
              {...props}
            />
          ),
          h2: (props) => (
            <h2
              className="mt-4 mb-2 text-xl font-bold tracking-tight text-foreground first:mt-0"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="mt-3 mb-1.5 text-base font-bold text-foreground first:mt-0"
              {...props}
            />
          ),
          h4: (props) => (
            <h4
              className="mt-3 mb-1 text-sm font-bold text-foreground first:mt-0"
              {...props}
            />
          ),
          p: (props) => <p className="mb-3 last:mb-0" {...props} />,
          strong: (props) => (
            <strong className="font-bold text-foreground" {...props} />
          ),
          em: (props) => <em className="italic" {...props} />,
          ul: (props) => (
            <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />
          ),
          ol: (props) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />
          ),
          li: (props) => <li className="leading-relaxed" {...props} />,
          code: (props) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
              {...props}
            />
          ),
          hr: () => <hr className="my-4 border-border/70" />,
          blockquote: (props) => (
            <blockquote
              className="my-3 border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
      <div className="h-3 w-full rounded bg-muted-foreground/20" />
      <div className="h-3 w-5/6 rounded bg-muted-foreground/20" />
      <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
      <div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<
    {
      name: string;
      pages: number;
      text: string;
      selected: boolean;
      kind: "PDF" | "Word" | "PowerPoint" | "Excel";
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state for Ask mode
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function handleAsk() {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    if (noPdfsSelected()) {
      setError("Please select at least one document to continue.");
      return;
    }
    if (!text.trim()) return;
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: text, messages: newMessages }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text();
        setError(`Request failed (${res.status}): ${body || "no body"}`);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (e) {
      setError((e as Error).message || "Unknown error");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([]);
    setChatInput("");
    setError(null);
  }

  function rebuildText(
    list: {
      name: string;
      pages: number;
      text: string;
      selected: boolean;
      kind: "PDF" | "Word" | "PowerPoint" | "Excel";
    }[]
  ) {
    const sel = list.filter((p) => p.selected);
    if (sel.length === 0) return "";
    if (sel.length === 1) return sel[0].text;
    return sel.map((p) => `=== ${p.name} ===\n${p.text}`).join("\n\n");
  }

  async function extractPdf(file: File) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs";
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      fullText +=
        content.items.map((it: { str?: string }) => it.str || "").join(" ") +
        "\n\n";
    }
    return { text: fullText.trim(), pages: doc.numPages };
  }

  async function extractDocx(file: File) {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return { text: result.value.trim(), pages: 1 };
  }

  async function extractPptx(file: File) {
    // pptx is a zip of XML files. Slides live at ppt/slides/slideN.xml
    // and text is inside <a:t> elements.
    const JSZip = (await import("jszip")).default;
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const slideEntries = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const ai = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
        const bi = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
        return ai - bi;
      });
    const parser = new DOMParser();
    const slides: string[] = [];
    for (let i = 0; i < slideEntries.length; i++) {
      const xml = await zip.file(slideEntries[i])!.async("string");
      const doc = parser.parseFromString(xml, "application/xml");
      const texts = Array.from(doc.getElementsByTagName("a:t"))
        .map((n) => n.textContent || "")
        .filter(Boolean);
      slides.push(`Slide ${i + 1}:\n${texts.join("\n")}`);
    }
    return { text: slides.join("\n\n"), pages: slideEntries.length };
  }

  async function extractXlsx(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(ws).trim();
      if (csv) parts.push(`Sheet: ${name}\n${csv}`);
    }
    return { text: parts.join("\n\n"), pages: wb.SheetNames.length };
  }

  function detectKind(
    name: string
  ): "PDF" | "Word" | "PowerPoint" | "Excel" | null {
    const n = name.toLowerCase();
    if (n.endsWith(".pdf")) return "PDF";
    if (n.endsWith(".docx")) return "Word";
    if (n.endsWith(".pptx")) return "PowerPoint";
    if (n.endsWith(".xlsx")) return "Excel";
    return null;
  }

  async function handleFiles(files: File[]) {
    const supported = files
      .map((f) => ({ file: f, kind: detectKind(f.name) }))
      .filter((x): x is { file: File; kind: NonNullable<ReturnType<typeof detectKind>> } => x.kind !== null);

    if (supported.length === 0) {
      setError("Please upload PDF, Word, PowerPoint, or Excel files.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const added: {
        name: string;
        pages: number;
        text: string;
        selected: boolean;
        kind: "PDF" | "Word" | "PowerPoint" | "Excel";
      }[] = [];

      for (const { file, kind } of supported) {
        try {
          let result: { text: string; pages: number };
          if (kind === "PDF") result = await extractPdf(file);
          else if (kind === "Word") result = await extractDocx(file);
          else if (kind === "PowerPoint") result = await extractPptx(file);
          else result = await extractXlsx(file);

          added.push({
            name: file.name,
            pages: result.pages,
            text: result.text,
            selected: true,
            kind,
          });
        } catch (err) {
          console.error("[handleFiles] failed to parse", file.name, err);
          setError(
            `Could not read ${file.name}: ${(err as Error).message || "parse error"}`
          );
        }
      }

      if (added.length > 0) {
        setPdfs((prev) => {
          const next = [...prev, ...added];
          setText(rebuildText(next));
          return next;
        });
      }
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePdf(index: number) {
    setPdfs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setText(rebuildText(next));
      return next;
    });
  }

  function togglePdf(index: number) {
    setPdfs((prev) => {
      const next = prev.map((p, i) =>
        i === index ? { ...p, selected: !p.selected } : p
      );
      setText(rebuildText(next));
      return next;
    });
  }

  function setAllSelected(value: boolean) {
    setPdfs((prev) => {
      const next = prev.map((p) => ({ ...p, selected: value }));
      setText(rebuildText(next));
      return next;
    });
  }

  function noPdfsSelected() {
    return pdfs.length > 0 && pdfs.every((p) => !p.selected);
  }

  function handleClear() {
    setText("");
    setPdfs([]);
    setOutput("");
    setActiveMode(null);
    setError(null);
    setMessages([]);
    setChatInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate(mode: Mode) {
    console.log("[handleGenerate] clicked", { mode, textLen: text.length });
    if (mode === "ask") {
      setActiveMode("ask");
      setError(null);
      return;
    }
    if (noPdfsSelected()) {
      setActiveMode(mode);
      setError("Please select at least one document to continue.");
      return;
    }
    if (!text.trim() || loading) return;
    setLoading(mode);
    setActiveMode(mode);
    setOutput("");
    setError(null);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      if (!res.ok || !res.body) {
        const body = await res.text();
        setError(`Request failed (${res.status}): ${body || "no body"}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      console.error("[handleGenerate] error", e);
      setError((e as Error).message || "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  const activeLabel = MODES.find((m) => m.id === activeMode)?.label;
  const isGenerating = !!loading;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <SparkleIcon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">KnimBuddy</h1>
              <span className="hidden rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 sm:inline">
                Powered by Claude
              </span>
            </div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            AI-powered study assistant
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {/* LEFT: Input */}
          <Card className="border border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Your material</CardTitle>
              <CardDescription>
                Upload a PDF or paste notes, an article, or any study text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pdfs.length > 0 && (() => {
                const selected = pdfs.filter((p) => p.selected);
                const selPages = selected.reduce((s, p) => s + p.pages, 0);
                const selChars = selected.reduce(
                  (s, p) => s + p.text.length,
                  0
                );
                const allOn = selected.length === pdfs.length;
                const allOff = selected.length === 0;
                return (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {selected.length} file
                        {selected.length === 1 ? "" : "s"} · {selPages} section
                        {selPages === 1 ? "" : "s"} ·{" "}
                        {selChars.toLocaleString()} chars
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="ml-2 h-7 shrink-0 px-2 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
                      >
                        Clear all
                      </Button>
                    </div>

                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {selected.length} of {pdfs.length} document
                        {pdfs.length === 1 ? "" : "s"} selected
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAllSelected(true)}
                          disabled={allOn}
                          className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Select all
                        </button>
                        <span className="text-muted-foreground/50">·</span>
                        <button
                          type="button"
                          onClick={() => setAllSelected(false)}
                          disabled={allOff}
                          className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Deselect all
                        </button>
                      </span>
                    </div>

                    <ul className="space-y-1">
                      {pdfs.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => togglePdf(i)}
                            aria-label={`Include ${p.name}`}
                            className="h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-blue-700"
                          />
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              p.kind === "PDF"
                                ? "bg-red-100 text-red-700"
                                : p.kind === "Word"
                                  ? "bg-blue-100 text-blue-700"
                                  : p.kind === "PowerPoint"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.kind}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-xs font-medium ${
                                p.selected
                                  ? "text-foreground"
                                  : "text-muted-foreground line-through"
                              }`}
                            >
                              {p.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {p.pages}{" "}
                              {p.kind === "PowerPoint"
                                ? p.pages === 1
                                  ? "slide"
                                  : "slides"
                                : p.kind === "Excel"
                                  ? p.pages === 1
                                    ? "sheet"
                                    : "sheets"
                                  : p.pages === 1
                                    ? "page"
                                    : "pages"}{" "}
                              · {p.text.length.toLocaleString()} chars
                            </div>
                          </div>
                          <button
                            onClick={() => removePdf(i)}
                            aria-label={`Remove ${p.name}`}
                            className="shrink-0 rounded px-2 py-0.5 text-xs text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length) handleFiles(files);
                }}
                className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-primary/40 bg-primary/[0.03] hover:border-primary hover:bg-primary/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) handleFiles(files);
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <LoadingDots />
                    <span className="text-sm text-muted-foreground">
                      Extracting PDF…
                    </span>
                  </div>
                ) : (
                  <>
                    <CloudUploadIcon className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
                    <span className="mt-2 text-sm font-semibold text-foreground">
                      Drop files here or click to browse
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PDF, Word, PowerPoint, or Excel — we&apos;ll extract the
                      text automatically
                    </span>
                  </>
                )}
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="…or paste your content here"
                className="min-h-[38vh] resize-none rounded-xl border-border/70 bg-background"
              />
            </CardContent>
          </Card>

          {/* RIGHT: Study output */}
          <Card className="border border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Study tools</CardTitle>
              <CardDescription>
                Pick a mode to generate — or use Ask for a chat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MODES.map((m) => {
                  const isActive = activeMode === m.id;
                  const isLoadingThis = loading === m.id;
                  const disabled =
                    m.id === "ask" ? !!loading : !!loading || !text.trim();
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleGenerate(m.id)}
                      disabled={disabled}
                      className={`relative rounded-xl border px-3 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/70 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {isLoadingThis ? (
                        <span className="inline-flex items-center gap-1.5">
                          <LoadingDots />
                        </span>
                      ) : (
                        m.label
                      )}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {activeLabel && (
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {activeLabel}
                  </div>
                  {activeMode === "ask" && messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChat}
                      disabled={chatLoading}
                      className="text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
                    >
                      Clear Chat
                    </Button>
                  )}
                </div>
              )}

              {activeMode === "ask" ? (
                <div className="flex min-h-[45vh] flex-col rounded-xl border border-border/70 bg-muted/40">
                  <div className="flex-1 space-y-4 overflow-auto p-4 text-sm">
                    {!text.trim() ? (
                      <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                        Upload a PDF or paste text first to start asking
                        questions.
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                        Ask a question about your document below.
                      </div>
                    ) : (
                      messages.map((m, i) =>
                        m.role === "user" ? (
                          <div key={i} className="flex justify-end">
                            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm">
                              {m.content}
                            </div>
                          </div>
                        ) : (
                          <div key={i} className="flex items-start gap-2">
                            <KnimAvatar />
                            <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-4 py-2 text-sm text-foreground shadow-sm">
                              {m.content ? (
                                <Markdown>{m.content}</Markdown>
                              ) : chatLoading && i === messages.length - 1 ? (
                                <LoadingDots />
                              ) : null}
                            </div>
                          </div>
                        )
                      )
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 border-t border-border/70 p-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAsk();
                        }
                      }}
                      placeholder={
                        text.trim()
                          ? "Ask a question about the document…"
                          : "Upload a PDF or paste text first…"
                      }
                      disabled={!text.trim() || chatLoading}
                      className="flex-1 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <Button
                      onClick={handleAsk}
                      disabled={!text.trim() || !chatInput.trim() || chatLoading}
                    >
                      {chatLoading ? "…" : "Send"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-h-[45vh] w-full overflow-auto rounded-xl border border-border/70 bg-muted/40 p-4 text-sm">
                  {isGenerating && !output ? (
                    <SkeletonLines />
                  ) : output ? (
                    <>
                      <Markdown>{output}</Markdown>
                      {isGenerating && (
                        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {text.trim()
                        ? "Pick a study mode above to generate output."
                        : "Paste some text on the left to get started…"}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-background/50">
        <div className="mx-auto max-w-6xl px-6 py-5 text-center text-xs text-muted-foreground">
          KnimBuddy — Built for students
        </div>
      </footer>
    </div>
  );
}
