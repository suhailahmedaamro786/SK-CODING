"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Message={id:string;role:"user"|"assistant"|"system";content:string};
type Project={id:string;name:string;description:string|null;status:string};

export default function ProjectInterviewPage({params}:{params:Promise<{projectId:string}>}){
  const [projectId,setProjectId]=useState(""); const [project,setProject]=useState<Project|null>(null); const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{params.then(({projectId:id})=>{setProjectId(id);load(id)})},[]);
  async function load(id:string){const [pr,mr]=await Promise.all([fetch("/api/projects"),fetch(`/api/projects/${id}/interview`)]);const pd=await pr.json(),md=await mr.json();const found=(pd.projects??[]).find((p:Project)=>p.id===id);if(!found){setError("Project not found");return}setProject(found);setMessages(md.messages??[]);}
  async function send(e?:React.FormEvent){e?.preventDefault();if(!input.trim()||busy||!projectId)return;const text=input.trim();setInput("");setBusy(true);setError("");setMessages(m=>[...m,{id:crypto.randomUUID(),role:"user",content:text}]);const r=await fetch(`/api/projects/${projectId}/interview`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content:text})});const d=await r.json();setBusy(false);if(!r.ok){setError(d.error??"AI request failed");return}setMessages(m=>[...m,{id:crypto.randomUUID(),role:"assistant",content:d.text}]);}
  return <main className="min-h-screen px-6 py-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard/projects" className="text-sm text-zinc-500 hover:text-white">← Projects</Link>
    {project&&<><div className="mt-6"><p className="text-xs uppercase tracking-[.3em] text-cyan-400">Requirements Interview</p><h1 className="mt-2 text-3xl font-bold">{project.name}</h1><p className="mt-2 text-zinc-500">{project.description}</p></div>
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.03]"><div className="max-h-[55vh] space-y-4 overflow-y-auto p-5">
      {messages.length===0&&<div className="rounded-2xl bg-cyan-400/10 p-4 text-sm text-cyan-100">Tell me what you want to build. I’ll ask focused questions about users, pages, features, auth, database, design and integrations.</div>}
      {messages.map(m=><div key={m.id} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role==="user"?"bg-white text-black":"bg-white/5 text-zinc-200"}`}>{m.content}</div></div>)}
      {busy&&<div className="text-sm text-zinc-500">AI is thinking…</div>}
    </div><form onSubmit={send} className="border-t border-white/10 p-4"><div className="flex gap-3"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Describe your app or answer the AI…" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400"/><button disabled={busy||!input.trim()} className="rounded-xl bg-white px-5 font-semibold text-black disabled:opacity-40">{busy?"…":"Send"}</button></div></form></div>
    {error&&<p className="mt-4 text-sm text-red-300">{error}</p>}</>}
  </div></main>;
}
