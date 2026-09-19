"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Project={id:string;name:string;slug:string;description:string|null;status:string};

export default function ProjectsPage(){
  const [projects,setProjects]=useState<Project[]>([]); const [name,setName]=useState(""); const [description,setDescription]=useState("");
  const [loading,setLoading]=useState(true); const [creating,setCreating]=useState(false); const [error,setError]=useState("");
  async function load(){setLoading(true);const r=await fetch("/api/projects");const d=await r.json();if(r.ok)setProjects(d.projects??[]);else setError(d.error??"Failed to load projects");setLoading(false);}
  useEffect(()=>{load()},[]);
  async function createProject(e:React.FormEvent){e.preventDefault();if(!name.trim())return;setCreating(true);setError("");const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description})});const d=await r.json();setCreating(false);if(!r.ok){setError(d.error??"Could not create project");return}window.location.href=`/dashboard/projects/${d.project.id}`;}
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-6xl">
    <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <section><p className="text-xs uppercase tracking-[.3em] text-cyan-400">AI Software Factory</p><h1 className="mt-3 text-4xl font-bold">Your projects</h1><p className="mt-3 text-zinc-400">Create a project, let the AI interviewer turn your idea into requirements, then move into the build pipeline.</p>
      {error&&<div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="mt-8 space-y-3">{loading?<p className="text-zinc-500">Loading…</p>:projects.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-8 text-zinc-500">No projects yet. Create your first one.</div>:projects.map(p=><Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block rounded-2xl border border-white/10 bg-white/[.03] p-5 hover:border-cyan-400/40"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold">{p.name}</h2><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{p.status}</span></div><p className="mt-2 text-sm text-zinc-500">{p.description||"AI-built application project"}</p></Link>)}</div></section>
      <form onSubmit={createProject} className="h-fit rounded-3xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-semibold">Create project</h2><p className="mt-2 text-sm text-zinc-500">Start with the idea. SK Builder will interview you before generating code.</p>
        <label className="mt-6 block text-sm text-zinc-300">Project name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. ClinicFlow" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400"/></label>
        <label className="mt-4 block text-sm text-zinc-300">Short idea<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="What do you want to build?" rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400"/></label>
        <button disabled={creating||!name.trim()} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-40">{creating?"Creating…":"Start AI interview →"}</button>
      </form>
    </div>
  </div></main>;
}
