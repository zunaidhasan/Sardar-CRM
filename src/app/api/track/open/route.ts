import { NextRequest, NextResponse } from "next/server";
import { recordTrackingEvent } from "@/lib/email-tracking";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get("id");

  if (trackingId) {
    // Fire-and-forget: record the open event without blocking the response
    recordTrackingEvent({
      trackingId,
      eventType: "open",
      userAgent: request.headers.get("user-agent") ?? undefined,
    }).catch(() => {
      // Silently ignore tracking errors — the pixel must always load
    });
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
