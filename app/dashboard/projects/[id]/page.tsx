"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, Code2, ExternalLink, Github, Moon, Rocket, Send, Sparkles, Sun, Terminal, UserRound, Wand2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type FileItem={path:string;content:string;status:string};
type Message={id:string;role:"user"|"assistant"|"system";content:string;created_at:string};
type Project={id:string;name:string;description:string|null;status:string;github_repo_url?:string|null;preview_html?:string|null};
type Deployment={deployment_url?:string|null;status:string;created_at:string};

export default function ProjectWorkspace({params}:{params:Promise<{id:string}>}){
  const [id,setId]=useState("");
  const [project,setProject]=useState<Project|null>(null);
  const [files,setFiles]=useState<FileItem[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [prompt,setPrompt]=useState("");
  const [busy,setBusy]=useState(false);
  const [deploying,setDeploying]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState("");
  const [preview,setPreview]=useState("");
  const [tab,setTab]=useState<"preview"|"code">("preview");
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const [device,setDevice]=useState<"desktop"|"tablet"|"mobile">("desktop");
  const [buildStatus,setBuildStatus]=useState("ready");
  const [buildLogs,setBuildLogs]=useState<{message:string;level:string}[]>([]);
  const [fileCount,setFileCount]=useState(0);

  useEffect(()=>{params.then(p=>{setId(p.id);load(p.id)})},[]);
  async function load(projectId:string){
    const r=await fetch("/api/projects/"+projectId); const d=await r.json();
    if(!r.ok){setError(d.error||"Could not load project");return}
    setProject(d.project); setFiles(d.files||[]); setFileCount((d.files||[]).length); setMessages(d.messages||[]);
    if(d.project?.preview_html)setPreview(d.project.preview_html);
    const live=(d.deployments||[]).find((x:Deployment)=>x.deployment_url);
    if(live?.deployment_url)setPreview(live.deployment_url);
    if(!selected&&d.files?.[0])setSelected(d.files[0].path);
  }

  async function sendPrompt(){
    const text=prompt.trim(); if(!text||busy)return;
    setBusy(true);setError("");
    setMessages(prev=>[...prev,{id:`local-${Date.now()}`,role:"user",content:text,created_at:new Date().toISOString()}]);
    let poll: ReturnType<typeof setInterval> | undefined;
    try{
      setBuildStatus(files.length ? "editing" : "planning");
      poll=setInterval(async()=>{
        try{
          const s=await fetch("/api/projects/"+id+"/build/status");
          const d=await s.json();
          if(s.ok){
            setBuildStatus(d.project?.status || "building");
            setBuildLogs(d.logs || []);
            setFileCount(d.fileCount || 0);
            if(d.project?.preview_html) setPreview(d.project.preview_html);
          }
        }catch{}
      },1200);
      const r=await fetch("/api/projects/"+id+(files.length?"/edit":"/build"),{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:text})
      });
      const d=await r.json();
      if(!r.ok){
        if(d.error==="NO_AI_PROVIDER_CONFIGURED") throw new Error("Connect an AI provider first.");
        throw new Error(d.error||"AI task failed");
      }
      setPrompt("");
      if(d.previewHtml)setPreview(d.previewHtml);
      await load(id);
    }catch(e){setError(e instanceof Error?e.message:"AI task failed")}finally{if(poll) clearInterval(poll);setBusy(false)}
  }

  async function syncGithub(){
    setSyncing(true);setError("");
    try{
      const r=await fetch("/api/projects/"+id+"/github/sync",{method:"POST"});
      const d=await r.json();
      if(!r.ok){
        if(d.error==="GITHUB_NOT_CONNECTED") throw new Error("Connect GitHub first from Connections.");
        throw new Error(d.error||"GitHub sync failed");
      }
      if(d.repository?.url)setProject(p=>p?{...p,github_repo_url:d.repository.url}:p);
    }catch(e){setError(e instanceof Error?e.message:"GitHub sync failed")}finally{setSyncing(false)}
  }

  async function deploy(){
    setDeploying(true);setError("");
    try{
      const r=await fetch("/api/projects/"+id+"/deploy",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
      const d=await r.json();
      if(!r.ok){
        if(d.error==="VERCEL_NOT_CONNECTED") throw new Error("Connect Vercel first. Your app is already built and previewable here.");
        if(d.error==="BUILD_REQUIRED") throw new Error("Build the website first.");
        throw new Error(d.error||"Deployment failed");
      }
      if(d.url)setPreview(d.url); await load(id);
    }catch(e){setError(e instanceof Error?e.message:"Deployment failed")}finally{setDeploying(false)}
  }

  const current=useMemo(()=>files.find(f=>f.path===selected),[files,selected]);
  const hasGithub=Boolean(project?.github_repo_url);

  if(!project&&!error)return <main className="min-h-screen bg-[#07080c] p-8 text-zinc-400">Loading workspace…</main>;

  return <main className={(theme==="dark"?"min-h-screen bg-[#07080c] text-zinc-100":"min-h-screen bg-slate-100 text-slate-900")+" transition-colors duration-300"}>
    <header className={(theme==="dark"?"border-white/10 bg-[#08090d]/90":"border-slate-200 bg-white/90")+" sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-5"}>
      <Link href="/dashboard/projects" className="flex shrink-0 items-center gap-2 font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20"><Sparkles size={16}/></span>
        <span className="hidden sm:block">SK Builder</span>
      </Link>
      <span className={theme==="dark"?"text-zinc-600":"text-slate-400"}>/</span>
      <span className="max-w-[160px] truncate text-sm font-medium">{project?.name||"Workspace"}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/dashboard/integrations" className="hidden rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 transition hover:bg-black/5 hover:text-violet-500 sm:block">Connections</Link>
        {hasGithub?<button onClick={syncGithub} className="rounded-lg p-2 text-violet-500 transition hover:bg-black/5" title="Sync project to GitHub"><Github size={17}/></button>:<Link href="/dashboard/integrations" className="rounded-lg p-2 text-zinc-400 transition hover:bg-black/5 hover:text-violet-500" title="Connect GitHub"><Github size={17}/></Link>}
        <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="rounded-lg p-2 text-zinc-400 transition hover:bg-black/5 hover:text-violet-500" title="Toggle theme">{theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}</button>
        <UserButton />
        <button onClick={deploy} disabled={deploying||!files.length} className="hidden items-center gap-2 rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400 disabled:opacity-40 sm:inline-flex"><Rocket size={14}/>{deploying?"Deploying…":"Deploy to Vercel"}</button>
      </div>
    </header>

    <div className="mx-auto max-w-[1800px]">
      {error&&<div className="mx-3 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-5">{error}<Link href="/dashboard/integrations" className="ml-2 underline">Connections</Link></div>}

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_280px_390px]">
        <section className={(theme==="dark"?"border-white/10 bg-[#101217]":"border-slate-200 bg-slate-50")+" min-w-0 border-r"}>
          <div className={(theme==="dark"?"border-white/10":"border-slate-200")+" flex h-12 items-center gap-1 border-b px-3"}>
            <button onClick={()=>setTab("preview")} className={"inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition "+(tab==="preview"?"bg-violet-500/10 text-violet-400":"text-zinc-500 hover:bg-black/5")}><Wand2 size={13}/> PREVIEW</button>
            <button onClick={()=>setTab("code")} className={"inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition "+(tab==="code"?"bg-violet-500/10 text-violet-400":"text-zinc-500 hover:bg-black/5")}><Code2 size={13}/> CODE</button>
            <div className="ml-auto hidden items-center gap-1 sm:flex">
              {(["desktop","tablet","mobile"] as const).map(d=><button key={d} onClick={()=>setDevice(d)} className={"rounded-md px-2 py-1 text-[10px] capitalize "+(device===d?"bg-violet-500/10 text-violet-400":"text-zinc-500")}>{d}</button>)}
              <span className="ml-1 rounded-full bg-black/5 px-2.5 py-1 text-[10px] uppercase tracking-widest text-zinc-500">{files.length} files</span>
            </div>
          </div>

          {tab==="preview"?<div className="h-[calc(100vh-7rem)] min-h-[600px] p-3 sm:p-4">
            <div className={"relative mx-auto h-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl transition-all duration-300 "+(device==="mobile"?"max-w-[390px]":device==="tablet"?"max-w-[820px]":"w-full")}>
              {preview?<iframe title="SK Builder website preview" src={preview.startsWith("<")?undefined:preview} srcDoc={preview.startsWith("<")?preview:undefined} sandbox="" className="h-full w-full bg-white"/>:
              <div className="flex h-full items-center justify-center p-8 text-center text-slate-500"><div><Sparkles className="mx-auto mb-4 text-violet-400" size={30}/><h2 className="text-lg font-semibold text-slate-800">Your website preview will appear here</h2><p className="mt-2 max-w-md text-sm">Describe your product in the AI Builder. SK Builder creates the website first — GitHub and Vercel are optional delivery connections.</p></div></div>}
            </div>
          </div>:<div className="h-[calc(100vh-7rem)] min-h-[600px] overflow-auto p-4 sm:p-5">{current?<><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Code2 size={15}/>{current.path}</div><pre className="overflow-auto rounded-2xl border border-black/10 bg-black/[.04] p-5 text-xs leading-5 text-zinc-600">{current.content}</pre></>:<p className="text-sm text-zinc-500">Select a file from Project Files.</p>}</div>}
        </section>

        <aside className={(theme==="dark"?"border-white/10 bg-[#0b0d11]":"border-slate-200 bg-white")+" hidden border-r lg:block"}>
          <div className={(theme==="dark"?"border-white/10":"border-slate-200")+" border-b p-4"}><div className="text-xs font-semibold uppercase tracking-[.25em] text-violet-400">PROJECT FILES</div><div className="mt-1 text-xs text-zinc-500">Your generated source</div></div>
          <div className="max-h-[calc(100vh-7rem)] overflow-auto p-3">{files.length?files.map(f=><button key={f.path} onClick={()=>{setSelected(f.path);setTab("code")}} className={"mb-1 block w-full rounded-lg px-3 py-2 text-left text-xs transition "+(selected===f.path?"bg-violet-500/10 text-violet-400":"text-zinc-500 hover:bg-black/5")}>{f.path}</button>):<p className="p-3 text-xs leading-5 text-zinc-500">Files appear after the first build.</p>}</div>
        </aside>

        <aside className={(theme==="dark"?"border-white/10 bg-[#090a0e]":"border-slate-200 bg-white")+" flex min-h-[620px] flex-col border-t lg:border-t-0"}>
          <div className={(theme==="dark"?"border-white/10":"border-slate-200")+" border-b p-4"}>
            <div className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-violet-400"><Bot size={14}/> AI BUILDER</div><p className="mt-1 text-xs text-zinc-500">Build, edit, refine — no questionnaire.</p></div><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/10 text-violet-400"><Sparkles size={14}/></span></div>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4">          {busy&&<div className="mb-3 rounded-2xl border border-white/10 bg-white/[.03] p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500"><span>Build pipeline</span><span>{fileCount} files</span></div>
            <div className="grid grid-cols-5 gap-1">
              {["Planning","Preview","Coding","Review","Ready"].map((s,i)=><div key={s} className={"rounded-md px-1 py-1.5 text-center text-[9px] "+(i===0&&buildStatus==="planning"||i===1&&buildStatus==="building"||i>=2&&buildStatus==="building"?"bg-violet-500/20 text-violet-300":"bg-white/5 text-zinc-600")}>{s}</div>)}
            </div>
            {buildLogs.slice(-3).map((l,i)=><p key={i} className="mt-2 truncate text-[10px] text-zinc-600">• {l.message}</p>)}
          </div>}

            {busy&&<div className="rounded-2xl border border-violet-500/20 bg-violet-500/[.06] p-3"><div className="flex items-center gap-2 text-xs font-medium text-violet-400"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400"/>{files.length?"Applying changes to your project…":"Building your website and preview…"}</div><p className="mt-1 text-[11px] text-zinc-500">Generating files, validating the project structure and preparing the preview.</p></div>}
            {!messages.filter(m=>m.role!=="system").length&&<div className="rounded-2xl border border-violet-500/10 bg-violet-500/[.05] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-violet-400"/> Ready when you are</div><p className="mt-2 text-xs leading-5 text-zinc-500">Try “Build a premium clinic SaaS with login, appointments and an admin dashboard.”</p><div className="mt-3 grid gap-2 text-[11px] text-zinc-500"><span>• Build the website first</span><span>• Preview instantly</span><span>• Connect GitHub/Vercel only when you want</span></div></div>}
            {messages.filter(m=>m.role!=="system").map(m=><div key={m.id} className={"rounded-2xl p-3 "+(m.role==="user"?"bg-black/5":"border border-violet-500/10 bg-violet-500/[.05]")}><div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{m.role==="user"?"You":"SK Builder"}</div><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600">{m.content.slice(0,1600)}</p></div>)}
          </div>
          <div className={(theme==="dark"?"border-white/10":"border-slate-200")+" border-t p-4"}>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendPrompt()}}} rows={5} placeholder={files.length?"Tell SK Builder what to change…":"Describe the website you want to build…"} className="w-full resize-none rounded-2xl border border-black/10 bg-black/[.03] p-3 text-sm outline-none transition focus:border-violet-400"/>
            <button onClick={sendPrompt} disabled={busy||!prompt.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 hover:bg-violet-400 disabled:opacity-40">{busy?"AI is building…":files.length?"Apply changes":"Build website"} {!busy&&<Send size={14}/>}</button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {hasGithub?<button onClick={syncGithub} disabled={syncing} className="rounded-lg border border-black/10 px-3 py-2 text-[11px] font-medium text-violet-500 transition hover:border-violet-300 disabled:opacity-40"><Github className="mr-1 inline" size={12}/>{syncing?"Syncing…":"Sync GitHub"}</button>:<Link href="/dashboard/integrations" className="rounded-lg border border-black/10 px-3 py-2 text-center text-[11px] font-medium text-zinc-500 transition hover:border-violet-300 hover:text-violet-500"><Github className="mr-1 inline" size={12}/>Connect GitHub</Link>}
              <button onClick={deploy} disabled={deploying||!files.length} className="rounded-lg border border-black/10 px-3 py-2 text-[11px] font-medium text-zinc-500 transition hover:border-violet-300 hover:text-violet-500 disabled:opacity-40"><Rocket className="mr-1 inline" size={12}/>{deploying?"Deploying":"Deploy to Vercel"}</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-zinc-400">Enter to send · Shift+Enter for a new line</p>
          </div>
        </aside>
      </div>
    </div>

    <footer className={(theme==="dark"?"border-white/10 bg-[#07080c]":"border-slate-200 bg-white")+" border-t py-5 text-center text-[11px] text-zinc-500"}><p>Powered by <span className="font-semibold text-zinc-700">SUHAIL AHMED AAMRO</span> · <a href="https://my-portfilo-41201.vercel.app" target="_blank" rel="noreferrer" className="hover:text-violet-500">Portfolio</a></p></footer>
  </main>;
}
