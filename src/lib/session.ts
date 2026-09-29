import "server-only";

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "coursehub_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/**
 * The raw token only ever exists in the user's cookie. The database stores a
 * SHA-256 digest, so a leaked database dump cannot be replayed as a session.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { token: hashToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    // Delete the row too, otherwise the session stays valid server-side even
    // though the browser no longer sends the cookie.
    await db.session
      .deleteMany({ where: { token: hashToken(token) } })
      .catch(() => {});
  }

  cookieStore.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  avatarUrl: string | null;
};

/**
 * Returns the signed-in user, or null. Always hits the database, so it is safe
 * to trust for authorization decisions. Wrap callers in React `cache()` to
 * avoid duplicate queries within a single render.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const digest = hashToken(token);
  const session = await db.session.findUnique({
    where: { token: digest },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    // Expired rows accumulate; clean this one up on read.
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/** Constant-time string compare, used when verifying user-supplied secrets. */
export function safeCompare(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export { SESSION_TTL_MS };
