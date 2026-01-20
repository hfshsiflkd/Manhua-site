import { promises as fs } from "fs";
import path from "path";

export type RequestItem = {
  id: string;
  title: string;
  imageUrl?: string;
  createdAt: string;
  monthKey: string;
  votes: number;
  monthlyVotes: Record<string, number>;
  votersByMonth: Record<string, string[]>;
};

const DATA_PATH = path.join(process.cwd(), "data", "requests.json");

async function ensureStoreFile() {
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, "[]", "utf-8");
  }
}

export async function readRequests(): Promise<RequestItem[]> {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  try {
    return JSON.parse(raw) as RequestItem[];
  } catch {
    return [];
  }
}

export async function writeRequests(items: RequestItem[]) {
  await ensureStoreFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
