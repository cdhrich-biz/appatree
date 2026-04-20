// Metered.ca TURN 서버 자격증명 발급.
// 로그인한 사용자에게만 짧은 TTL 자격증명을 반환해 클라이언트에 하드코딩되지 않도록 한다.
import { ENV } from "./env";

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

/**
 * Metered REST API로 TURN 자격증명 목록을 가져온다.
 * 환경변수 METERED_TURN_DOMAIN 예시: "appatree.metered.live"
 * 환경변수 METERED_TURN_KEY: Metered 대시보드의 API key
 *
 * 미구성 상태면 Google 공개 STUN만 반환한다. (음성 통화는 대부분 NAT 환경에서
 * STUN만으로는 연결되지 않을 수 있으므로, 프로덕션에서는 TURN 필수.)
 */
export async function getIceServers(): Promise<IceServer[]> {
  const fallback: IceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ];

  if (!ENV.meteredTurnKey || !ENV.meteredTurnDomain) {
    return fallback;
  }

  try {
    const url = `https://${ENV.meteredTurnDomain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(ENV.meteredTurnKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[TURN] Metered credentials fetch failed:", res.status);
      return fallback;
    }
    const json = (await res.json()) as IceServer[];
    return Array.isArray(json) && json.length > 0 ? [...fallback, ...json] : fallback;
  } catch (error) {
    console.warn("[TURN] Metered credentials error:", error);
    return fallback;
  }
}
