import { z } from "zod";

// Zod 4 moved the string format validators to the top level (z.email()
// instead of z.string().email()).

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .max(200, { error: "Password must be 200 characters or fewer." })
    .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
    .regex(/[0-9]/, { error: "Password must contain a number." }),
  role: z.enum(["STUDENT", "INSTRUCTOR"]).default("STUDENT"),
});

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Enter your password." }),
});

export const reviewSchema = z.object({
  courseId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

/** Slugifies a course title, e.g. "Hello World!" -> "hello-world". */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
