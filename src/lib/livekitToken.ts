/* eslint-disable @typescript-eslint/no-explicit-any */
import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
// const wsUrl = process.env.LIVEKIT_URL;

export async function getLiveKitToken(userId: any, roomName: any) {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId
  });

  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  const jwtToken = await token.toJwt();

  return jwtToken;
}
