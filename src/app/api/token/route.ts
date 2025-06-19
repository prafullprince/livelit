import { getLiveKitToken } from "@/lib/livekitToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, room } = await req.json();
    console.log("userId", userId);

    if (!room || !userId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const token = await getLiveKitToken(userId, room);
    console.log("token", token);

    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/token:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
