"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FileItem={path:string;content:string;status:string};
type Message={id:string;role:"user"|"assistant"|"system";content:string;created_at:string};
type Project={id:string;name:string;description:string|null;status:string;github_repo_url?:string|null};
type Deployment={deployment_url?:string|null;status:string;created_at:string};

export default function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
  const [id,setId]=useState(""); const [project,setProject]=useState<Project|null>(null);
  const [files,setFiles]=useState<FileItem[]>([]); const [messages,setMessages]=useState<Message[]>([]);
  const [prompt,setPrompt]=useState(""); const [busy,setBusy]=useState(false); const [deploying,setDeploying]=useState(false);
  const [error,setError]=useState(""); const [selected,setSelected]=useState(""); const [preview,setPreview]=useState("");
  const [tab,setTab]=useState<"preview"|"files">("preview");

  useEffect(()=>{params.then(p=>{setId(p.id);load(p.id)})},[]);
  async function load(projectId:string){
    const r=await fetch("/api/projects/"+projectId); const d=await r.json();
    if(!r.ok){setError(d.error||"Could not load project");return}
    setProject(d.project); setFiles(d.files||[]); setMessages(d.messages||[]);
    const live=(d.deployments||[]).find((x:Deployment)=>x.deployment_url);
    if(live?.deployment_url)setPreview(live.deployment_url);
    if(!selected && d.files?.[0])setSelected(d.files[0].path);
  }
  async function sendPrompt(){
    const text=prompt.trim(); if(!text||busy)return;
    setBusy(true); setError("");
    try{
      const hasFiles=files.length>0;
      const r=await fetch("/api/projects/"+id+(hasFiles?"/edit":"/build"),{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:text})
      });
      const d=await r.json(); if(!r.ok)throw new Error(d.error||"AI task failed");
      setPrompt("");
      await load(id);
      if(d.repository?.url) setProject(p=>p?{...p,github_repo_url:d.repository.url}:p);
    }catch(e){setError(e instanceof Error?e.message:"AI task failed")}finally{setBusy(false)}
  }
  async function deploy(){
    setDeploying(true);setError("");
    try{
      const r=await fetch("/api/projects/"+id+"/deploy",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Deployment failed");
      if(d.url)setPreview(d.url);await load(id);
    }catch(e){setError(e instanceof Error?e.message:"Deployment failed")}finally{setDeploying(false)}
  }
  const current=useMemo(()=>files.find(f=>f.path===selected),[files,selected]);

  if(!project && !error)return <main className="min-h-screen p-8 text-zinc-400">Loading workspace…</main>;
  return <main className="min-h-screen bg-[#08090c] text-zinc-100">
    <header className="flex h-16 items-center gap-4 border-b border-white/10 px-5">
      <Link href="/dashboard/projects" className="font-bold tracking-tight">SK Builder</Link>
      <span className="text-xs text-zinc-500">/ {project?.name||"Workspace"}</span>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={()=>setTab("preview")} className={"rounded-lg px-3 py-2 text-xs "+(tab==="preview"?"bg-white/10":"text-zinc-500")}>Preview</button>
        <a href={project?.github_repo_url||"#"} target="_blank" className={"rounded-lg px-3 py-2 text-xs "+(project?.github_repo_url?"hover:bg-white/10":"pointer-events-none text-zinc-700")}>GitHub</a>
        <Link href="/dashboard/integrations" className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-white/10">Supabase</Link>
        <button onClick={deploy} disabled={deploying||!files.length} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold hover:bg-violet-400 disabled:opacity-40">{deploying?"Deploying…":"Deploy"}</button>
      </div>
    </header>

    {error&&<div className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[320px_minmax(0,1fr)_300px]">
      <aside className="flex flex-col border-r border-white/10 bg-[#0b0d11]">
        <div className="border-b border-white/10 p-4"><div className="text-xs uppercase tracking-[.25em] text-violet-300">AI Builder</div><div className="mt-1 text-sm text-zinc-400">{project?.status||"ready"}</div></div>
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {messages.filter(m=>m.role!=="system").map(m=><div key={m.id} className={"rounded-2xl p-3 "+(m.role==="user"?"bg-white/10":"bg-violet-500/10 border border-violet-400/10")}><div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-600">{m.role==="user"?"You":"SK Builder"}</div><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{m.content.slice(0,1200)}</p></div>)}
          {!messages.length&&<div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">Describe what you want to build. No questionnaire — SK Builder will make reasonable assumptions and start.</div>}
        </div>
        <div className="border-t border-white/10 p-4">
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendPrompt()}}} rows={5} placeholder={files.length?"Ask SK Builder to change anything…":"Describe the app you want to build…"} className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-violet-400"/>
          <button onClick={sendPrompt} disabled={busy||!prompt.trim()} className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">{busy?"AI is working…":files.length?"Apply changes →":"Build application →"}</button>
          <p className="mt-2 text-[11px] text-zinc-600">Enter to send · Shift+Enter for a new line</p>
        </div>
      </aside>

      <section className="min-w-0 bg-[#101217]">
        <div className="flex h-12 items-center border-b border-white/10 px-4 text-xs text-zinc-500">
          <button onClick={()=>setTab("preview")} className={"px-3 py-2 "+(tab==="preview"?"text-white":"")}>LIVE PREVIEW</button>
          <button onClick={()=>setTab("files")} className={"px-3 py-2 "+(tab==="files"?"text-white":"")}>CODE</button>
        </div>
        {tab==="preview"?<div className="h-[calc(100vh-7rem)] p-4">
          {preview?<iframe title="Live Preview" src={preview} className="h-full w-full rounded-2xl border border-white/10 bg-white"/>:<div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-zinc-600">Build the app, then press Deploy to load the live preview here.</div>}
        </div>:<div className="h-[calc(100vh-7rem)] overflow-auto p-5">{current?<><div className="mb-3 text-sm text-zinc-300">{current.path}</div><pre className="overflow-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-xs leading-5 text-zinc-400">{current.content}</pre></>:<p className="text-sm text-zinc-600">Select a file.</p>}</div>}
      </section>

      <aside className="hidden border-l border-white/10 bg-[#0b0d11] lg:block">
        <div className="border-b border-white/10 p-4"><div className="text-xs uppercase tracking-[.25em] text-zinc-500">PROJECT FILES</div><div className="mt-1 text-xs text-zinc-600">{files.length} generated files</div></div>
        <div className="p-3">{files.map(f=><button key={f.path} onClick={()=>{setSelected(f.path);setTab("files")}} className={"block w-full rounded-lg px-3 py-2 text-left text-xs "+(selected===f.path?"bg-white/10 text-white":"text-zinc-500 hover:bg-white/5")}>{f.path}</button>)}</div>
      </aside>
    </div>
  </main>;
}
