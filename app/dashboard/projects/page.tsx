"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, Github, Plus, Sparkles, Wand2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

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
    const [p,a]=await Promise.all([fetch("/api/projects"),fetch("/api/ai/providers")]);
    const pd=await p.json(); const ad=await a.json();
    if(p.ok)setProjects(pd.projects??[]); else setError(pd.error??"Failed to load projects");
    if(a.ok)setProviders(ad.providers??[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);
  async function createProject(e:React.FormEvent){
    e.preventDefault(); if(!name.trim()||!description.trim())return;
    setCreating(true);setError("");
    const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description})});
    const d=await r.json();setCreating(false);
    if(!r.ok){setError(d.error??"Could not create project");return}
    window.location.href=`/dashboard/projects/${d.project.id}`;
  }
  const hasAI=providers.some(p=>p.enabled);

  return <main className="min-h-screen bg-[#07080c] text-white">
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8">
      <header className="sticky top-4 z-20 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b0d11]/85 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <Link href="/dashboard" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20"><Sparkles size={17}/></span><span className="font-semibold tracking-tight">SK Builder</span></Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/dashboard/projects" className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white">Builder</Link>
          <Link href="/dashboard/ai-providers" className="rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"><Bot className="mr-1 inline" size={14}/>AI Providers</Link>
          <Link href="/dashboard/integrations" className="rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"><Github className="mr-1 inline" size={14}/>Connections</Link>
        </nav>
        <div className="flex items-center gap-2"><UserButton /></div>
      </header>

      <section className="relative overflow-hidden py-14 sm:py-20">
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"/>
        <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-cyan-400/5 blur-3xl"/>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1.5 text-[11px] font-medium text-violet-300"><Wand2 size={13}/> AI SOFTWARE FACTORY</div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">Describe it. Build it. <span className="text-violet-400">See it.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500">SK Builder creates the website inside your workspace first. GitHub, Supabase and Vercel are optional delivery connections — you decide when to use them.</p>
        </div>

        {!hasAI&&<div className="mt-8 flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Connect your AI provider</div><p className="mt-1 text-sm text-zinc-500">Add an encrypted OpenAI, Gemini, Anthropic or OpenRouter key to start building.</p></div><Link href="/dashboard/ai-providers" className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:-translate-y-0.5">Add AI key <ArrowRight className="ml-1 inline" size={15}/></Link></div>}

        {error&&<div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={createProject} className="rounded-3xl border border-white/10 bg-white/[.035] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:border-violet-400/20 sm:p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-zinc-500"><Plus size={14}/> New project</div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">What do you want to build?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">No interview. No questionnaire. Give the builder one clear prompt and refine it later in chat.</p>
            <label className="mt-6 block text-sm text-zinc-300">Project name<input value={name} onChange={e=>setName(e.target.value)} placeholder="ClinicFlow" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"/></label>
            <label className="mt-4 block text-sm text-zinc-300">Your prompt<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Build a premium clinic management SaaS with login, patients, appointments and an admin dashboard..." rows={8} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"/></label>
            <button disabled={creating||!name.trim()||!description.trim()||!hasAI} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400 disabled:opacity-40">{creating?"Opening workspace…":"Start building with AI"} {!creating&&<ArrowRight size={16}/>}</button>
            <p className="mt-3 text-center text-[11px] text-zinc-600">GitHub/Vercel connection is not required to create or preview your website.</p>
          </form>

          <section>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Your projects</h2><p className="mt-1 text-xs text-zinc-600">Continue building any saved workspace.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">{projects.length}</span></div>
            {loading?<p className="text-zinc-500">Loading…</p>:projects.length===0?<div className="rounded-3xl border border-dashed border-white/10 p-14 text-center"><Sparkles className="mx-auto text-zinc-700" size={28}/><p className="mt-3 text-sm text-zinc-600">Your projects will appear here.</p></div>:<div className="grid gap-3 sm:grid-cols-2">{projects.map(p=><Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[.045]"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold group-hover:text-violet-300">{p.name}</h3><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-violet-300">{p.status}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{p.description||"AI-built application"}</p><div className="mt-4 text-xs text-zinc-500 transition group-hover:text-violet-400">Open workspace →</div></Link>)}</div>}
          </section>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-600"><p>Powered by <span className="text-zinc-300">SUHAIL AHMED AAMRO</span></p><a href="https://my-portfilo-41201.vercel.app" target="_blank" rel="noreferrer" className="mt-2 inline-block hover:text-white">Portfolio ↗</a></footer>
    </div>
  </main>;
}
