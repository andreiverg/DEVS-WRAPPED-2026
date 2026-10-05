/**
 * Fetches and decodes images ahead of time, so a slide's art is ready the
 * moment it mounts. Without this, image-heavy slides (the poster collage,
 * the exec headshots) start downloading/decoding multi-MB files right as
 * their transition begins, which stalls the transition mid-animation.
 */
const pending = new Map<string, HTMLImageElement>();

export function preloadImages(urls: readonly string[]): void {
  for (const url of urls) {
    if (pending.has(url)) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    // Held in the map so the decoded image isn't garbage-collected before use.
    pending.set(url, img);
    img.decode().catch(() => {
      // A failed preload is fine — the slide's own <img> will just load it normally.
    });
  }
}
