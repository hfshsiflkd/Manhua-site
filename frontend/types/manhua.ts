// src/types/manhua.ts
export interface Manhua {
  chapters: never[];
  ratingAverage: number;
  updatedAt: string | number | Date;
  lastChapter: string | null | undefined;
  latestChapterAt: string | null | undefined;
  _id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  status: "ongoing" | "completed" | "hiatus";
  genres?: string[];
  author?: string;
  artist?: string;
  views: number;
  lastChapterNumber?: number | null;
  lastChapterId?: string | null;
  lastChapterAt?: string | null;
  
}

export interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
}

export interface Chapter {
  createdAt?: string;
  updatedAt?: string;
  _id: string;
  manhua?: string;
  chapterNumber: number;
  title?: string;
  language: string;
  pages: ChapterPage[];
  views?: number;
  status: "draft" | "published";
  releaseAt?: string;
  hasPrev: boolean;
  hasNext: boolean;
}
