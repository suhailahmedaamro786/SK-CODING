"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, ExternalLink, Github, Rocket, Send, Sparkles, Terminal, Code2 } from "lucide-react";

type FileItem={path:string;content:string;status:string};
type Message={id:string;role:"user"|"assistant"|"system";content:string;created_at:string};
type Project={id:string;name:string;description:string|null;status:string;github_repo_url?:string|null};
type Deployment={deployment_url?:string|null;status:string;created_at:string};

export default function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
  const [id,setId]=useState("");
  const [project,setProject]=useState<Project|null>(null);
  const [files,setFiles]=useState<FileItem[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [prompt,setPrompt]=useState("");
  const [busy,setBusy]=useState(false);
  const [deploying,setDeploying]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState("");
  const [preview,setPreview]=useState("");
  const [tab,setTab]=useState<"preview"|"code">("preview");

  useEffect(()=>{params.then(p=>{setId(p.id);load(p.id)})},[]);
  async function load(projectId:string){
    const r=await fetch("/api/projects/"+projectId); const d=await r.json();
    if(!r.ok){setError(d.error||"Could not load project");return}
    setProject(d.project); setFiles(d.files||[]); setMessages(d.messages||[]);
    const live=(d.deployments||[]).find((x:Deployment)=>x.deployment_url);
    if(live?.deployment_url)setPreview(live.deployment_url);
    if(!selected&&d.files?.[0])setSelected(d.files[0].path);
  }

  async function sendPrompt(){
    const text=prompt.trim(); if(!text||busy)return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/projects/"+id+(files.length?"/edit":"/build"),{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:text})
      });
      const d=await r.json();
      if(!r.ok){
        if(d.error==="GITHUB_NOT_CONNECTED") throw new Error("GitHub is not connected. Open Integrations and connect GitHub first.");
        if(d.error==="NO_AI_PROVIDER_CONFIGURED") throw new Error("Connect an AI provider before building.");
        throw new Error(d.error||"AI task failed");
      }
      setPrompt(""); await load(id);
      if(d.repository?.url)setProject(p=>p?{...p,github_repo_url:d.repository.url}:p);
    }catch(e){setError(e instanceof Error?e.message:"AI task failed")}finally{setBusy(false)}
  }

  async function deploy(){
    setDeploying(true);setError("");
    try{
      const r=await fetch("/api/projects/"+id+"/deploy",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
      const d=await r.json();
      if(!r.ok){
        if(d.error==="VERCEL_NOT_CONNECTED") throw new Error("Vercel is not connected. Open Integrations and connect Vercel first.");
        throw new Error(d.error||"Deployment failed");
      }
      if(d.url)setPreview(d.url); await load(id);
    }catch(e){setError(e instanceof Error?e.message:"Deployment failed")}finally{setDeploying(false)}
  }

  const current=useMemo(()=>files.find(f=>f.path===selected),[files,selected]);

  if(!project&&!error)return <main className="min-h-screen bg-[#07080c] p-8 text-zinc-400">Loading workspace…</main>;

  return <main className="min-h-screen bg-[#07080c] text-zinc-100">
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/10 bg-[#08090d]/90 px-4 backdrop-blur-xl sm:px-5">
      <Link href="/dashboard/projects" className="flex items-center gap-2 font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-black"><Sparkles size={15}/></span>SK Builder</Link>
      <span className="hidden text-xs text-zinc-600 sm:block">/ {project?.name||"Workspace"}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <a href={project?.github_repo_url||"https://github.com/suhailahmedaamro786/SK-CODING"} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="GitHub"><Github size={17}/></a>
        <Link href="/dashboard/integrations" className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Integrations"><Terminal size={17}/></Link>
        <button onClick={deploy} disabled={deploying||!files.length} className="ml-1 inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40"><Rocket size={14}/>{deploying?"Deploying…":"Deploy to Vercel"}</button>
      </div>
    </header>

    {error&&<div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-5">{error}<Link href="/dashboard/integrations" className="ml-2 underline">Open integrations</Link></div>}

    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_300px_380px]">
      <section className="min-w-0 border-r border-white/10 bg-[#101217]">
        <div className="flex h-12 items-center border-b border-white/10 px-4">
          <button onClick={()=>setTab("preview")} className={"inline-flex items-center gap-2 px-3 py-2 text-xs "+(tab==="preview"?"text-white":"text-zinc-600")}><ExternalLink size={13}/> LIVE PREVIEW</button>
          <button onClick={()=>setTab("code")} className={"inline-flex items-center gap-2 px-3 py-2 text-xs "+(tab==="code"?"text-white":"text-zinc-600")}><Code2 size={13}/> CODE</button>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-700">{files.length} files</span>
        </div>
        {tab==="preview"?<div className="h-[calc(100vh-7rem)] p-4">
          {preview?<iframe title="Live Preview" src={preview} className="h-full w-full rounded-2xl border border-white/10 bg-white"/>:<div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center text-sm text-zinc-600"><div><Rocket className="mx-auto mb-3" size={25}/><p>Build the app, then deploy it to Vercel.</p><p className="mt-1 text-xs text-zinc-700">Your live website will appear here.</p></div></div>}
        </div>:<div className="h-[calc(100vh-7rem)] overflow-auto p-5">{current?<><div className="mb-3 flex items-center gap-2 text-sm text-zinc-300"><Code2 size={15}/>{current.path}</div><pre className="overflow-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-xs leading-5 text-zinc-400">{current.content}</pre></>:<p className="text-sm text-zinc-600">Select a file from Project Files.</p>}</div>}
      </section>

      <aside className="hidden border-r border-white/10 bg-[#0b0d11] lg:block">
        <div className="border-b border-white/10 p-4"><div className="text-xs uppercase tracking-[.25em] text-zinc-500">PROJECT FILES</div><div className="mt-1 text-xs text-zinc-700">Generated source</div></div>
        <div className="max-h-[calc(100vh-7rem)] overflow-auto p-3">{files.length?files.map(f=><button key={f.path} onClick={()=>{setSelected(f.path);setTab("code")}} className={"mb-1 block w-full rounded-lg px-3 py-2 text-left text-xs transition "+(selected===f.path?"bg-white/10 text-white":"text-zinc-500 hover:bg-white/5")}>{f.path}</button>):<p className="p-3 text-xs leading-5 text-zinc-700">Files generated by the AI will appear here.</p>}</div>
      </aside>

      <aside className="flex min-h-[520px] flex-col bg-[#090a0e]">
        <div className="border-b border-white/10 p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-[.25em] text-violet-300"><Bot size={14}/> AI BUILDER</div><p className="mt-1 text-xs text-zinc-600">Tell it what to build or change.</p></div>
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {!messages.filter(m=>m.role!=="system").length&&<div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={15}/> Ready to build</div><p className="mt-2 text-xs leading-5 text-zinc-600">Example: “Build a premium clinic SaaS with login, appointments, billing and an admin dashboard.”</p></div>}
          {messages.filter(m=>m.role!=="system").map(m=><div key={m.id} className={"rounded-2xl p-3 "+(m.role==="user"?"bg-white/10":"border border-violet-400/10 bg-violet-500/[.08]")}><div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-600">{m.role==="user"?"You":"SK Builder"}</div><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{m.content.slice(0,1600)}</p></div>)}
        </div>
        <div className="border-t border-white/10 p-4">
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendPrompt()}}} rows={5} placeholder={files.length?"Ask SK Builder to change anything…":"Describe the app you want to build…"} className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none transition focus:border-violet-400"/>
          <button onClick={sendPrompt} disabled={busy||!prompt.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:opacity-40">{busy?"AI is working…":files.length?"Apply changes":"Start AI build"} {!busy&&<Send size={14}/>}</button>
          <p className="mt-2 text-center text-[10px] text-zinc-700">Enter to send · Shift+Enter for a new line</p>
        </div>
      </aside>
    </div>

    <footer className="border-t border-white/10 bg-[#07080c] py-5 text-center text-[11px] text-zinc-600"><p>Powered by <span className="text-zinc-300">SUHAIL AHMED AAMRO</span> · <a href="https://my-portfilo-41201.vercel.app" target="_blank" rel="noreferrer" className="hover:text-white">Portfolio</a></p></footer>
  </main>;
}
