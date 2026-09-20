"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Code2, FileCode2, FolderTree, Github, Moon, Rocket, Send, Sparkles, Sun, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type FileItem = { path: string; content: string; status: string };
type Message = { id: string; role: "user" | "assistant" | "system"; content: string; created_at: string };
type Project = { id: string; name: string; description: string | null; status: string; github_repo_url?: string | null; preview_html?: string | null };
type Deployment = { deployment_url?: string | null; status: string; created_at: string };

export default function ProjectWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [buildStatus, setBuildStatus] = useState("ready");
  const [buildLogs, setBuildLogs] = useState<{ message: string; level: string }[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [inspector, setInspector] = useState<"files" | "code" | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function load(projectId: string) {
    const r = await fetch("/api/projects/" + projectId);
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Could not load project");
      return;
    }
    setProject(d.project);
    setFiles(d.files || []);
    setFileCount((d.files || []).length);
    setMessages(d.messages || []);
    if (d.project?.preview_html) setPreview(d.project.preview_html);
    const live = (d.deployments || []).find((x: Deployment) => x.deployment_url);
    if (live?.deployment_url) setPreview(live.deployment_url);
    if (!selected && d.files?.[0]) setSelected(d.files[0].path);
  }

  async function sendPrompt() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    setMessages((prev) => [...prev, { id: "local-" + Date.now(), role: "user", content: text, created_at: new Date().toISOString() }]);

    const poll = setInterval(async () => {
      try {
        const s = await fetch("/api/projects/" + id + "/build/status");
        const d = await s.json();
        if (s.ok) {
          setBuildStatus(d.project?.status || "building");
          setBuildLogs(d.logs || []);
          setFileCount(d.fileCount || 0);
          if (d.project?.preview_html) setPreview(d.project.preview_html);
        }
      } catch {}
    }, 1200);

    try {
      setBuildStatus(files.length ? "editing" : "planning");
      const r = await fetch("/api/projects/" + id + (files.length ? "/edit" : "/build"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === "NO_AI_PROVIDER_CONFIGURED") throw new Error("Connect an AI provider first from AI Providers.");
        throw new Error(d.error || "AI task failed");
      }
      setPrompt("");
      if (d.previewHtml) setPreview(d.previewHtml);
      await load(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI task failed");
    } finally {
      clearInterval(poll);
      setBusy(false);
    }
  }

  async function syncGithub() {
    setSyncing(true);
    setError("");
    try {
      const r = await fetch("/api/projects/" + id + "/github/sync", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error === "GITHUB_NOT_CONNECTED" ? "Connect GitHub first from Connections." : d.error || "GitHub sync failed");
      if (d.repository?.url) setProject((p) => p ? { ...p, github_repo_url: d.repository.url } : p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function deploy() {
    setDeploying(true);
    setError("");
    try {
      const r = await fetch("/api/projects/" + id + "/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === "VERCEL_NOT_CONNECTED") throw new Error("Connect Vercel first. The website is already previewable here.");
        if (d.error === "BUILD_REQUIRED") throw new Error("Build the website first.");
        throw new Error(d.error || "Deployment failed");
      }
      if (d.url) setPreview(d.url);
      await load(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  const current = useMemo(() => files.find((f) => f.path === selected), [files, selected]);
  const hasGithub = Boolean(project?.github_repo_url);

  if (!project && !error) {
    return <main className="min-h-screen bg-[#07080c] p-8 text-zinc-400">Loading workspace…</main>;
  }

  const dark = theme === "dark";

  return (
    <main className={(dark ? "bg-[#07080c] text-zinc-100" : "bg-slate-100 text-slate-900") + " min-h-screen transition-colors duration-300"}>
      <header className={(dark ? "border-white/10 bg-[#08090d]/95" : "border-slate-200 bg-white/95") + " sticky top-0 z-50 flex min-h-[68px] items-center gap-2 border-b px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,.08)] backdrop-blur-xl sm:px-6"}>
        <Link href="/dashboard/projects" className="flex shrink-0 items-center gap-2.5 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/25"><Sparkles size={16} /></span>
          <span className="hidden sm:block">SK Builder</span>
        </Link>
        <span className={dark ? "text-zinc-700" : "text-slate-300"}>/</span>
        <span className={dark ? "text-zinc-700" : "text-slate-300"}>·</span><span className="min-w-0 max-w-[34vw] truncate text-xs font-semibold sm:max-w-[180px] sm:text-sm">{project?.name || "Workspace"}</span><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 sm:inline">{busy ? "Building" : project?.status || "Ready"}</span>
        <div className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-2">
          <Link href="/dashboard/integrations" className="hidden rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-violet-400 sm:block">Connections</Link>
          {hasGithub ? (
            <button onClick={syncGithub} className="rounded-lg p-2 text-violet-400 transition hover:bg-violet-500/10" title="Sync to GitHub"><Github size={17} /></button>
          ) : (
            <Link href="/dashboard/integrations" className="rounded-lg p-2 text-zinc-500 transition hover:bg-violet-500/10 hover:text-violet-400" title="Connect GitHub"><Github size={17} /></Link>
          )}
          <button onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-lg p-2 text-zinc-500 transition hover:bg-violet-500/10 hover:text-violet-400" title="Toggle theme">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <UserButton />
          <button onClick={deploy} disabled={deploying || !files.length} className="hidden items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex">
            <Rocket size={14} />{deploying ? "Deploying…" : "Deploy to Vercel"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-6">
          <strong className="mr-2">Build issue:</strong>{error}
          <Link href="/dashboard/integrations" className="ml-3 underline underline-offset-2">Open Connections</Link>
        </div>
      )}

      <div className="mx-auto grid min-h-[calc(100vh-68px-60px)] max-w-[1900px] grid-cols-1 lg:grid-cols-[minmax(360px,35%)_minmax(0,1fr)] xl:grid-cols-[minmax(420px,35%)_minmax(0,1fr)]">
        <aside className={(dark ? "border-white/10 bg-[#090a0e]" : "border-slate-200 bg-white") + " order-1 flex min-h-[520px] h-[min(78dvh,760px)] flex-col overflow-hidden border-b lg:h-[calc(100dvh-68px-60px)] lg:min-h-0 lg:border-b-0 lg:border-r"}>
          <div className={(dark ? "border-white/10" : "border-slate-200") + " border-b px-5 py-4"}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.24em] text-violet-400"><Bot size={14} /> AI Builder</div>
                <p className={dark ? "mt-1 text-xs text-zinc-500" : "mt-1 text-xs text-slate-500"}>Build, edit, refine — no questionnaire.</p>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/10 text-violet-400"><Sparkles size={14} /></span>
            </div>
          </div>

          <div ref={chatScrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-5 [scrollbar-width:thin]">
            {busy && (
              <div className={(dark ? "border-white/10 bg-white/[.03]" : "border-slate-200 bg-slate-50") + " rounded-2xl border p-3"}>
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Build pipeline</span><span>{fileCount} files</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {["Plan", "Preview", "Code", "Review", "Ready"].map((label) => (
                    <div key={label} className={(dark ? "bg-white/5" : "bg-white") + " rounded-md px-1 py-1.5 text-center text-[9px] text-zinc-500"}>{label}</div>
                  ))}
                </div>
                {buildLogs.slice(-3).map((log, i) => <p key={i} className="mt-2 truncate text-[10px] text-zinc-500">• {log.message}</p>)}
              </div>
            )}

            {busy && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[.07] p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-400"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />{files.length ? "AI is refining your website…" : "AI is building your website…"}</div>
                <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">Designing the UI, generating the project, validating the output and preparing the preview.</p>
              </div>
            )}

            {!messages.filter((m) => m.role !== "system").length && (
              <div className={(dark ? "border-violet-500/15 bg-violet-500/[.05]" : "border-violet-200 bg-violet-50") + " rounded-2xl border p-5"}>
                <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} className="text-violet-400" /> Ready to build</div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Example: “Build a premium clinic SaaS with login, appointments, patients and an admin dashboard.”</p>
                <div className="mt-4 grid gap-2 text-[11px] text-zinc-500">
                  <span>✓ Website first</span><span>✓ Live preview in SK Builder</span><span>✓ GitHub / Vercel / Supabase optional</span>
                </div>
              </div>
            )}

            {messages.filter((m) => m.role !== "system").map((m) => (
              <div key={m.id} className={m.role === "user" ? (dark ? "bg-white/[.055]" : "bg-slate-100") + " rounded-2xl border border-transparent p-4" : (dark ? "border-violet-500/15 bg-violet-500/[.055]" : "border-violet-200 bg-violet-50") + " rounded-2xl border p-4"}>
                <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-zinc-500">{m.role === "user" ? "You" : "SK Builder"}</div>
                <p className={dark ? "whitespace-pre-wrap text-sm leading-6 text-zinc-200" : "whitespace-pre-wrap text-sm leading-6 text-slate-700"}>{m.content.slice(0, 1800)}</p>
              </div>
            ))}
          </div>

          <div className={(dark ? "border-white/10 bg-[#090a0e]" : "border-slate-200 bg-white") + " shrink-0 border-t p-4 shadow-[0_-12px_30px_rgba(0,0,0,.12)]"}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(); } }}
              rows={3}
              placeholder={files.length ? "Message SK Builder… tell it what to change" : "Message SK Builder… describe the website you want to build"}
              className={(dark ? "border-white/10 bg-[#111219] text-zinc-100 placeholder:text-zinc-600" : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400") + " w-full resize-none rounded-2xl border p-3.5 text-sm leading-6 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10"}
            />
            <button onClick={sendPrompt} disabled={busy || !prompt.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "AI is building…" : files.length ? "Apply changes" : "Build website"} {!busy && <Send size={14} />}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {hasGithub ? (
                <button onClick={syncGithub} disabled={syncing} className="rounded-lg border border-white/10 px-3 py-2.5 text-[11px] font-bold text-violet-400 transition hover:border-violet-400 disabled:opacity-40"><Github className="mr-1 inline" size={12} />{syncing ? "Syncing…" : "Sync GitHub"}</button>
              ) : (
                <Link href="/dashboard/integrations" className="rounded-lg border border-white/10 px-3 py-2.5 text-center text-[11px] font-bold text-zinc-400 transition hover:border-violet-400 hover:text-violet-400"><Github className="mr-1 inline" size={12} />Connect GitHub</Link>
              )}
              <button onClick={deploy} disabled={deploying || !files.length} className="rounded-lg border border-white/10 px-3 py-2.5 text-[11px] font-bold text-zinc-400 transition hover:border-violet-400 hover:text-violet-400 disabled:opacity-40"><Rocket className="mr-1 inline" size={12} />{deploying ? "Deploying" : "Vercel"}</button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-zinc-600"><span>AI Builder</span><span>Enter to send · Shift+Enter for new line</span></div>
          </div>
        </aside>

        <section className={(dark ? "bg-[#101217]" : "bg-slate-50") + " order-2 min-h-[520px] min-w-0 overflow-hidden lg:min-h-[calc(100dvh-68px-60px)] lg:order-2"}>
          <div className={(dark ? "border-white/10 bg-[#0d0e13]" : "border-slate-200 bg-white") + " flex h-14 items-center gap-2 border-b px-3 sm:px-4"}>
            <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-400"><Sparkles size={13} /> PREVIEW</div>
            <span className="hidden text-[11px] text-zinc-500 sm:block">Live website preview</span>
            <div className="ml-auto flex items-center gap-1">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)} className={"rounded-lg px-2.5 py-1.5 text-[10px] font-semibold capitalize transition " + (device === d ? "bg-violet-500/15 text-violet-400" : "text-zinc-500 hover:bg-white/5")}>{d}</button>
              ))}
            </div>
          </div>

          <div className="relative h-[calc(min(78dvh,760px)-56px)] min-h-[460px] p-2 sm:h-[calc(100%-56px)] sm:min-h-[500px] sm:p-4 lg:h-[calc(100dvh-68px-60px-56px)] lg:min-h-[560px] lg:p-5">
            <div className={"relative mx-auto h-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] transition-all duration-300 " + (device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[820px]" : "w-full")}>
              {preview ? (
                <iframe title="SK Builder live website preview" src={preview.startsWith("<") ? undefined : preview} srcDoc={preview.startsWith("<") ? preview : undefined} sandbox="allow-scripts allow-forms allow-modals allow-popups" className="h-full w-full bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <div className="max-w-md">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-500"><Sparkles size={24} /></div>
                    <h2 className="mt-5 text-xl font-bold text-slate-900">Your live website appears here</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Describe your product in the AI Builder. SK Builder builds the website first; GitHub, Vercel and Supabase stay optional.</p>
                  </div>
                </div>
              )}

              {inspector && (
                <div className="absolute inset-x-3 bottom-3 z-20 max-h-[45%] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c10]/95 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    {inspector === "files" ? <FolderTree size={14} className="text-violet-400" /> : <Code2 size={14} className="text-violet-400" />}
                    <span className="text-xs font-bold">{inspector === "files" ? "Project files" : selected || "Source code"}</span>
                    <button onClick={() => setInspector(null)} className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"><X size={14} /></button>
                  </div>
                  {inspector === "files" ? (
                    <div className="max-h-64 overflow-auto p-2">
                      {files.length ? files.map((file) => (
                        <button key={file.path} onClick={() => { setSelected(file.path); setInspector("code"); }} className={"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition " + (selected === file.path ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>
                          <FileCode2 size={13} />{file.path}
                        </button>
                      )) : <p className="p-3 text-xs text-zinc-500">No generated files yet.</p>}
                    </div>
                  ) : (
                    <pre className="max-h-64 overflow-auto p-4 text-[11px] leading-5 text-zinc-300">{current?.content || "Select a file from Files."}</pre>
                  )}
                </div>
              )}
            </div>

            <div className="mx-auto mt-3 flex w-full max-w-[900px] flex-wrap items-center justify-center gap-2 px-1 sm:px-0">
              <button onClick={() => setInspector(inspector === "files" ? null : "files")} className={(inspector === "files" ? "border-violet-400 bg-violet-500/10 text-violet-400" : dark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500") + " inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition hover:border-violet-400 hover:text-violet-400"}><FolderTree size={13} /> Files {fileCount ? "(" + fileCount + ")" : ""}</button>
              <button onClick={() => setInspector(inspector === "code" ? null : "code")} className={(inspector === "code" ? "border-violet-400 bg-violet-500/10 text-violet-400" : dark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500") + " inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition hover:border-violet-400 hover:text-violet-400"}><Code2 size={13} /> Code</button>
              <span className="hidden text-[10px] text-zinc-600 md:inline">Click Files or Code — no permanent folder sidebar.</span>
            </div>
          </div>
        </section>
      </div>

      <footer className={(dark ? "border-white/10 bg-[#07080c]" : "border-slate-200 bg-white") + " relative z-30 min-h-[60px] border-t px-3 py-5 text-center text-[11px] text-zinc-500 sm:flex sm:items-center sm:justify-between sm:px-6"}>
        <span className="leading-5">© 2026 SK Builder · Powered by <span className="font-semibold text-zinc-300">SUHAIL AHMED AAMRO</span></span><a href="https://suhailahmedaamro.vercel.app" target="_blank" rel="noreferrer" className="mt-2 hover:text-violet-400 sm:mt-0">Portfolio</a>
      </footer>
    </main>
  );
}
