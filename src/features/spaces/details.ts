import { z } from "zod";
import type { CatalogFailure, Space } from "./catalog";

export const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/);
const day = z.number().int().min(0).max(6);
export const openingHourSchema = z.discriminatedUnion("is_closed", [
  z.object({ weekday: day, is_closed: z.literal(true), opens_at: z.null(), closes_at: z.null() }),
  z.object({ weekday: day, is_closed: z.literal(false), opens_at: clockTime, closes_at: clockTime })
    .refine(row => row.opens_at.slice(0, 5) < row.closes_at.slice(0, 5)),
]);
export const openingHoursSchema = z.array(openingHourSchema).max(7)
  .refine(rows => new Set(rows.map(row => row.weekday)).size === rows.length);
export const ruleSchema = z.object({ rule_text: z.string().trim().min(1).max(1000), sort_order: z.number().int().nonnegative() });
export const rulesSchema = z.array(ruleSchema).refine(rows => new Set(rows.map(row => row.sort_order)).size === rows.length);
export type OpeningHour = z.infer<typeof openingHourSchema>;
export type SpaceRule = z.infer<typeof ruleSchema>;
export type DetailSection<T> = { ok: true; rows: T[] } | { ok: false };
export type DetailedSpace = Space & { openingHours: DetailSection<OpeningHour>; rules: DetailSection<SpaceRule> };
export type DetailResult = { ok: true; space: DetailedSpace | null } | CatalogFailure;

export function formatOpeningTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
