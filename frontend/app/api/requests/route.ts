import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getMonthKey, readRequests, writeRequests, type RequestItem } from "./_store";

export const dynamic = "force-dynamic";

type RequestListItem = RequestItem & {
  votesThisMonth: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") || getMonthKey();

  const items = await readRequests();
  const enriched: RequestListItem[] = items.map((item) => ({
    ...item,
    votesThisMonth: item.monthlyVotes?.[monthKey] ?? 0,
  }));

  return NextResponse.json({
    monthKey,
    items: enriched,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body?.title || "").trim();
  const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : "";
  const deviceId = request.headers.get("x-device-id") || "";

  if (!title) {
    return NextResponse.json(
      { message: "Манхуа нэр шаардлагатай." },
      { status: 400 }
    );
  }

  const now = new Date();
  const monthKey = getMonthKey(now);
  const items = await readRequests();

  const newItem: RequestItem = {
    id: randomUUID(),
    title,
    imageUrl: imageUrl || undefined,
    createdAt: now.toISOString(),
    monthKey,
    votes: deviceId ? 1 : 0,
    monthlyVotes: deviceId ? { [monthKey]: 1 } : { [monthKey]: 0 },
    votersByMonth: deviceId ? { [monthKey]: [deviceId] } : { [monthKey]: [] },
  };

  items.unshift(newItem);
  await writeRequests(items);

  return NextResponse.json(newItem, { status: 201 });
}
