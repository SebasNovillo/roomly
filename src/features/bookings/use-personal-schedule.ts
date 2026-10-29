"use client";
import { useEffect, useMemo, useState } from "react";
import type { Selection } from "./model";
import { personalConflictsSchema, selectionInterval, type PersonalConflicts } from "./personal-schedule";

type Outcome = {key:string;result:PersonalConflicts | null};
export function usePersonalSchedule(selection: Selection, revision: number) {
  const {date,start,end} = selection;
  const interval = useMemo(()=>selectionInterval({date,start,end}),[date,start,end]);
  const key = interval ? `${date}/${start}/${end}/${revision}` : null;
  const [outcome,setOutcome] = useState<Outcome>();
  useEffect(()=>{
    if (!key) return;
    let active = true;
    const abort = new AbortController();
    // Avoid requests for intermediate select changes without delaying feedback.
    const timer = setTimeout(()=>void (async()=>{
      let result: PersonalConflicts | null = null;
      try {
        const response = await fetch(`/dashboard/schedule-conflicts?${new URLSearchParams({date,start,end})}`,{signal:abort.signal,cache:"no-store"});
        const parsed = personalConflictsSchema.safeParse(await response.json());
        if (response.ok && parsed.success) result = parsed.data;
      } catch { /* Failed checks are distinct from a successful empty result. */ }
      if (active && !abort.signal.aborted) setOutcome({key,result});
    })(),200);
    return ()=>{active=false;abort.abort();clearTimeout(timer);};
  },[key,date,start,end]);
  if (!key) return {status:"idle" as const};
  // A new selection/revision is pending during render, before effect cleanup.
  if (outcome?.key !== key) return {status:"pending" as const};
  if (!outcome.result) return {status:"error" as const};
  return {status:outcome.result.conflicts.length ? "conflict" as const : "clear" as const,conflicts:outcome.result.conflicts};
}
