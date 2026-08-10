"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  rounded?: boolean;
}

const SIZES = {
  sm: "h-6",
  md: "h-8",
  lg: "h-14",
};

/**
 * Brand logo for Sardar CRM.
 *
 * Uses the uploaded brand lockup at /sardar-logo.webp when present (drop the
 * file into /workspace/public). The lockup is wide (1600x374) so it renders
 * with object-contain at its natural aspect ratio. Falls back to the square
 * branded mark (public/sardar-mark.svg) if the upload is missing.
 */
export function AppLogo({ size = "md", className, rounded = true }: AppLogoProps) {
  const [useUpload, setUseUpload] = React.useState(true);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        SIZES[size],
        className,
      )}
      style={useUpload ? { aspectRatio: "1600 / 374" } : undefined}
    >
      {useUpload ? (
        <Image
          src="/sardar-logo.webp"
          alt="Sardar CRM"
          fill
          priority
          sizes="256px"
          className="object-contain object-left"
          onError={() => setUseUpload(false)}
        />
      ) : (
        <span
          className={cn(
            "relative inline-flex h-full w-auto shrink-0 items-center justify-center overflow-hidden bg-primary text-primary-foreground",
            rounded ? "rounded-lg" : "rounded-none",
          )}
          style={{ aspectRatio: "1 / 1" }}
        >
          <Image
            src="/sardar-mark.svg"
            alt="Sardar CRM"
            fill
            priority
            sizes="48px"
            className="object-cover"
          />
        </span>
      )}
    </span>
  );
}
