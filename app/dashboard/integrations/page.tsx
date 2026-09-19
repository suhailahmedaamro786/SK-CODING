import Link from "next/link";
import { requireUser } from "@/lib/auth";
import GitHubConnection from "./GitHubConnection";

export default async function IntegrationsPage() {
  await requireUser();
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
    <h1 className="mt-8 text-3xl font-bold">Integrations</h1>
    <p className="mt-2 text-zinc-500">Connect the services SK Builder uses to ship real applications.</p>
    <GitHubConnection />
    <section className="mt-4 rounded-2xl border border-white/10 p-6 text-sm text-zinc-500">Supabase and Vercel connections are next in the integration pipeline.</section>
  </div></main>;
}
