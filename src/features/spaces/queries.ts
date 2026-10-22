import "server-only";
import { z } from "zod";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, PAGE_SIZE, spaceSchema, type CatalogFilters, type CatalogFailure, type CatalogResult } from "./catalog";
import { openingHoursSchema, rulesSchema, type DetailResult, type DetailSection } from "./details";

const columns = "id,slug,name,description,type,floor,capacity,amenities,is_demo,images:space_images(image_url,alt_text,sort_order,source_credit)";
function failure(code?: string): CatalogFailure {
  return { ok: false, kind: ["42P01", "42703", "42501", "PGRST200", "PGRST204", "PGRST205"].includes(code ?? "") ? "setup" : "load" };
}

async function readDetailRows<T>(request: PromiseLike<{ data: unknown; error: unknown }>, schema: z.ZodType<T[]>): Promise<DetailSection<T>> {
  try {
    const { data, error } = await request;
    if (error) return { ok: false };
    const parsed = schema.safeParse(data);
    return parsed.success ? { ok: true, rows: parsed.data } : { ok: false };
  } catch { return { ok: false }; }
}

export async function getCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  // Keep redirects outside the query catch; never convert failed auth into catalog content.
  await getViewer();
  try {
    const supabase = await createClient();
    let query = supabase.from("spaces").select(columns, { count: "exact" }).eq("is_active", true);
    if (filters.q) query = query.ilike("search_text", `%${escapeLike(filters.q)}%`);
    if (filters.minCapacity) query = query.gte("capacity", filters.minCapacity);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.amenities.length) query = query.contains("amenities", filters.amenities);
    const start = (filters.page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.order("sort_order").order("id").range(start, start + PAGE_SIZE - 1);
    if (error?.code === "PGRST103" && filters.page > 1) {
      const firstPage = await getCatalog({ ...filters, page: 1 });
      return firstPage.ok ? { ...firstPage, spaces: [] } : firstPage;
    }
    if (error) return failure(error.code);
    const parsed = z.array(spaceSchema).safeParse(data);
    if (!parsed.success || count === null) return failure();
    return { ok: true, spaces: parsed.data, total: count };
  } catch { return failure(); }
}

export async function getSpace(slug: string): Promise<DetailResult> {
  await getViewer();
  if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: true, space: null };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("spaces").select(columns).eq("is_active", true).eq("slug", slug).maybeSingle();
    if (error) return failure(error.code);
    if (!data) return { ok: true, space: null };
    const parsed = spaceSchema.safeParse(data);
    if (!parsed.success) return failure();
    // Separate reads keep the already-applied catalog usable before the additive
    // detail migration is applied. Failure is never represented as empty content.
    const [openingHours, rules] = await Promise.all([
      readDetailRows(supabase.from("space_opening_hours").select("weekday,is_closed,opens_at,closes_at").eq("space_id", parsed.data.id).order("weekday"), openingHoursSchema),
      readDetailRows(supabase.from("space_rules").select("rule_text,sort_order").eq("space_id", parsed.data.id).order("sort_order"), rulesSchema),
    ]);
    return { ok: true, space: { ...parsed.data, openingHours, rules } };
  } catch { return failure(); }
}
