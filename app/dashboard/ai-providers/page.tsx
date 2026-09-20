"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const providers = [
  { id: "openrouter", name: "OpenRouter", hint: "Many models through one API", placeholder: "sk-or-v1-..." },
  { id: "openai", name: "OpenAI", hint: "GPT models", placeholder: "sk-..." },
  { id: "gemini", name: "Google Gemini", hint: "Gemini models", placeholder: "AIza..." },
  { id: "anthropic", name: "Anthropic", hint: "Claude models", placeholder: "sk-ant-..." },
];

type Provider = { provider: string; enabled: boolean; model: string | null; priority: number };

export default function AIProvidersPage() {
  const [saved, setSaved] = useState<Provider[]>([]);
  const [selected, setSelected] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/ai/providers");
    if (r.ok) setSaved((await r.json()).providers ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setSaving(true); setMessage("");
    const r = await fetch("/api/ai/providers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: selected, apiKey, model: model || undefined, priority: 10 }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setMessage(d.error ?? "Could not save key"); return; }
    setApiKey(""); setModel(""); setMessage("API key saved securely. You can start building.");
    load();
  }

  async function remove(provider: string) {
    await fetch("/api/ai/providers", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider }) });
    load();
  }

  const current = providers.find(p => p.id === selected)!;

  return (
    <main className="min-h-screen bg-[#08090d] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
        <div className="mt-8">
          <p className="text-xs uppercase tracking-[.28em] text-violet-300">AI Configuration</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Connect your AI</h1>
          <p className="mt-3 max-w-2xl text-zinc-500">Add your own LLM API key once. SK Builder keeps it encrypted on the server and uses it to build and modify your applications.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={save} className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <div className="text-sm font-semibold">1. Choose an AI provider</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {providers.map(p => (
                <button type="button" key={p.id} onClick={() => setSelected(p.id)} className={"rounded-xl border p-4 text-left " + (selected === p.id ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 bg-black/20")}>
                  <div className="font-medium">{p.name}</div><div className="mt-1 text-xs text-zinc-500">{p.hint}</div>
                </button>
              ))}
            </div>
            <label className="mt-6 block text-sm font-medium">2. API key
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={current.placeholder} autoComplete="off" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400" />
            </label>
            <label className="mt-4 block text-sm font-medium">Model <span className="text-zinc-600">(optional)</span>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="Leave empty for the provider default" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400" />
            </label>
            {message && <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">{message}</div>}
            <button disabled={saving || !apiKey.trim()} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-40">{saving ? "Saving securely…" : "Save AI key"}</button>
            <p className="mt-3 text-center text-xs text-zinc-600">Your key is never shown back in the browser.</p>
          </form>

          <aside className="rounded-3xl border border-white/10 bg-white/[.02] p-6">
            <div className="text-sm font-semibold">Connected providers</div>
            <div className="mt-4 space-y-3">
              {saved.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-zinc-600">No AI provider connected yet.</div> : saved.map(p => (
                <div key={p.provider} className="flex items-center justify-between rounded-xl border border-white/10 p-4">
                  <div><div className="font-medium capitalize">{p.provider}</div><div className="mt-1 text-xs text-emerald-400">Connected • key encrypted</div></div>
                  <button onClick={() => remove(p.provider)} className="text-xs text-zinc-600 hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5">
              <div className="font-medium">How many websites can one API key build?</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">SK Builder does not currently impose a fixed website count per key. One connected key can be reused across your projects. The practical limit is the AI provider's quota, rate limits, billing/credits and the token cost of each build or edit.</p>
              <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                <span>• One key → multiple projects</span><span>• Each build consumes AI usage</span>
                <span>• Add another provider for fallback</span><span>• Keys stay server-side encrypted</span>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-violet-400/5 p-5">
              <div className="font-medium">3. Start building</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">After connecting a key, go to Projects, describe your app in one prompt, and SK Builder starts the build pipeline.</p>
              <Link href="/dashboard/projects" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Create a project →</Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
