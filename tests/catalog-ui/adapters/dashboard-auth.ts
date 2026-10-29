// Isolated browser auth-event adapter. No Supabase client or real session.
export function createClient() {
  return {auth:{onAuthStateChange(callback:(event:string,session:{user:{id:string}} | null)=>void) {
    const listener=(event:Event)=>{const id=(event as CustomEvent<string | null>).detail;callback(id ? "SIGNED_IN" : "SIGNED_OUT",id ? {user:{id}} : null);};
    window.addEventListener("fixture:auth",listener);
    queueMicrotask(()=>{callback("INITIAL_SESSION",{user:{id:new URLSearchParams(location.search).get("fixtureAccount") ?? "fixture-owner"}});document.documentElement.dataset.fixtureAuthReady="true";});
    return {data:{subscription:{unsubscribe:()=>window.removeEventListener("fixture:auth",listener)}}};
  }}};
}
