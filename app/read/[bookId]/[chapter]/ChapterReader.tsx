"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { BibleChapter, BibleVerse, BibleVersion } from "@/lib/bible-api";

interface Props {
  book: { id: string; name: string; chapters: number; testament: "OT" | "NT" };
  chapterNum: number;
  chapterData: BibleChapter | null;
  version: BibleVersion;
  allVersions: BibleVersion[];
  prevChapter: number | null;
  nextChapter: number | null;
  userId: string;
  initialHighlights: any[];
  initialBookmarks: any[];
  initialNotes: any[];
  bibleId: string;
}

const HIGHLIGHT_COLORS = [
  { key: "yellow", label: "🟡", bg: "rgba(184,138,46,0.25)" },
  { key: "blue",   label: "🔵", bg: "rgba(59,92,127,0.2)"  },
  { key: "green",  label: "🟢", bg: "rgba(74,107,58,0.2)"  },
  { key: "pink",   label: "🩷", bg: "rgba(154,59,90,0.2)"  },
];

export default function ChapterReader({
  book, chapterNum, chapterData, version, allVersions,
  prevChapter, nextChapter, userId, initialHighlights, initialBookmarks, initialNotes, bibleId,
}: Props) {
  const router = useRouter();
  const [highlights, setHighlights] = useState<Record<string, string>>(
    Object.fromEntries(initialHighlights.map((h) => [h.verse_id, h.color]))
  );
  const [bookmarked, setBookmarked] = useState(initialBookmarks.length > 0);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialNotes.map((n) => [n.verse_start ?? 0, n.content]))
  );
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [activeColor, setActiveColor] = useState("yellow");

  // TTS state
  const [speaking, setSpeaking] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const db = createClient() as any;

  // ── TTS ──────────────────────────────────────────────────────────
  const speak = useCallback(() => {
    if (!chapterData) return;
    window.speechSynthesis.cancel();
    const text = chapterData.verses.map((v) => `Verse ${v.number}. ${v.text}`).join(" ");
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    if (ttsVoice) utter.voice = ttsVoice;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [chapterData, ttsVoice]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // ── Highlight ─────────────────────────────────────────────────────
  const toggleHighlight = async (verse: BibleVerse, color: string) => {
    const verseId = verse.id;
    const existing = highlights[verseId];
    if (existing === color) {
      // Remove highlight
      const next = { ...highlights };
      delete next[verseId];
      setHighlights(next);
      await db.schema("bible").from("highlights").delete()
        .eq("user_id", userId).eq("bible_id", bibleId).eq("verse_id", verseId);
    } else {
      setHighlights({ ...highlights, [verseId]: color });
      await db.schema("bible").from("highlights").upsert({
        user_id: userId, bible_id: bibleId,
        reference: verse.reference, verse_id: verseId, color,
      }, { onConflict: "user_id,bible_id,verse_id" });
    }
    setSelectedVerse(null);
  };

  // ── Bookmark ──────────────────────────────────────────────────────
  const toggleBookmark = async () => {
    if (bookmarked) {
      setBookmarked(false);
      await db.schema("bible").from("bookmarks").delete()
        .eq("user_id", userId).eq("bible_id", bibleId)
        .eq("book_id", book.id).eq("chapter_num", chapterNum);
    } else {
      setBookmarked(true);
      await db.schema("bible").from("bookmarks").upsert({
        user_id: userId, bible_id: bibleId,
        reference: `${book.name} ${chapterNum}`,
        book_id: book.id, chapter_num: chapterNum,
      }, { onConflict: "user_id,bible_id,reference" });
    }
  };

  // ── Save note ─────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!selectedVerse || !noteText.trim()) return;
    setSavingNote(true);
    await db.schema("bible").from("notes").insert({
      user_id: userId, bible_id: bibleId,
      book_id: book.id, chapter_num: chapterNum,
      verse_start: selectedVerse.number, verse_end: selectedVerse.number,
      reference: selectedVerse.reference,
      content: noteText.trim(),
    });
    setNotes({ ...notes, [selectedVerse.number]: noteText.trim() });
    setNoteText("");
    setSavingNote(false);
    setSelectedVerse(null);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px" }}>
      {/* Chapter header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {book.testament === "OT" ? "Old Testament" : "New Testament"}
          </div>
          <h1 style={{ fontFamily: "var(--font-instrument-serif, serif)", fontSize: 28, fontWeight: 400, margin: "4px 0 0" }}>
            {book.name} {chapterNum}
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Version picker */}
          <select
            value={bibleId}
            onChange={(e) => router.push(`/read/${book.id}/${chapterNum}?v=${e.target.value}`)}
            style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-rule)",
              background: "var(--color-bg-card)", fontSize: 12, fontFamily: "inherit",
              color: "var(--color-ink)", cursor: "pointer",
            }}
          >
            {allVersions.map((v) => (
              <option key={v.id} value={v.id}>{v.abbreviation} — {v.name}</option>
            ))}
          </select>

          {/* Bookmark */}
          <button onClick={toggleBookmark} title={bookmarked ? "Remove bookmark" : "Bookmark chapter"}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}>
            {bookmarked ? "🔖" : "📄"}
          </button>

          {/* TTS */}
          <button onClick={speaking ? stopSpeaking : speak}
            title={speaking ? "Stop reading" : "Read aloud"}
            style={{
              padding: "6px 14px", borderRadius: 8,
              background: speaking ? "var(--color-accent)" : "var(--color-bg-deep)",
              color: speaking ? "#fff" : "var(--color-ink)",
              border: "none", fontSize: 12, cursor: "pointer", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
            {speaking ? "⏸ Stop" : "▶ Read aloud"}
          </button>
        </div>
      </div>

      {/* Chapter navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        {prevChapter
          ? <Link href={`/read/${book.id}/${prevChapter}?v=${bibleId}`} style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none" }}>← {book.name} {prevChapter}</Link>
          : <span />}
        <Link href="/read" style={{ fontSize: 13, color: "var(--color-ink-3)", textDecoration: "none" }}>All books</Link>
        {nextChapter
          ? <Link href={`/read/${book.id}/${nextChapter}?v=${bibleId}`} style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none" }}>{book.name} {nextChapter} →</Link>
          : <span />}
      </div>

      {/* Error state */}
      {!chapterData && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-ink-3)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 600 }}>Unable to load this chapter</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Check that BIBLE_API_KEY is set, or try KJV/ASV/WEB.</div>
        </div>
      )}

      {/* Verses */}
      {chapterData && (
        <div className="bible-prose" style={{ position: "relative" }}>
          {chapterData.verses.map((verse) => {
            const hlColor = highlights[verse.id];
            const hlDef = HIGHLIGHT_COLORS.find((c) => c.key === hlColor);
            const hasNote = notes[verse.number];
            return (
              <span
                key={verse.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
              >
                <sup className="verse-number">{verse.number}</sup>
                <span
                  className={`verse-text${hlColor ? ` highlighted-${hlColor}` : ""}`}
                  style={hlDef ? { background: hlDef.bg, borderRadius: 3, padding: "0 1px" } : {}}
                >
                  {verse.text}{" "}
                </span>
                {hasNote && (
                  <span title="You have a note here" style={{ fontSize: 10, color: "var(--color-accent)", verticalAlign: "super" }}>✏</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Verse action panel */}
      {selectedVerse && (
        <div style={{
          position: "fixed", bottom: 80, left: 0, right: 0, zIndex: 60,
          display: "flex", justifyContent: "center", padding: "0 16px",
        }}>
          <div style={{
            background: "#fff", border: "1px solid var(--color-rule)",
            borderRadius: 16, padding: "16px 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            width: "100%", maxWidth: 680,
          }}>
            <div style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 600, marginBottom: 8 }}>
              {selectedVerse.reference}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink-2)", marginBottom: 12, fontFamily: "var(--font-instrument-serif, serif)", lineHeight: 1.6 }}>
              {selectedVerse.text}
            </div>

            {/* Highlight colors */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "var(--color-ink-3)", alignSelf: "center" }}>Highlight:</span>
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c.key} onClick={() => toggleHighlight(selectedVerse, c.key)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: c.bg, border: highlights[selectedVerse.id] === c.key ? "2px solid #1a1a1a" : "2px solid transparent",
                    cursor: "pointer", fontSize: 14,
                  }}
                  title={c.key}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Note */}
            <textarea
              placeholder="Add a note for this verse…"
              value={noteText || notes[selectedVerse.number] || ""}
              onChange={(e) => setNoteText(e.target.value)}
              style={{
                width: "100%", minHeight: 60, padding: "8px 10px",
                border: "1px solid var(--color-rule)", borderRadius: 8,
                fontSize: 13, fontFamily: "inherit", resize: "vertical",
                boxSizing: "border-box", marginBottom: 10,
              }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedVerse(null)} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-rule)",
                background: "transparent", fontSize: 12, cursor: "pointer",
              }}>
                Close
              </button>
              {noteText.trim() && (
                <button onClick={saveNote} disabled={savingNote} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "var(--color-accent)", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {savingNote ? "Saving…" : "Save note"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
