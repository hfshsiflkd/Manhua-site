/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { ChapterNav } from "../components/ChapterNav";
import  VipGateOverlay  from "@/app/components/VipGateOverlay";
import VipTrialReminder from "@/app/components/VipTrialReminder";



interface UserMe {
  _id: string;
  username: string;
  isVIP: boolean;
  vipExpiresAt?: string | null;
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
  hasPrev: boolean;
  hasNext: boolean;
}

/* ------------------------------ PAGE LOADER ------------------------------ */

function PageWithLoader({ page }: { page: ChapterPage }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full mb-2">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 z-10">
          <div className="loader scale-75 md:scale-90" />
        </div>
      )}

      {error && (
        <div className="flex h-[60vh] items-center justify-center bg-slate-900 text-sm text-red-400">
          Зургийг ачаалж чадсангүй...
        </div>
      )}

      <img
        src={page.imageUrl}
        alt=""
        className={`block w-full select-none transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
    </div>
  );
}

function ChapterPages({ chapter }: { chapter: Chapter }) {
  const sorted = [...chapter.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  return (
    <section className="w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        {sorted.map((p) => (
          <PageWithLoader key={p.pageNumber} page={p} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ FALLBACK COMPONENTS ------------------------------ */

function LoadingState() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="loader scale-125" />
    </div>
  );
}

function ChapterNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-red-400">
      <p>Chapter олдсонгүй эсвэл устгагдсан байна.</p>
      <button
        onClick={onBack}
        className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-[12px] text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
      >
        Буцах
      </button>
    </div>
  );
}

function LoginRequired({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-slate-200">
      <p className="text-sm mb-3">
        Энэ манхуа уншихын тулд эхлээд нэвтэрнэ үү 🔒
      </p>
      <button
        onClick={onLogin}
        className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
      >
        Нэвтрэх
      </button>
    </div>
  );
}

/* ------------------------------ HEADER ------------------------------ */

function ChapterHeader({
  slug,
  chapter,
  onBack,
}: {
  slug: string;
  chapter: Chapter;
  onBack: () => void;
}) {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 text-[13px] text-slate-300">
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
        onClick={onBack}
        className="rounded-full border border-slate-700 px-3 py-1 text-[12px] text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
      >
        Буцах
      </button>
    </header>
  );
}

/* ------------------------------ MAIN PAGE ------------------------------ */

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

  // ✅ Хэрвээ backend VIP биш үед chapter endpoint-оос 403 өгдөг бол
  const [vipGateFromApi, setVipGateFromApi] = useState(false);

  useEffect(() => {
    if (chapter) window.scrollTo({ top: 0, behavior: "auto" });
  }, [chapter]);

  // Load user
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<UserMe>("/auth/me");
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    }
    load();
  }, []);

  // Load chapter
  useEffect(() => {
    async function load() {
      setVipGateFromApi(false);
      try {
        const res = await api.get<Chapter>(
          `/manhuas/${slug}/chapters/${chapterNumber}`
        );
        setChapter(res.data);
      } catch (err: any) {
        // ✅ VIP required (backend 403)
        if (err?.response?.status === 403) {
          setVipGateFromApi(true);
          setChapter(null); // контент байхгүй байж болно
        } else {
          setChapter(null);
        }
      } finally {
        setChapterLoading(false);
      }
    }
    load();
  }, [slug, chapterNumber]);

  if (userLoading || chapterLoading) return <LoadingState />;

  if (user === null)
    return <LoginRequired onLogin={() => router.push("/login")} />;

  // ✅ VIP эсэх
  const canRead = user?.isVIP === true;
  const showVipGate = !canRead || vipGateFromApi;

  // Chapter олдохгүй (vipGateFromApi биш үед)
  if (!chapter && !vipGateFromApi)
    return <ChapterNotFound onBack={() => router.back()} />;

  return (
    <div className="w-full">
      {/* ✅ Trial дуусахаас 24 цагийн өмнө banner */}
      <VipTrialReminder
        isVIP={user?.isVIP}
        vipExpiresAt={user?.vipExpiresAt ?? null}
      />

      {/* Header (chapter байхгүй үед placeholder) */}
      {chapter ? (
        <ChapterHeader
          slug={slug}
          chapter={chapter}
          onBack={() => router.back()}
        />
      ) : (
        <div className="mx-auto max-w-3xl px-3 py-3 text-[13px] text-slate-300">
          <p className="text-[12px] text-slate-500">{slug}</p>
          <p className="font-semibold text-slate-100">
            Chapter {chapterNumber}
          </p>
        </div>
      )}

      {chapter && (
        <ChapterNav
          slug={slug}
          chapterNumber={chapter.chapterNumber}
          hasPrev={chapter.hasPrev}
          hasNext={chapter.hasNext}
          homePath="/"
        />
      )}

      {/* ✅ VIP overlay: унших хэсэг дээр */}
      <div className="relative">
        {chapter ? (
          <div
            className={
              showVipGate ? "pointer-events-none select-none blur-[1.5px]" : ""
            }
          >
            <ChapterPages chapter={chapter} />
          </div>
        ) : (
          <div className="mx-auto flex h-[55vh] w-full max-w-3xl items-center justify-center text-slate-400">
            Content unavailable
          </div>
        )}

        {showVipGate && (
          <VipGateOverlay
            title="VIP эрх шаардлагатай"
            subtitle="Таны trial дууссан байна. VIP эрх авснаар бүх chapter-уудыг бүрэн уншина."
            onGoVip={() => router.push("/vip")}
            onBack={() => router.back()}
          />
        )}
      </div>

      {chapter && (
        <ChapterNav
          slug={slug}
          chapterNumber={chapter.chapterNumber}
          hasPrev={chapter.hasPrev}
          hasNext={chapter.hasNext}
          homePath="/"
        />
      )}
    </div>
  );
}
