import "server-only";
import { z } from "zod";
import { getViewer } from "@/features/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { Selection } from "./model";
import { selectionInterval, type PersonalConflicts } from "./personal-schedule";

const rowsSchema = z.array(z.object({id:z.uuid(),space_id:z.uuid(),starts_at:z.iso.datetime({offset:true}),ends_at:z.iso.datetime({offset:true})}));
const namesSchema = z.array(z.object({id:z.uuid(),name:z.string().trim().min(1).max(200)}));
export async function getPersonalConflicts(selection: Selection): Promise<PersonalConflicts | null> {
  await getViewer();
  const interval = selectionInterval(selection);
  if (!interval) return null;
  try {
    const client = await createClient();
    // Existing RLS derives ownership from auth.uid(); user_id is not selectable.
    const {data,error} = await client.from("reservations").select("id,space_id,starts_at,ends_at")
      .eq("status","confirmed").lt("starts_at",new Date(interval.end).toISOString())
      .gt("ends_at",new Date(interval.start).toISOString()).order("starts_at").order("id");
    const rows = rowsSchema.safeParse(data);
    if (error || !rows.success) return null;
    const names = new Map<string,string>();
    if (rows.data.length) {
      try {
        const metadata = await client.from("spaces").select("id,name").eq("is_active",true).in("id",[...new Set(rows.data.map(row=>row.space_id))]);
        const parsed = namesSchema.safeParse(metadata.data);
        if (!metadata.error && parsed.success) for (const row of parsed.data) names.set(row.id,row.name);
      } catch { /* The owned conflict remains useful without readable metadata. */ }
    }
    return {conflicts:rows.data.map(row=>({id:row.id,startsAt:row.starts_at,endsAt:row.ends_at,spaceName:names.get(row.space_id) ?? null}))};
  } catch { return null; }
}
