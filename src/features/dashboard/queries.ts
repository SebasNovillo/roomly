import "server-only";
import { z } from "zod";
import { getMyBookings } from "@/features/bookings/queries";
import { createClient } from "@/lib/supabase/server";
import { spaceTypes, type SpaceType } from "@/features/spaces/catalog";
import { upcomingDashboardCards, type DashboardResult } from "./model";

const metadataSchema=z.array(z.object({id:z.uuid(),type:z.enum(Object.keys(spaceTypes) as [SpaceType,...SpaceType[]])})).max(4);
export async function getDashboardBookings(): Promise<DashboardResult> {
  // This verified-session RPC supplies full totals and entries at ONE SQL boundary.
  const result=await getMyBookings("upcoming",1);
  if(!result.ok) return result;
  const {list}=result, cards=upcomingDashboardCards(list);
  if(cards.length !== Math.min(4,list.counts.upcoming)) return {ok:false,kind:"service"};
  const types:Partial<Record<string,SpaceType>>={};
  const ids=[...new Set(cards.flatMap(card=>card.space ? [card.space.id] : []))];
  if(ids.length) {
    try {
      const client=await createClient();
      const {data,error}=await client.from("spaces").select("id,type").eq("is_active",true).in("id",ids);
      const parsed=metadataSchema.safeParse(data);
      if(!error && parsed.success) for(const row of parsed.data) if(ids.includes(row.id)) types[row.id]=row.type;
    } catch { /* Keep owned booking facts; unreadable space types are not invented. */ }
  }
  return {ok:true,dashboard:{now:list.now,counts:list.counts,featured:cards[0] ?? null,plans:cards.slice(1),spaceTypes:types}};
}
