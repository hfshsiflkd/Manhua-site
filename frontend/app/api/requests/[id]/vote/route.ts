import { NextResponse } from "next/server";
import { getMonthKey, readRequests, writeRequests } from "../../_store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const deviceId = request.headers.get("x-device-id") || "";
  if (!deviceId) {
    return NextResponse.json(
      { message: "Device ID байхгүй байна." },
      { status: 400 }
    );
  }

  const items = await readRequests();
  const item = items.find((i) => i.id === params.id);
  if (!item) {
    return NextResponse.json({ message: "Хүсэлт олдсонгүй." }, { status: 404 });
  }

  const monthKey = getMonthKey();
  const voters = item.votersByMonth?.[monthKey] ?? [];

  if (voters.includes(deviceId)) {
    return NextResponse.json(
      { message: "Та энэ сард санал өгсөн байна." },
      { status: 409 }
    );
  }

  const nextVoters = [...voters, deviceId];
  const nextMonthVotes = (item.monthlyVotes?.[monthKey] ?? 0) + 1;

  item.votersByMonth = {
    ...item.votersByMonth,
    [monthKey]: nextVoters,
  };
  item.monthlyVotes = {
    ...item.monthlyVotes,
    [monthKey]: nextMonthVotes,
  };
  item.votes = (item.votes ?? 0) + 1;

  await writeRequests(items);

  return NextResponse.json({
    ...item,
    votesThisMonth: nextMonthVotes,
  });
}
