export interface Manhua {
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
  _id: string;
  manhua: string;
  chapterNumber: number;
  title?: string;
  language: string;
  pages: ChapterPage[];
  views: number;
  status: "draft" | "published";
}
