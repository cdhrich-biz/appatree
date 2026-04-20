// Ably REST 토큰 발급 헬퍼.
// ably-js SDK 대신 순수 fetch로 구현 — 번들/의존성 최소화.
// 토큰은 `session:<sessionKey>`와 `user:<userId>` 채널에만 scope되어 발급된다.
import { ENV } from "./env";

type AblyCapability = Record<string, string[]>;

export interface AblyTokenRequest {
  keyName: string;
  clientId: string;
  capability: string;
  timestamp: number;
  nonce: string;
  mac: string;
  ttl?: number;
}

function assertConfigured() {
  if (!ENV.ablyApiKey) {
    throw new Error("ABLY_API_KEY is not configured");
  }
  const [keyName, keySecret] = ENV.ablyApiKey.split(":");
  if (!keyName || !keySecret) {
    throw new Error("ABLY_API_KEY must be in 'keyName:keySecret' format");
  }
  return { keyName, keySecret };
}

async function hmacSha256Base64(secret: string, payload: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(payload).digest("base64");
}

function randomNonce() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * 세션 참여자(자녀/부모)에게 Ably 토큰을 발급한다.
 * - `user:<userId>` 채널: subscribe/presence (본인 전용 알림)
 * - `session:<sessionKey>` 채널: publish/subscribe/presence
 */
export async function issueAblySessionToken(params: {
  userId: number;
  sessionKey: string;
  ttlMs?: number;
}): Promise<AblyTokenRequest> {
  const { keyName, keySecret } = assertConfigured();
  const capability: AblyCapability = {
    [`user:${params.userId}`]: ["subscribe", "presence"],
    [`session:${params.sessionKey}`]: ["publish", "subscribe", "presence"],
  };
  const ttl = params.ttlMs ?? 60 * 60 * 1000; // 1h
  const timestamp = Date.now();
  const nonce = randomNonce();
  const capabilityStr = JSON.stringify(capability);
  const clientId = String(params.userId);

  // Ably signature payload spec:
  // keyName\nttl\ncapability\nclientId\ntimestamp\nnonce
  const payload = [keyName, String(ttl), capabilityStr, clientId, String(timestamp), nonce].join("\n");
  const mac = await hmacSha256Base64(keySecret, payload);

  return {
    keyName,
    clientId,
    capability: capabilityStr,
    timestamp,
    nonce,
    mac,
    ttl,
  };
}

/**
 * 부모가 구독 전용으로 `user:<userId>` 채널 토큰을 받을 때 사용.
 */
export async function issueAblyUserToken(params: {
  userId: number;
  ttlMs?: number;
}): Promise<AblyTokenRequest> {
  const { keyName, keySecret } = assertConfigured();
  const capability: AblyCapability = {
    [`user:${params.userId}`]: ["subscribe", "presence"],
  };
  const ttl = params.ttlMs ?? 60 * 60 * 1000;
  const timestamp = Date.now();
  const nonce = randomNonce();
  const capabilityStr = JSON.stringify(capability);
  const clientId = String(params.userId);

  const payload = [keyName, String(ttl), capabilityStr, clientId, String(timestamp), nonce].join("\n");
  const mac = await hmacSha256Base64(keySecret, payload);

  return {
    keyName,
    clientId,
    capability: capabilityStr,
    timestamp,
    nonce,
    mac,
    ttl,
  };
}

/**
 * 서버가 직접 publish할 때 사용. 세션 요청 알림을 부모 채널로 송신한다.
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown,
): Promise<void> {
  const { keyName, keySecret } = assertConfigured();
  const auth = Buffer.from(`${keyName}:${keySecret}`).toString("base64");
  const url = `https://rest.ably.io/channels/${encodeURIComponent(channelName)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: eventName, data }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ably publish failed (${res.status}): ${body}`);
  }
}
