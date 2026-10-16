"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src" | "onError" | "unoptimized"> & {
  src: string;
  fallback?: string | null;
};

export function StorefrontDiscoveryImage({ src, fallback, alt, ...props }: Props) {
  const [failure, setFailure] = useState({ src: "", attempt: 0 });
  const attempt = failure.src === src ? failure.attempt : 0;
  // A slow remote optimizer must not leave the product blank: try the original
  // directly, then its existing catalog thumbnail. A different scene resets it.
  if (attempt >= 3) return <span role="img" aria-label={alt}>Foto indisponível</span>;
  return <Image {...props} alt={alt} src={attempt >= 2 ? fallback || src : src} unoptimized={attempt > 0}
    onError={() => setFailure(previous => ({ src, attempt: previous.src === src ? previous.attempt + 1 : 1 }))} />;
}
