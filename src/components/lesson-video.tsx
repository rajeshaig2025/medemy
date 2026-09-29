import { Suspense } from "react";
import { isBunnyConfigured, bunnyPlayerUrl, bunnyThumbnailUrl } from "@/lib/bunny";
import type { VideoProvider } from "@/generated/prisma/enums";

type Props = {
  provider: VideoProvider;
  videoId: string | null;
  videoUrl: string | null;
  title: string;
  isPreview: boolean;
  isSignedIn: boolean;
};

/**
 * Renders a lesson's video.
 *
 * The Bunny URL is resolved in a child Server Component so the signed token is
 * generated on the server and never exposed to the client bundle. The iframe
 * sandbox is deliberately restrictive: Bunny's player only needs to play media
 * and talk to its own CDN.
 */
export function LessonVideo(props: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-lg">
      <div className="aspect-video">
        <Suspense fallback={<VideoSkeleton />}>
          <VideoSource {...props} />
        </Suspense>
      </div>
    </div>
  );
}

async function VideoSource({ provider, videoId, videoUrl, title }: Props) {
  if (provider === "BUNNY") {
    if (!videoId) {
      return <Message>No video has been uploaded for this lesson yet.</Message>;
    }
    if (!isBunnyConfigured()) {
      return (
        <Message>
          Video streaming is not configured. Add <Code>BUNNY_STREAM_API_KEY</Code> and{" "}
          <Code>BUNNY_STREAM_LIBRARY_ID</Code> to <Code>.env</Code> to enable playback.
        </Message>
      );
    }

    const src = await bunnyPlayerUrl(videoId);

    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full border-0"
      />
    );
  }

  if (provider === "YOUTUBE") {
    const id = normalizeYouTubeId(videoId ?? videoUrl ?? "");
    if (!id) return <Message>No valid YouTube video is linked to this lesson.</Message>;
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="size-full border-0"
      />
    );
  }

  if (provider === "VIMEO") {
    const id = (videoId ?? videoUrl ?? "").split("/").filter(Boolean).pop();
    if (!id) return <Message>No valid Vimeo video is linked to this lesson.</Message>;
    return (
      <iframe
        src={`https://player.vimeo.com/video/${id}`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="size-full border-0"
      />
    );
  }

  if (videoUrl) {
    // Self-hosted or direct file playback.
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={videoId ? bunnyThumbnailUrl(videoId) : undefined}
        className="size-full"
      >
        <source src={videoUrl} />
        Your browser cannot play this video.
      </video>
    );
  }

  return <Message>No video has been added to this lesson yet.</Message>;
}

function normalizeYouTubeId(value: string) {
  if (/^[\w-]{11}$/.test(value)) return value;
  const match = value.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

function VideoSkeleton() {
  return <div className="size-full animate-pulse bg-ink-800" aria-label="Loading video" />;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid size-full place-items-center bg-ink-900 p-8 text-center text-sm text-ink-300">
      <div className="max-w-md">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-xs text-accent-400">
      {children}
    </code>
  );
}
