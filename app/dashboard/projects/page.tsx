"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, Boxes, Check, ChevronRight, Github, Plus, Sparkles, UserRound, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type Project={id:string;name:string;slug:string;description:string|null;status:string};

function projectName(prompt:string){
  const quoted=prompt.match(/["“”']([^"“”']{3,60})["“”']/);
  if(quoted?.[1]) return quoted[1].trim();
  const clean=prompt.replace(/\s+/g," ").trim();
  const words=clean.split(" ").slice(0,5).join(" ");
  return (words || "New Project").replace(/[.,!?;:]+$/,"").slice(0,60) || "New Project";
}

export default function ProjectsPage(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [prompt,setPrompt]=useState("");
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [error,setError]=useState("");
  const [providers,setProviders]=useState<any[]>([]);
  const [sidebarOpen,setSidebarOpen]=useState(false);

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
    e.preventDefault();
    const text=prompt.trim();
    if(!text||creating)return;
    setCreating(true);setError("");
    const name=projectName(text);
    const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description:text})});
    const d=await r.json();
    if(!r.ok){setCreating(false);setError(d.error??"Could not create project");return}
    window.location.href="/dashboard/projects/"+d.project.id+"?prompt="+encodeURIComponent(text);
  }

  const hasAI=providers.some(p=>p.enabled);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="flex min-h-screen">
        {sidebarOpen&&<button aria-label="Close navigation" onClick={()=>setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"/>}
        <aside className={(sidebarOpen?"translate-x-0":"-translate-x-full")+" fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none"}>
          <div className="flex h-[68px] items-center gap-3 border-b border-slate-200 px-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20"><Sparkles size={17}/></span>
            <span className="font-bold tracking-tight">SK Builder</span>
            <button onClick={()=>setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"><X size={17}/></button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <Link href="/dashboard/projects" onClick={()=>setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-600">
              <Plus size={17}/> New project
            </Link>

            <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Your projects</div>
            <div className="mt-2 space-y-1">
              {loading?<div className="px-3 py-2 text-xs text-slate-400">Loading…</div>:projects.length===0?<div className="px-3 py-2 text-xs text-slate-400">No projects yet</div>:projects.map(p=>(
                <Link key={p.id} href={"/dashboard/projects/"+p.id} onClick={()=>setSidebarOpen(false)} className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                  <Boxes size={15} className="shrink-0 text-slate-400"/>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className={"h-1.5 w-1.5 rounded-full "+(p.status==="failed"?"bg-red-400":p.status==="completed"?"bg-emerald-400":"bg-amber-400")}/>
                </Link>
              ))}
            </div>

            <div className="my-5 border-t border-slate-100"/>
            <div className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div>
            <Link href="/dashboard/ai-providers" onClick={()=>setSidebarOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              <Bot size={16}/><span className="flex-1">AI Providers</span><span className={"h-1.5 w-1.5 rounded-full "+(hasAI?"bg-emerald-400":"bg-amber-400")}/>
            </Link>
            <Link href="/dashboard/integrations" onClick={()=>setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
              <Github size={16}/><span className="flex-1">Connections</span><ChevronRight size={14} className="text-slate-300"/>
            </Link>
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <UserRound size={17} className="text-slate-400"/>
              <span className="flex-1 text-xs font-medium text-slate-600">Account</span>
              <UserButton/>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
            <button onClick={()=>setSidebarOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><span className="text-lg">☰</span></button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">New project</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Describe what you want. SK Builder starts building.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={"hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:flex "+(hasAI?"border-emerald-200 bg-emerald-50 text-emerald-600":"border-amber-200 bg-amber-50 text-amber-600")}>
                <span className={"h-1.5 w-1.5 rounded-full "+(hasAI?"bg-emerald-400":"bg-amber-400")}/>{hasAI?"AI ready":"AI provider needed"}
              </span>
            </div>
          </header>

          <div className="mx-auto flex min-h-[calc(100vh-68px)] max-w-5xl items-center px-4 py-10 sm:px-8">
            <div className="w-full">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Sparkles size={25}/></div>
                <h2 className="mt-6 text-3xl font-black tracking-[-.04em] sm:text-5xl">What do you want to build?</h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">Tell AI what you need in your own words. No questionnaire. No setup flow. SK Builder will understand the prompt and start the build.</p>

                {error&&<div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600">{error}</div>}

                <form onSubmit={createProject} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-[0_20px_70px_rgba(15,23,42,.10)]">
                  <textarea autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();createProject(e)}}} placeholder="Build a premium clinic management SaaS with patients, appointments, billing and analytics…" rows={6} className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"/>
                  <div className="flex items-center gap-2 border-t border-slate-100 px-2 pt-3">
                    <span className="px-2 text-[11px] text-slate-400">AI Builder</span>
                    <span className="flex-1"/>
                    <span className="hidden text-[10px] text-slate-400 sm:block">Enter to build · Shift+Enter for new line</span>
                    <button disabled={creating||!prompt.trim()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                      {creating?"Starting…":"Build with AI"}<ChevronRight size={15}/>
                    </button>
                  </div>
                </form>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["Build a SaaS dashboard","Create an e-commerce app","Build a booking platform"].map(s=><button type="button" key={s} onClick={()=>setPrompt(s)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600">{s}</button>)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
