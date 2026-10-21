"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { amenityLabels, type Amenity } from "../catalog";

export function AmenitiesFilter({ selected }: { selected: Amenity[] }) {
  // The parent form is keyed to the applied URL filters, so navigation resets
  // this local draft. Editing it never submits the form or changes the URL.
  const [draft, setDraft] = useState(selected);
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  function close() {
    if (details.current) details.current.open = false;
    summary.current?.focus();
  }
  return <details ref={details} className="amenities-select" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
    <summary ref={summary} aria-labelledby="amenities-label amenities-selection"><span id="amenities-selection">{draft.length ? `${draft.length} selected` : "Any amenities"}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <fieldset className="amenities-options"><legend className="sr-only">Require all selected amenities</legend>{Object.entries(amenityLabels).map(([key, label]) => <label key={key}><input type="checkbox" name="amenity" value={key} checked={draft.includes(key as Amenity)} onChange={event => {
      const checked = event.currentTarget.checked;
      setDraft(previous => checked ? [...previous, key as Amenity] : previous.filter(amenity => amenity !== key));
    }} />{label}</label>)}<p>Spaces must include every selected amenity.</p><button className="text-link" type="button" onClick={close}>Done</button></fieldset>
  </details>;
}
