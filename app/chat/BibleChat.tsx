"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What does the Bible say about prayer?",
  "Explain the context of John 3:16",
  "What is the significance of the Sermon on the Mount?",
  "Who wrote the book of Psalms?",
  "What are the major themes of Romans?",
  "How do the four Gospels differ from each other?",
];

export default function BibleChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages([...next, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: assistantText }]);
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      <h1 style={{ fontFamily: "var(--font-instrument-serif, serif)", fontSize: 26, fontWeight: 400, margin: "0 0 4px" }}>
        Bible Research
      </h1>
      <p style={{ color: "var(--color-ink-3)", fontSize: 13, margin: "0 0 20px" }}>
        Ask anything about Scripture — history, theology, context, language, or application.
      </p>

      {/* Starter prompts */}
      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {STARTERS.map((s) => (
            <button key={s} onClick={() => send(s)}
              style={{
                padding: "8px 14px", borderRadius: 20, border: "1px solid var(--color-rule)",
                background: "var(--color-bg-card)", fontSize: 12, color: "var(--color-ink-2)",
                cursor: "pointer", fontFamily: "inherit",
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "var(--color-accent)" : "var(--color-bg-card)",
              color: m.role === "user" ? "#fff" : "var(--color-ink)",
              fontSize: 14,
              lineHeight: 1.6,
              border: m.role === "assistant" ? "1px solid var(--color-rule)" : "none",
              boxShadow: "var(--shadow-card)",
              whiteSpace: "pre-wrap",
              fontFamily: m.role === "assistant" ? "var(--font-instrument-serif, serif)" : "inherit",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "12px 16px", borderRadius: "16px 16px 16px 4px",
              background: "var(--color-bg-card)", border: "1px solid var(--color-rule)",
              fontSize: 14, color: "var(--color-ink-3)",
            }}>
              ✝ Searching Scripture…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--color-rule)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about Scripture…"
          style={{
            flex: 1, padding: "10px 14px", border: "1px solid var(--color-rule)",
            borderRadius: 12, fontSize: 14, fontFamily: "inherit",
            background: "var(--color-bg-card)", outline: "none",
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: input.trim() && !loading ? "var(--color-accent)" : "#ccc",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
          Send
        </button>
      </div>
    </div>
  );
}
