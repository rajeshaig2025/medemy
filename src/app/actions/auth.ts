"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema, signupSchema } from "@/lib/validation";

export type AuthFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    // Anyone can sign up to publish. Payments land later; the first paid course
    // submission is when a payout profile and tax checks become necessary.
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { message: "An account with that email already exists." };
  }

  // 12 rounds is the current bcrypt default for a good security/UX balance.
  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, passwordHash, role: role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT" },
  });

  await createSessionByEmail(email);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Compare against a dummy hash when the user does not exist so that the
  // response time does not reveal which emails are registered.
  const passwordHash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const valid = await bcrypt.compare(password, passwordHash);

  if (!user || !valid) {
    return { message: "Incorrect email or password." };
  }

  await createSessionByEmail(email);

  const next = formData.get("next");
  // Only allow same-origin relative paths, otherwise this is an open redirect.
  const destination = typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

async function createSessionByEmail(email: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  await createSession(user.id);
}
