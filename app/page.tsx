"use client";

import { ArrowRight, Sparkles, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-black"><Zap size={18}/></div><span className="font-semibold">SK Builder</span></div>
          <a href="/dashboard/projects" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5">Open Builder</a>
        </nav>
        <section className="flex flex-1 items-center justify-center py-20">
          <div className="w-full max-w-4xl text-center">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-zinc-400"><Sparkles size={13}/>AI Software Factory</div>
            <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-0.045em] sm:text-7xl">Build software from a simple prompt.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">Describe what you want to build. SK Builder turns your idea into code, connects your project to GitHub, and prepares it for deployment.</p>
            <div className="mt-9 flex justify-center"><a href="/dashboard/projects" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">Start building <ArrowRight size={17}/></a></div>
            <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-zinc-600"><span>Prompt → Code</span><span>GitHub</span><span>Supabase</span><span>Vercel</span></div>
          </div>
        </section>
        <footer className="border-t border-white/5 py-7 text-center text-xs text-zinc-700"><p>Powered by <span className="text-zinc-400">SUHAIL AHMED AAMRO</span></p><a href="https://my-portfilo-41201.vercel.app" target="_blank" rel="noreferrer" className="mt-2 inline-block transition hover:text-white">Portfolio ↗</a></footer>
      </div>
    </main>
  );
}
