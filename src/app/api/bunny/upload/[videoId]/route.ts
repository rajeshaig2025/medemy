import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/dal";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().max(120).optional(),
});

/**
 * Returns a Bunny direct-upload URL for an already-created video.
 *
 * The API key is used here on the server to build the signed upload URL; it is
 * never sent to the browser. Route Handlers are public entry points, so the
 * instructor role is re-verified before anything is returned.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/bunny/upload/[videoId]">,
) {
  const { videoId } = await context.params;

  if (!/^[\w-]{1,64}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video id." }, { status: 400 });
  }

  const user = await requireRole("INSTRUCTOR").catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Bunny Stream is not configured." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const expires = Math.floor(Date.now() / 1000) + 3600;
  const signature = await hmacSha256Hex(String(expires), apiKey);
  const uploadUrl =
    `https://upload.bunny.net/?expires=${expires}&token=${signature}` +
    `&library_id=${process.env.BUNNY_STREAM_LIBRARY_ID ?? ""}` +
    `&video_id=${videoId}`;

  return NextResponse.json({ uploadUrl });
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
