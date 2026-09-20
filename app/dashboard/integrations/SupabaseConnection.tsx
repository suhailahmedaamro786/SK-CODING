"use client";
import { useEffect, useState } from "react";

type State = { connected: boolean; oauthConfigured?: boolean; selectedProjectRef?: string | null; projects?: { ref: string; name: string; status: string; region?: string }[] };
export default function SupabaseConnection() {
  const [state, setState] = useState<State>({ connected: false });
  const [busy, setBusy] = useState(false);
  async function load() { const r = await fetch("/api/supabase/status", { cache: "no-store" }); if (r.ok) setState(await r.json()); }
  useEffect(() => { void load(); }, []);
  async function selectProject(ref: string) { setBusy(true); await fetch("/api/supabase/select-project", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectRef: ref }) }); await load(); setBusy(false); }
  return <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="font-semibold">Supabase</h2><p className="mt-1 text-sm text-zinc-500">{state.connected ? "Connected — your Supabase projects are available to SK Builder." : "Connect Supabase when a generated app needs Auth, Database, Storage or RLS."}</p></div>
      {!state.connected && <a href="/api/supabase/connect" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">{state.oauthConfigured ? "Connect Supabase" : "Supabase OAuth setup needed"}</a>}
    </div>
    {state.connected && <div className="mt-5"><label className="text-xs text-zinc-500">Project used for database automation</label><select disabled={busy} value={state.selectedProjectRef || ""} onChange={(e)=>void selectProject(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"><option value="">Select a Supabase project</option>{(state.projects||[]).map(p=><option key={p.ref} value={p.ref}>{p.name} — {p.ref} — {p.status}</option>)}</select></div>}
  </section>;
}
