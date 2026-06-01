"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BibleChapter, BibleVerse } from "@/lib/bible-api";

interface WordToken {
  word: string;
  charStart: number;
  verseIdx: number;
  wordIdx: number;
  lineIdx: number; // verse index for grouping
}

interface Props {
  book: { id: string; name: string };
  chapterNum: number;
  chapterData: BibleChapter;
  onClose: () => void;
  initialVerseIdx?: number;
}

const CONFIDENCE_COLORS = ["", "#ef4444", "#f97316", "#6b7280", "#22c55e", "#16a34a"];

export default function FocusReader({ book, chapterNum, chapterData, onClose, initialVerseIdx = 0 }: Props) {
  const verses = chapterData.verses;

  // Build full text and word token map for TTS boundary tracking
  const { fullText, wordTokens } = (() => {
    const tokens: WordToken[] = [];
    let offset = 0;
    verses.forEach((verse, vi) => {
      const words = verse.text.trim().split(/\s+/);
      words.forEach((word, wi) => {
        tokens.push({ word, charStart: offset, verseIdx: vi, wordIdx: wi, lineIdx: vi });
        offset += word.length + 1;
      });
    });
    return { fullText: tokens.map(t => t.word).join(" "), wordTokens: tokens };
  })();

  const [currentWordIdx, setCurrentWordIdx] = useState<number | null>(null);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(initialVerseIdx);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [startFromVerse, setStartFromVerse] = useState(initialVerseIdx);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      const eng = all.filter(v => v.lang.startsWith("en") && !v.name.includes("compact"));
      if (eng.length > 0) {
        setVoices(eng);
        const pref = eng.find(v =>
          v.name.includes("Google US English") || v.name.includes("Samantha") ||
          v.name.includes("Alex") || v.name === "Karen"
        );
        setSelectedVoice(pref ?? eng[0]);
      }
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Auto-scroll to current verse
  useEffect(() => {
    verseRefs.current[currentVerseIdx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentVerseIdx]);

  const speakFrom = useCallback((verseIdx: number) => {
    window.speechSynthesis.cancel();
    setPaused(false);
    setStartFromVerse(verseIdx);

    // Build text from this verse onwards
    const fromTokens = wordTokens.filter(t => t.verseIdx >= verseIdx);
    if (fromTokens.length === 0) return;

    const startOffset = fromTokens[0].charStart;
    const text = fromTokens.map(t => t.word).join(" ");

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speechRate;
    utter.pitch = 1;
    if (selectedVoice) utter.voice = selectedVoice;

    utter.onstart = () => setSpeaking(true);

    utter.onboundary = (e) => {
      if (e.name !== "word") return;
      // Map charIndex back to global word token
      const absChar = startOffset + e.charIndex;
      let found: number | null = null;
      for (let i = fromTokens.length - 1; i >= 0; i--) {
        if (fromTokens[i].charStart <= absChar) {
          // Find index in wordTokens
          found = wordTokens.findIndex(t => t.verseIdx === fromTokens[i].verseIdx && t.wordIdx === fromTokens[i].wordIdx);
          break;
        }
      }
      if (found !== null && found >= 0) {
        setCurrentWordIdx(found);
        setCurrentVerseIdx(wordTokens[found].verseIdx);
      }
    };

    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setCurrentWordIdx(null);
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      setCurrentWordIdx(null);
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [wordTokens, selectedVoice, speechRate]);

  const pauseResume = useCallback(() => {
    if (!speaking) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, [speaking, paused]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setCurrentWordIdx(null);
  }, []);

  const restart = useCallback(() => {
    stop();
    setTimeout(() => speakFrom(startFromVerse), 100);
  }, [stop, speakFrom, startFromVerse]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { stop(); onClose(); }
      if (e.key === " ") { e.preventDefault(); speaking ? pauseResume() : speakFrom(currentVerseIdx); }
      if (e.key === "r") { restart(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speaking, pauseResume, speakFrom, currentVerseIdx, stop, onClose, restart]);

  // Cleanup on unmount
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const shortVoiceName = (v: SpeechSynthesisVoice) =>
    v.name.replace(/\(.*?\)/g, "").replace("Google", "").replace("Microsoft", "").trim();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0d0d0f",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-display, Georgia, serif)",
      color: "#f0ebe0",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => { stop(); onClose(); }}
            style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}>
            ✕
          </button>
          <span style={{ fontSize: 15, fontWeight: 400, color: "#c0b8a8" }}>
            {book.name} {chapterNum}
          </span>
          <span style={{ fontSize: 12, color: "#555", fontFamily: "system-ui" }}>
            Verse {currentVerseIdx + 1} of {verses.length}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Voice */}
          <select value={selectedVoice?.name ?? ""}
            onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) ?? null)}
            style={{
              padding: "5px 8px", borderRadius: 7, border: "1px solid #333",
              background: "#1a1a1f", color: "#c0b8a8", fontSize: 11, fontFamily: "system-ui",
              cursor: "pointer", maxWidth: 160,
            }}>
            {voices.map(v => <option key={v.name} value={v.name}>{shortVoiceName(v)}</option>)}
          </select>

          {/* Speed */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="range" min={0.5} max={1.4} step={0.05} value={speechRate}
              onChange={e => setSpeechRate(parseFloat(e.target.value))}
              style={{ width: 70, accentColor: "#7c5cbf" }} />
            <span style={{ fontSize: 11, color: "#666", fontFamily: "system-ui", minWidth: 28 }}>{speechRate.toFixed(2)}×</span>
          </div>

          {/* Restart */}
          <button onClick={restart} title="Restart from current start point (R)"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #333", color: "#888", fontSize: 13, cursor: "pointer", padding: "5px 10px", borderRadius: 7 }}>
            ↺
          </button>
        </div>
      </div>

      {/* ── Verse list — scrollable ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 0 100px" }}>
        {verses.map((verse, vi) => {
          const isActive = vi === currentVerseIdx;
          const isPast = vi < currentVerseIdx;

          return (
            <div
              key={verse.id}
              ref={el => { verseRefs.current[vi] = el; }}
              onClick={() => { stop(); speakFrom(vi); setStartFromVerse(vi); }}
              style={{
                cursor: "pointer",
                padding: "18px 10vw",
                transition: "background 200ms",
                background: isActive ? "rgba(124,92,191,0.10)" : "transparent",
                borderLeft: isActive ? "3px solid #7c5cbf" : "3px solid transparent",
              }}
            >
              {/* Verse number */}
              <div style={{
                fontSize: 10, fontWeight: 700, fontFamily: "system-ui",
                color: isActive ? "#7c5cbf" : "#444",
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 8,
              }}>
                Verse {verse.number}
              </div>

              {/* Words — rendered inline with per-word highlight */}
              <div style={{
                fontSize: isActive ? 26 : 20,
                lineHeight: isActive ? 1.9 : 1.75,
                color: isPast && !isActive ? "#3a3530" : isActive ? "#f5efe0" : "#8a8078",
                transition: "font-size 250ms, color 250ms",
                letterSpacing: "0.01em",
              }}>
                {(() => {
                  const verseTokens = wordTokens.filter(t => t.verseIdx === vi);
                  return verseTokens.map((token, localIdx) => {
                    const globalIdx = wordTokens.findIndex(
                      t => t.verseIdx === vi && t.wordIdx === localIdx
                    );
                    const isCurrent = currentWordIdx === globalIdx;
                    return (
                      <span key={localIdx} style={{
                        display: "inline",
                        background: isCurrent ? "#7c5cbf" : "transparent",
                        color: isCurrent ? "#fff" : undefined,
                        borderRadius: isCurrent ? 4 : 0,
                        padding: isCurrent ? "0 3px" : undefined,
                        transition: "background 80ms",
                        marginRight: "0.28em",
                      }}>
                        {token.word}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom control bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(13,13,15,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "16px 24px 20px",
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Progress bar */}
        <div style={{ width: "100%", maxWidth: 560, height: 3, background: "#222", borderRadius: 2 }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #7c5cbf, #a78bdc)",
            width: `${((currentVerseIdx + 1) / verses.length) * 100}%`,
            transition: "width 400ms",
          }} />
        </div>

        {/* Main playback buttons */}
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {/* Previous verse */}
          <button onClick={() => { const v = Math.max(0, currentVerseIdx - 1); stop(); speakFrom(v); setStartFromVerse(v); }}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #333", color: "#888", fontSize: 18, cursor: "pointer", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ⏮
          </button>

          {/* Play / Pause */}
          {!speaking ? (
            <button onClick={() => speakFrom(currentVerseIdx)}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: "linear-gradient(135deg, #7c5cbf, #a78bdc)",
                color: "#fff", fontSize: 24, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(124,92,191,0.4)",
              }}>
              ▶
            </button>
          ) : (
            <button onClick={pauseResume}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: paused ? "linear-gradient(135deg, #7c5cbf, #a78bdc)" : "rgba(255,255,255,0.12)",
                color: "#fff", fontSize: 22, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {paused ? "▶" : "⏸"}
            </button>
          )}

          {/* Next verse */}
          <button onClick={() => { const v = Math.min(verses.length - 1, currentVerseIdx + 1); stop(); speakFrom(v); setStartFromVerse(v); }}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #333", color: "#888", fontSize: 18, cursor: "pointer", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ⏭
          </button>
        </div>

        <div style={{ fontSize: 11, color: "#444", fontFamily: "system-ui" }}>
          Space = play/pause · R = restart · Esc = close · Click any verse to start there
        </div>
      </div>
    </div>
  );
}
