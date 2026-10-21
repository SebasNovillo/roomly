import { z } from "zod";

export const spaceTypes = {
  "meeting-room": "Meeting room", "study-room": "Study room", "conference-room": "Conference room",
  "private-office": "Private office", "collaboration-room": "Collaboration room", "coworking-area": "Coworking area",
} as const;
export const amenityLabels = {
  "wi-fi": "Wi-Fi", whiteboard: "Whiteboard", display: "Display",
  "power-outlets": "Power outlets", "video-conferencing": "Video conferencing",
} as const;
export type SpaceType = keyof typeof spaceTypes;
export type Amenity = keyof typeof amenityLabels;
export type SearchParams = Record<string, string | string[] | undefined>;
export type CatalogFilters = { q: string; minCapacity: number | null; type: SpaceType | ""; amenities: Amenity[]; page: number };
export const PAGE_SIZE = 12;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function parseFilters(params: SearchParams): CatalogFilters {
  const capacity = first(params.minCapacity) ?? "";
  const type = first(params.type) ?? "";
  const page = first(params.page) ?? "";
  const amenities = typeof params.amenity === "string" ? [params.amenity] : params.amenity ?? [];
  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    minCapacity: /^\d{1,5}$/.test(capacity) && Number(capacity) >= 1 && Number(capacity) <= 10000 ? Number(capacity) : null,
    type: Object.hasOwn(spaceTypes, type) ? type as SpaceType : "",
    amenities: [...new Set(amenities.filter((key): key is Amenity => Object.hasOwn(amenityLabels, key)))].sort(),
    page: /^\d{1,5}$/.test(page) && Number(page) >= 1 && Number(page) <= 10000 ? Number(page) : 1,
  };
}

export function filterQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.minCapacity) params.set("minCapacity", String(filters.minCapacity));
  if (filters.type) params.set("type", filters.type);
  filters.amenities.forEach(key => params.append("amenity", key));
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function catalogHref(filters: CatalogFilters): string {
  const query = filterQuery(filters);
  return `/dashboard/spaces${query ? `?${query}` : ""}`;
}
export function detailHref(slug: string, filters: CatalogFilters): string {
  const query = filterQuery(filters);
  return `/dashboard/spaces/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}
export function hasFilters(filters: CatalogFilters) {
  return Boolean(filters.q || filters.minCapacity || filters.type || filters.amenities.length);
}
// Literal substring search: wildcard characters do not broaden the user's query.
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export const imageSchema = z.object({
  image_url: z.string().max(2048).refine(value => /^\/images\/spaces\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(value) || (() => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  })()),
  alt_text: z.string().trim().min(1).max(240), sort_order: z.number().int().nonnegative(),
  source_credit: z.string().nullable(),
});
export const spaceSchema = z.object({
  id: z.uuid(), slug: z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(5000),
  type: z.enum(Object.keys(spaceTypes) as [SpaceType, ...SpaceType[]]),
  floor: z.string().trim().min(1).max(60), capacity: z.number().int().min(1).max(10000),
  amenities: z.array(z.enum(Object.keys(amenityLabels) as [Amenity, ...Amenity[]])).max(20).transform(values => [...new Set(values)]),
  is_demo: z.boolean(),
  images: z.array(imageSchema).transform(images => images.sort((a, b) => a.sort_order - b.sort_order)),
});
export type Space = z.infer<typeof spaceSchema>;
export type CatalogFailure = { ok: false; kind: "setup" | "load" };
export type CatalogResult = { ok: true; spaces: Space[]; total: number } | CatalogFailure;
export type DetailResult = { ok: true; space: Space | null } | CatalogFailure;
