"use client";

import { useEffect, useState } from "react";

export default function GitHubConnection() {
  const [state, setState] = useState<{connected:boolean; connection?: {username?:string}|null}>({connected:false});
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/github/status");
    if (response.ok) setState(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function disconnect() {
    setBusy(true);
    await fetch("/api/github/disconnect", {method:"POST"});
    await load();
    setBusy(false);
  }

  return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="font-semibold">GitHub</h2>
        <p className="mt-1 text-sm text-zinc-500">{state.connected ? `Connected as @${state.connection?.username}` : "Connect GitHub so SK Builder can create repositories and push generated projects."}</p>
      </div>
      {state.connected ? <button onClick={disconnect} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">{busy ? "Disconnecting..." : "Disconnect"}</button> : <a href="/api/github/connect" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">Connect GitHub</a>}
    </div>
  </section>;
}
