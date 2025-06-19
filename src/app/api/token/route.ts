import { getLiveKitToken } from "@/lib/livekitToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // fetch data
    const { userId, room } = await req.json();
    console.log("userId", userId);
    // validation
    if (!room || !userId)
      return NextResponse.json({ error: "Invalid request" }, { status: 404 });

    // extract token
    const token = await getLiveKitToken(userId, room);
    console.log("token", token);
    return NextResponse.json(
      {
        token,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.log(error);
    return;
  }
}
