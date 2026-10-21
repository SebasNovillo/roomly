import type { ComponentPropsWithoutRef } from "react";
// Only an image adapter for the isolated Vite test renderer; production uses Next Image.
export default function Image({ priority, unoptimized, ...props }: ComponentPropsWithoutRef<"img"> & { priority?: boolean; unoptimized?: boolean }) {
  void priority;
  void unoptimized;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt} />;
}
