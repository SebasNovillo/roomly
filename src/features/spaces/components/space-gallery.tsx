"use client";

import { useId, useRef, useState } from "react";
import type { Space } from "../catalog";
import { SpacePhoto } from "./space-photo";

export function SpaceGallery({ name, images }: { name: string; images: Space["images"] }) {
  const uniqueImages = images.filter((image, index) => images.findIndex(other => other.image_url === image.image_url) === index);
  return <Gallery key={JSON.stringify(uniqueImages.map(image => image.image_url))} name={name} images={uniqueImages} />;
}

function Gallery({ name, images }: { name: string; images: Space["images"] }) {
  const [selected, setSelected] = useState(0);
  const photoId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const image = images[selected];
  return <section className="space-detail-gallery" aria-label={`${name} photo gallery`}>
    <figure><div id={photoId} className="gallery-main-photo"><SpacePhoto key={image?.image_url ?? "empty"} image={image} priority /></div>
      {image && <figcaption className="gallery-caption"><span aria-live="polite">Photo {selected + 1} of {images.length}</span>{image.source_credit && <span>{image.source_credit}</span>}</figcaption>}
    </figure>
    {images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label={`${name} gallery thumbnails`} onKeyDown={event => {
      const focused = buttons.current.indexOf(event.target as HTMLButtonElement);
      if (focused < 0) return;
      const next = event.key === "ArrowRight" ? (focused + 1) % images.length : event.key === "ArrowLeft" ? (focused - 1 + images.length) % images.length : event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : null;
      if (next !== null) { event.preventDefault(); setSelected(next); buttons.current[next]?.focus(); }
    }}>{images.map((photo, index) => <button key={photo.image_url} ref={element => { buttons.current[index] = element; }} type="button" aria-label={`Show photo ${index + 1} of ${name}`} aria-pressed={selected === index} aria-controls={photoId} onClick={() => setSelected(index)}><SpacePhoto image={photo} /></button>)}</div>}
  </section>;
}
