"use client";

import { useState } from "react";
import { ArrowRight, Bot, Check, Code2, Database, Github, Globe, Layers3, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";

const steps = [
  { icon: Bot, title: "AI Requirements Interview", text: "Describe your idea. SK Builder asks the right product, users, pages and feature questions." },
  { icon: Layers3, title: "Plan & Architecture", text: "Turn answers into a structured specification, architecture and implementation plan before code." },
  { icon: Code2, title: "Generate the App", text: "Generate a production-oriented Next.js application from the approved plan." },
  { icon: Github, title: "Ship to GitHub", text: "Create the real project repository and keep generated changes version controlled." },
  { icon: Database, title: "Connect Supabase", text: "Generate database schema, migrations and RLS-ready ownership rules." },
  { icon: Rocket, title: "Deploy to Vercel", text: "Move from generated code to a live application with a deployment pipeline." }
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [started, setStarted] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black"><Zap size={20}/></div>
            <div><div className="font-bold tracking-tight">SK Builder</div><div className="text-xs text-zinc-500">AI Software Factory</div></div>
          </div>
          <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#architecture" className="hover:text-white">Architecture</a>
            <a href="#roadmap" className="hover:text-white">Roadmap</a>
          </div>
          <button onClick={()=>setStarted(true)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Start building</button>
        </nav>

        <section className="grid min-h-[720px] items-center gap-14 py-20 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1.5 text-xs text-violet-200"><Sparkles size={14}/> From idea to live software</div>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] sm:text-7xl">Build real software with an <span className="text-violet-300">AI engineering team.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">SK Builder turns a natural-language idea into requirements, architecture, code, tests, GitHub, Supabase and deployment — with a path toward continuous AI development.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={()=>window.location.href="/dashboard/projects"} className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200">Create a project <ArrowRight size={17}/></button>
              <a href="#workflow" className="flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-300 hover:bg-white/5">See how it works</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-5 text-xs text-zinc-500"><span className="flex items-center gap-2"><Check size={14}/> Plan before build</span><span className="flex items-center gap-2"><Check size={14}/> Real Git repositories</span><span className="flex items-center gap-2"><Check size={14}/> Deployment-ready</span></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.03] p-4 shadow-2xl">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d14] p-5">
              <div className="mb-5 flex items-center gap-2 text-sm"><div className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-zinc-400">Project Builder</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-600">Your idea</p>
                <textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Build a SaaS dashboard for..." className="mt-3 min-h-32 w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-zinc-700"/>
              </div>
              <button onClick={()=>setStarted(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-semibold hover:bg-violet-400">Start AI interview <ArrowRight size={16}/></button>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-500"><div className="rounded-lg border border-white/5 p-3">Requirements</div><div className="rounded-lg border border-white/5 p-3">Architecture</div><div className="rounded-lg border border-white/5 p-3">Build</div></div>
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20">
          <div className="mb-10 max-w-2xl"><p className="text-sm font-semibold text-violet-300">THE FACTORY</p><h2 className="mt-2 text-3xl font-bold">One reliable path from idea to production.</h2><p className="mt-3 text-zinc-500">The MVP focuses on the core software-building loop first. Advanced agents and multi-LLM routing come after the foundation is reliable.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{steps.map((s,i)=>{const Icon=s.icon;return <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><div className="mb-5 flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-violet-300"><Icon size={19}/></div><span className="text-xs text-zinc-700">0{i+1}</span></div><h3 className="font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{s.text}</p></div>})}</div>
        </section>

        <section id="architecture" className="border-y border-white/5 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div><p className="text-sm font-semibold text-violet-300">ARCHITECTURE</p><h2 className="mt-2 text-3xl font-bold">Built to become an AI developer, not just a prompt box.</h2><p className="mt-4 leading-7 text-zinc-500">The platform is designed around a server-side AI Gateway, structured project state, GitHub as the source of truth, Supabase for application data and Vercel for deployment.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{[["AI Gateway","Model routing, provider keys, fallback"],["Project State","Plans, tasks, messages and files"],["Security","RLS, secrets and server-side calls"],["Developer Loop","Edit → test → review → commit"]].map(([a,b])=><div key={a} className="rounded-2xl border border-white/10 p-5"><ShieldCheck size={18} className="text-violet-300"/><div className="mt-3 font-semibold">{a}</div><div className="mt-1 text-sm text-zinc-500">{b}</div></div>)}</div>
          </div>
        </section>

        <section id="roadmap" className="py-20">
          <p className="text-sm font-semibold text-violet-300">ROADMAP</p><h2 className="mt-2 text-3xl font-bold">Foundation first. Intelligence next.</h2>
          <div className="mt-8 grid gap-3">{["MVP1 — Auth, projects, AI interview, specification, build plan, Next.js generation, preview","MVP2 — GitHub, Supabase schema/RLS and Vercel deployment","MVP3 — Multi-LLM BYOK, multiple keys, routing, fallback and usage","MVP4 — AI editing, debugging, testing, review, security and commits","MVP5 — Screenshot/URL/Figma/voice, templates, teams, marketplace, billing"].map((x,i)=><div key={x} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.02] p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-xs text-zinc-400">{i+1}</span><span className="text-sm text-zinc-300">{x}</span></div>)}</div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/5 py-8 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>SK Builder • AI Software Factory</span><span>Built for the next generation of software development.</span></footer>
      </div>

      {started && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c0e15] p-7 shadow-2xl"><div className="flex items-start justify-between"><div><div className="text-xl font-bold">Create your project</div><p className="mt-1 text-sm text-zinc-500">MVP1 project setup is ready for the AI interview workflow.</p></div><button onClick={()=>setStarted(false)} className="text-zinc-500 hover:text-white">✕</button></div><div className="mt-6 rounded-2xl border border-white/10 p-4"><label className="text-xs text-zinc-500">PROJECT IDEA</label><div className="mt-2 text-sm text-zinc-200">{idea || "No idea entered yet."}</div></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/5 p-3 text-xs text-emerald-300"><Check size={15}/> Foundation UI complete — backend integrations are the next build phase.</div><button onClick={()=>window.location.href="/dashboard/projects"} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black">Continue to projects</button></div></div>}
    </main>
  );
}
