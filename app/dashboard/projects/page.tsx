"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Project={id:string;name:string;slug:string;description:string|null;status:string};

export default function ProjectsPage(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [providers,setProviders]=useState<any[]>([]);

  async function load(){
    setLoading(true);
    const [p, a] = await Promise.all([fetch("/api/projects"), fetch("/api/ai/providers")]);
    const pd=await p.json(); const ad=await a.json();
    if(p.ok)setProjects(pd.projects??[]); else setError(pd.error??"Failed to load projects");
    if(a.ok)setProviders(ad.providers??[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function createProject(e:React.FormEvent){
    e.preventDefault(); if(!name.trim() || !description.trim())return;
    setCreating(true);setError("");
    const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description})});
    const d=await r.json();setCreating(false);
    if(!r.ok){setError(d.error??"Could not create project");return}
    window.location.href=`/dashboard/projects/${d.project.id}`;
  }

  const hasAI = providers.some(p => p.enabled);

  return <main className="min-h-screen bg-[#08090d] px-6 py-10 text-white"><div className="mx-auto max-w-6xl">
    <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
    <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="text-xs uppercase tracking-[.28em] text-violet-300">Workspace</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Your projects</h1><p className="mt-3 text-zinc-500">Give SK Builder one clear prompt. No interview. No questionnaire.</p></div>
      <Link href="/dashboard/ai-providers" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">AI Provider Settings</Link>
    </div>

    {!hasAI && <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Connect your LLM first</div><p className="mt-1 text-sm text-zinc-500">Add your OpenAI, Gemini, Anthropic, or OpenRouter key. Then your prompt can start the build.</p></div><Link href="/dashboard/ai-providers" className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Add AI key →</Link></div>}

    {error&&<div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={createProject} className="h-fit rounded-3xl border border-white/10 bg-white/[.03] p-6"><div className="text-xs uppercase tracking-[.2em] text-zinc-600">New project</div><h2 className="mt-2 text-xl font-semibold">What do you want to build?</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Example: “Build a clinic management SaaS with login, patients, appointments and an admin dashboard.”</p>
        <label className="mt-6 block text-sm text-zinc-300">Project name<input value={name} onChange={e=>setName(e.target.value)} placeholder="ClinicFlow" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"/></label>
        <label className="mt-4 block text-sm text-zinc-300">Your prompt<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Build a modern SaaS..." rows={7} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"/></label>
        <button disabled={creating||!name.trim()||!description.trim()||!hasAI} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-40">{creating?"Creating…":"Start building with AI →"}</button>
      </form>
      <section><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent projects</h2><span className="text-xs text-zinc-600">{projects.length} projects</span></div>
        {loading?<p className="text-zinc-500">Loading…</p>:projects.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-600">Your built projects will appear here.</div>:<div className="space-y-3">{projects.map(p=><Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block rounded-2xl border border-white/10 bg-white/[.02] p-5 hover:border-violet-400/30"><div className="flex items-center justify-between gap-4"><h3 className="font-semibold">{p.name}</h3><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-500">{p.status}</span></div><p className="mt-2 text-sm text-zinc-600">{p.description||"AI-built application"}</p></Link>)}</div>}
      </section>
    </div>
  </div></main>;
}
