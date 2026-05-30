import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PlatformMenu from "@/components/PlatformMenu";
import NavBar from "@/components/NavBar";
import { fetchChapter, bookById, BIBLE_BOOKS, KNOWN_VERSIONS, DEFAULT_VERSION_ID } from "@/lib/bible-api";
import ChapterReader from "./ChapterReader";

interface Props {
  params: Promise<{ bookId: string; chapter: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function ChapterPage({ params, searchParams }: Props) {
  const { bookId, chapter } = await params;
  const { v } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const book = bookById(bookId.toUpperCase());
  if (!book) notFound();

  const chapterNum = parseInt(chapter);
  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > book.chapters) notFound();

  const bibleId = v ?? DEFAULT_VERSION_ID;

  // Fetch chapter text (server-side, cached 24h)
  let chapterData;
  try {
    chapterData = await fetchChapter(bibleId, book.id, chapterNum);
  } catch {
    chapterData = null;
  }

  // Load user's highlights and bookmarks for this chapter
  const db = createServiceClient() as any;
  const [{ data: highlights }, { data: bookmarks }, { data: notes }] = await Promise.all([
    db.schema("bible").from("highlights").select("*").eq("user_id", user.id).eq("bible_id", bibleId).like("verse_id", `${book.id}.${chapterNum}.%`),
    db.schema("bible").from("bookmarks").select("*").eq("user_id", user.id).eq("bible_id", bibleId).eq("book_id", book.id).eq("chapter_num", chapterNum),
    db.schema("bible").from("notes").select("*").eq("user_id", user.id).eq("book_id", book.id).eq("chapter_num", chapterNum),
  ]);

  const menuUser = {
    email: user.email,
    name: user.user_metadata?.full_name ?? user.email,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };

  const prevChapter = chapterNum > 1 ? chapterNum - 1 : null;
  const nextChapter = chapterNum < book.chapters ? chapterNum + 1 : null;
  const version = KNOWN_VERSIONS.find((v2) => v2.id === bibleId) ?? KNOWN_VERSIONS[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80 }}>
      <PlatformMenu currentApp="bible" user={menuUser} />
      <ChapterReader
        book={book}
        chapterNum={chapterNum}
        chapterData={chapterData}
        version={version}
        allVersions={KNOWN_VERSIONS}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
        userId={user.id}
        initialHighlights={highlights ?? []}
        initialBookmarks={bookmarks ?? []}
        initialNotes={notes ?? []}
        bibleId={bibleId}
      />
      <NavBar />
    </div>
  );
}
