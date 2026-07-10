import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const dynamic = "force-dynamic";

/**
 * /l/<code> — trackable short link behind the printed QR codes.
 *
 * Resolves the destination from the API (which counts the scan) and 302s.
 * A poster scan must never dead-end: unknown/paused codes and API failures
 * all fall through to the homepage tagged as a poster visit, so the person
 * still lands somewhere that makes sense and the visit is still attributed.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let destination: string | null = null;
  try {
    const res = await fetch(`${API_URL}/api/links/public/${encodeURIComponent(code)}/hit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_agent: req.headers.get("user-agent") || undefined,
        referer: req.headers.get("referer") || undefined,
      }),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      destination = data?.data?.destination ?? null;
    }
  } catch {
    // fall through to the fallback redirect
  }

  const target = new URL(destination || "/?utm_source=poster&utm_medium=offline", req.nextUrl.origin);
  // Forward any extra params on the scanned URL (e.g. a hand-added utm_content)
  // without clobbering what the destination already sets
  req.nextUrl.searchParams.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target, 302);
}
