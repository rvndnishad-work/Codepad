"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * `next/image` throws if the src host isn't in `next.config.ts`
 * `images.remotePatterns`. Cover images and avatars come from arbitrary
 * user-pasted URLs, so a strict allowlist crashes the page. This wrapper
 * uses a custom `loader` that returns the src unchanged — bypassing the host
 * check — while still giving us lazy-loading, responsive `sizes`, and the
 * <img>-with-fill-and-LCP-priority benefits.
 *
 * Data URLs and known-broken sources fall back to a plain `<img>` so we never
 * crash a page on bad content.
 */
type Props = Omit<ImageProps, "loader"> & { src: string };

export default function SafeImage(props: Props) {
  const [failed, setFailed] = useState(false);
  const isDataUrl = typeof props.src === "string" && props.src.startsWith("data:");

  if (failed || !props.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={props.src}
        alt={typeof props.alt === "string" ? props.alt : ""}
        className={props.className}
        style={
          props.fill
            ? {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }
            : undefined
        }
        loading={(props.priority ? "eager" : props.loading) ?? "lazy"}
      />
    );
  }

  // A custom identity loader can't feed next/image's responsive srcset (it
  // ignores width), which trips the missing-loader-width warning for `fill`
  // images. Remote covers arrive pre-sized (Unsplash URLs carry their own
  // w/q params), so bypass optimization for `fill` and keep lazy-loading +
  // fill layout. Sized (non-fill) images keep the identity loader path.
  const skipOptimize = isDataUrl || props.fill;

  return (
    <Image
      {...props}
      loader={skipOptimize ? undefined : ({ src }) => src}
      unoptimized={skipOptimize ? true : props.unoptimized}
      onError={() => setFailed(true)}
    />
  );
}
