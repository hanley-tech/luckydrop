/**
 * Emoji as bundled PNG images (Twemoji), so the game canvas shows emojis on ANY
 * device — even Macs/TVs/Linux boxes whose OS emoji font doesn't render in
 * <canvas>. DOM can use the system font; canvas uses these images.
 */
import { BALL_EMOJIS } from "@/lib/emojis";

function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

const cache = new Map<string, HTMLImageElement>();

/**
 * Returns the loaded emoji image for an id, or null if it hasn't finished
 * loading yet (kick off the load on first call). Callers should fall back to a
 * plain ball while null.
 */
export function getEmojiImage(id: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let img = cache.get(id);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = `${basePath()}/emoji/${id}.png`;
    cache.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Warm the cache for every ball emoji up front. */
export function preloadEmojiImages(): void {
  if (typeof window === "undefined") return;
  for (const e of BALL_EMOJIS) getEmojiImage(e.id);
}
