import type { Polaroid } from "@comeoffline/types";

/**
 * Save a polaroid to the user's device. Progressive: Web Share API (mobile —
 * drops into Photos/IG/messages) → anchor download → open-in-tab fallback.
 * Shared by MemoriesScreen (post-event) and MyMemories (profile gallery).
 */
export async function savePolaroid(photo: Polaroid) {
  const slug = (photo.caption || photo.id || "memory")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "memory";
  const filename = `comeoffline-${slug}.jpg`;

  let blob: Blob | null = null;
  try {
    const res = await fetch(photo.url, { mode: "cors" });
    if (res.ok) blob = await res.blob();
  } catch {
    // CORS or network failure — handled below
  }

  // Web Share API (preferred on mobile — drops into photos / IG / messages)
  if (blob && typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      const canShare = (navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }).canShare;
      if (!canShare || canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: photo.caption || "come offline memory" });
        return;
      }
    } catch {
      // user cancelled or share unsupported — fall through to download
    }
  }

  // Anchor download (desktop / Android Chrome)
  if (blob) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return;
  }

  // Last resort — open the image so the user can long-press / right-click to save
  window.open(photo.url, "_blank", "noopener,noreferrer");
}
