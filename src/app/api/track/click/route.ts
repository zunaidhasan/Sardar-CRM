import { NextRequest, NextResponse } from "next/server";
import { recordTrackingEvent } from "@/lib/email-tracking";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get("id");
  const originalUrl = searchParams.get("url");

  if (trackingId && originalUrl) {
    // Fire-and-forget: record the click event
    recordTrackingEvent({
      trackingId,
      eventType: "click",
      linkUrl: originalUrl,
      userAgent: request.headers.get("user-agent") ?? undefined,
    }).catch(() => {
      // Silently ignore tracking errors
    });
  }

  // Redirect to the original URL
  if (originalUrl) {
    return NextResponse.redirect(originalUrl, 302);
  }

  // Fallback: redirect to home if no URL provided
  return NextResponse.redirect("/", 302);
}
