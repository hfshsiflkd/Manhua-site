"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

interface UserMe {
  _id: string;
  username: string;
  isVIP: boolean;
}

interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

interface Chapter {
  _id: string;
  chapterNumber: number;
  title?: string;
  pages: ChapterPage[];
}

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;
  const chapterParam = params.chapterNumber as string;
  const chapterNumber = Number(chapterParam);

  const [user, setUser] = useState<UserMe | null | undefined>(undefined);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(true);

  // USER LOAD
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get<UserMe>("/auth/me");
        setUser(res.data);
      } catch (e) {
        // token байхгүй, эсвэл алдаа → нэвтрээгүй гэж үзнэ
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    }
    loadUser();
  }, []);

  // CHAPTER LOAD
  useEffect(() => {
    if (!slug || !chapterNumber || Number.isNaN(chapterNumber)) {
      setChapterLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await api.get<Chapter>(
          `/manhuas/${slug}/chapters/${chapterNumber}`
        );
        setChapter(res.data);
      } catch (e) {
        console.error(e);
        setChapter(null);
      } finally {
        setChapterLoading(false);
      }
    }

    load();
  }, [slug, chapterNumber]);

  // Нэгтгээд loading state
  if (userLoading || chapterLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-400">
        Уншиж байна...
      </div>
    );
  }

  // CHAPTER олдоогүй
  if (!chapter) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-sm text-red-400">
        <p>Chapter олдсонгүй эсвэл устгагдсан байна.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
        >
          Буцах
        </button>
      </div>
    );
  }

  // 1) НЭВТРЭЭГҮЙ (user === null)
  if (user === null) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-200">
        <p className="text-sm">Энэ манхуа уншихын тулд эхлээд нэвтэрнэ үү 🔒</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  // 2) НЭВТЭРСЭН Ч VIP БИШ
  if (user && !user.isVIP) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-200">
        <p className="text-sm">
          Энэ манхуа зөвхөн VIP хэрэглэгчдэд нээгдсэн байна ✨
        </p>
        <button
          onClick={() => router.push("/vip")}
          className="rounded-full bg-yellow-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-yellow-200"
        >
          VIP эрх авах
        </button>
        <button
          onClick={() => router.back()}
          className="text-[11px] text-slate-400 hover:text-slate-300"
        >
          Буцах
        </button>
      </div>
    );
  }

  // 3) VIP ХЭРЭГЛЭГЧ → уншина
  return (
    <div className="w-full">
      {/* Header */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 text-[13px] text-slate-300 sm:px-0">
        <div>
          <p className="text-[12px] text-slate-500">{slug}</p>
          <p className="font-semibold text-slate-100">
            Chapter {chapter.chapterNumber}
          </p>
          {chapter.title && (
            <p className="text-[12px] text-slate-400">{chapter.title}</p>
          )}
        </div>
        <button
          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          onClick={() => router.back()}
        >
          Буцах
        </button>
      </header>

      {/* Зурагнууд – дундуур зайгүй, desktop дээр голд */}
      <section className="w-full">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          {chapter.pages.map((p) => (
            <img
              key={p.pageNumber}
              src={p.imageUrl}
              alt=""
              className="block w-full select-none"
              style={{ margin: 0, padding: 0, display: "block" }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
