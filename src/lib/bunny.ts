import "server-only";

/**
 * Bunny Stream integration.
 *
 * Two separate credentials are involved and they are easy to confuse:
 *   - BUNNY_STREAM_API_KEY  -> used from the server to manage videos
 *   - BUNNY_STREAM_LIBRARY_ID -> the numeric Stream library id
 *
 * Playback uses *signed* URLs (short-lived tokens) so that a leaked player URL
 * cannot be replayed forever. Unsigned CDN paths are never rendered.
 */

const CDN_BASE = "https://iframe.mediadelivery.net";
const API_BASE = "https://api.bunny.net/stream";

const TOKEN_TTL_SECONDS = 60 * 60 * 4; // 4 hours

export function isBunnyConfigured() {
  return Boolean(process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_LIBRARY_ID);
}

/**
 * Builds a signed playback token for a Bunny video id.
 *
 * The signature is HMAC-SHA256 over `videoId + expiration`, using the *API key*
 * as the secret, exactly as Bunny's token-auth spec requires.
 */
export async function signBunnyPlayback(videoId: string) {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!apiKey) throw new Error("BUNNY_STREAM_API_KEY is not configured");

  const expires = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const signature = await hmacSha256Hex(`${videoId}${expires}`, apiKey);
  return { token: `${expires}${signature}`, expires };
}

async function hmacSha256Hex(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Player embed URL for a Bunny video, using the official iframe player. */
export async function bunnyPlayerUrl(videoId: string) {
  const { token } = await signBunnyPlayback(videoId);
  const params = new URLSearchParams({
    token,
    autoplay: "false",
    muted: "false",
    controls: "true",
  });
  return `${CDN_BASE}/embed/${videoId}/play?${params.toString()}`;
}

export type BunnyUploadResult = { id: string };

/**
 * Creates a direct-upload slot. The browser then PUTs the file straight to
 * Bunny, so large video files never pass through this server.
 */
export async function createBunnyUpload(title: string): Promise<BunnyUploadResult> {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!apiKey || !libraryId) {
    throw new Error("Bunny Stream is not configured");
  }

  const res = await fetch(`${API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw new Error(`Bunny upload creation failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { guid: string };
  return { id: data.guid };
}

/** Public URL for a video's thumbnail, used as the course/lesson poster. */
export function bunnyThumbnailUrl(videoId: string) {
  return `https://poster.mediadelivery.net/${videoId}/thumbnail.jpg`;
}
