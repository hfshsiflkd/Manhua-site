import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorProfileClient } from "./CreatorProfileClient";
import type { PublicCreatorProfile } from "@/lib/api";
import { creatorPublicUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

async function loadCreator(id: string, page: number): Promise<PublicCreatorProfile | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/creators/${encodeURIComponent(id)}?page=${page}&limit=12`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as PublicCreatorProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = Number((await searchParams)?.page || 1) || 1;
  const profile = await loadCreator(id, page);
  if (!profile) {
    return { title: "Профайл олдсонгүй | ARC•READ" };
  }
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${profile.displayName} — ARC•READ дээрх нийтлэгчийн профайл`;
  const url = creatorPublicUrl(profile.id);
  return {
    title: `${profile.displayName} | ARC•READ`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: profile.displayName,
      description,
      url,
      type: "profile",
      images: profile.avatar ? [{ url: profile.avatar }] : undefined,
    },
  };
}

export default async function CreatorPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = Number((await searchParams)?.page || 1) || 1;
  const profile = await loadCreator(id, page);
  if (!profile) notFound();
  return <CreatorProfileClient profile={profile} />;
}
