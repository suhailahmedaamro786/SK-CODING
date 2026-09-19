import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function ProjectsPage() {
  await requireUser();
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
    <h1 className="mt-8 text-3xl font-bold">Projects</h1>
    <p className="mt-2 text-zinc-500">Project creation and the AI requirements workflow are the next implementation stage.</p>
    <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-sm text-zinc-500">No projects yet.</div>
  </div></main>;
}
