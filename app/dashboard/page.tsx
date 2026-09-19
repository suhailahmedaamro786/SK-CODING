"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ArrowRight, Bot, Boxes, Github, Rocket, Sparkles } from "lucide-react";

const cards = [
  { href:"/dashboard/projects", icon:Boxes, title:"Projects", text:"Build and continuously edit applications from one prompt." },
  { href:"/dashboard/ai-providers", icon:Bot, title:"AI Providers", text:"Connect your own OpenAI, Gemini, Claude or OpenRouter key." },
  { href:"/dashboard/integrations", icon:Github, title:"Integrations", text:"Connect GitHub and Vercel for delivery." },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3 backdrop-blur-xl">
          <Link href="/dashboard/projects" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black"><Sparkles size={17}/></span>
            <span className="font-semibold tracking-tight">SK Builder</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/projects" className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white sm:block">Workspace</Link>
            <UserButton />
          </div>
        </header>

        <section className="relative overflow-hidden py-16 sm:py-20">
          <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"/>
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl"/>
          <div className="relative">
            <p className="text-xs uppercase tracking-[.28em] text-violet-300">AI Software Factory</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.04em] sm:text-6xl">Turn an idea into a real application.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500">Connect your AI once, describe the product you want, and let SK Builder generate code, push it to GitHub and prepare it for Vercel.</p>
            <Link href="/dashboard/projects" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">Open Builder <ArrowRight size={16}/></Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map(({href,icon:Icon,title,text})=>(
            <Link key={href} href={href} className="group rounded-2xl border border-white/10 bg-white/[.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[.045]">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-zinc-300 group-hover:text-white"><Icon size={18}/></span>
              <h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p>
            </Link>
          ))}
        </section>

        <footer className="mt-20 border-t border-white/10 py-8 text-center text-xs text-zinc-600">
          <p>Powered by <span className="text-zinc-300">SUHAIL AHMED AAMRO</span></p>
          <a href="https://my-portfilo-41201.vercel.app" target="_blank" rel="noreferrer" className="mt-2 inline-block transition hover:text-white">Portfolio ↗</a>
        </footer>
      </div>
    </main>
  );
}
