"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addLesson,
  addSection,
  requestVideoUpload,
  type LessonFormState,
} from "@/app/actions/courses";

export function AddLessonForm({
  sectionId,
  courseSlug,
}: {
  sectionId: string;
  courseSlug: string;
}) {
  const [state, formAction] = useActionState<LessonFormState, FormData>(addLesson, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        + Add lesson
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sectionId" value={sectionId} />

      {state?.message && (
        <p
          role={state.message === "Lesson added." ? "status" : "alert"}
          className={`rounded-lg px-3 py-2 text-sm ${
            state.message === "Lesson added."
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor={`title-${sectionId}`} className="block text-sm font-medium">
            Lesson title
          </label>
          <input
            id={`title-${sectionId}`}
            name="title"
            required
            placeholder="e.g. Reading the query plan"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          {state?.errors?.title && (
            <p className="mt-1 text-sm text-red-600">{state.errors.title[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor={`duration-${sectionId}`} className="block text-sm font-medium">
            Duration (minutes)
          </label>
          <input
            id={`duration-${sectionId}`}
            name="durationMinutes"
            type="number"
            min="0"
            max="600"
            defaultValue="5"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`summary-${sectionId}`} className="block text-sm font-medium">
          Summary <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <input
          id={`summary-${sectionId}`}
          name="summary"
          placeholder="One line shown under the player"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <VideoField courseSlug={courseSlug} />

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="isPreview"
          className="size-4 rounded border-ink-300"
        />
        Free preview (watchable without enrolling)
      </label>

      <div className="flex items-center gap-2">
        <LessonSubmitButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LessonSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save lesson"}
    </button>
  );
}

/**
 * Uploads a video straight to Bunny from the browser. The file never passes
 * through the Next.js server, which keeps memory and request limits out of the
 * picture for large course recordings.
 */
function VideoField({ courseSlug }: { courseSlug: string }) {
  const [videoId, setVideoId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus(null);
    try {
      const { id } = await requestVideoUpload(file.name);
      const { bunnyUploadUrl } = await fetchBunnyUploadEndpoint(id, file);
      setVideoId(id);
      setStatus(`Uploaded "${file.name}" (${id})`);
      void bunnyUploadUrl;
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Upload failed. Is Bunny configured?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor={`video-${courseSlug}`} className="block text-sm font-medium">
        Lesson video
      </label>
      <input
        id={`video-${courseSlug}`}
        type="file"
        accept="video/*"
        onChange={handleFile}
        disabled={busy}
        className="mt-1 block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-700 hover:file:bg-ink-200"
      />
      <input type="hidden" name="bunnyVideoId" value={videoId} />
      {status && (
        <p className={`mt-1 text-sm ${busy ? "text-ink-600" : "text-emerald-700"}`}>
          {busy ? "Uploading..." : status}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-500">
        Leave empty to add the lesson now and attach a video later.
      </p>
    </div>
  );
}

/**
 * Bunny's direct-upload flow is: create the video server-side, then PUT the
 * file to the returned upload endpoint. The endpoint construction is kept here
 * so the API key never reaches the browser.
 */
async function fetchBunnyUploadEndpoint(videoId: string, file: File) {
  const response = await fetch(`/api/bunny/upload/${videoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not get an upload URL (${response.status}).`);
  }

  const { uploadUrl } = (await response.json()) as { uploadUrl: string };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    },
    body: file,
  });

  if (!put.ok) {
    throw new Error("Bunny rejected the upload.");
  }

  return { bunnyUploadUrl: uploadUrl };
}

export function AddSectionForm({
  courseId,
  courseSlug,
}: {
  courseId: string;
  courseSlug: string;
}) {
  const [state, formAction] = useActionState<LessonFormState, FormData>(addSection, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-3">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="flex-1 min-w-48">
        <label htmlFor={`section-title-${courseSlug}`} className="sr-only">
          Section title
        </label>
        <input
          id={`section-title-${courseSlug}`}
          name="title"
          required
          placeholder="Section title, e.g. Foundations"
          className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <SectionSubmitButton />

      {state?.message && (
        <p role="status" className="w-full text-sm text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

function SectionSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-semibold transition hover:border-ink-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add section"}
    </button>
  );
}
