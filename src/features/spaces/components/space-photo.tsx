"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { Space } from "../catalog";

export function SpacePhoto({ image, priority = false }: { image?: Space["images"][number]; priority?: boolean }) {
  const [failedUrl, setFailedUrl] = useState("");
  if (!image || failedUrl === image.image_url) return <div className="space-photo-fallback"><ImageOff size={26} aria-hidden="true" /><span>Photo unavailable</span></div>;
  return <Image src={image.image_url} alt={image.alt_text} width={900} height={600} priority={priority}
    sizes="(max-width: 639px) 100vw, (max-width: 1199px) 50vw, 33vw" unoptimized={image.image_url.startsWith("https:")}
    referrerPolicy="no-referrer" onError={() => setFailedUrl(image.image_url)} />;
}
