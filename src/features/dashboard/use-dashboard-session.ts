"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Clear an old server snapshot immediately on a cross-tab sign-out/account change.
// This observer grants no access: the refreshed server page verifies auth again.
export function useDashboardSession(accountId?: string) {
  const router=useRouter();
  const [observed,setObserved]=useState<{accountId:string;id:string | null}>();
  useEffect(()=>{
    if(!accountId) return;
    let active=true;
    let unsubscribe:(()=>void) | undefined;
    void import("@/lib/supabase/client").then(({createClient})=>{
      if(!active) return;
      const {data:{subscription}}=createClient().auth.onAuthStateChange((_event,session)=>{
        if(!active) return;
        const id=session?.user.id ?? null;
        setObserved({accountId,id});
        if(id !== accountId) queueMicrotask(()=>{if(active) router.refresh();});
      });
      unsubscribe=()=>subscription.unsubscribe();
    }).catch(()=>{if(active) router.refresh();});
    return ()=>{active=false;unsubscribe?.();};
  },[accountId,router]);
  return !accountId || observed?.accountId !== accountId || observed.id === accountId;
}
