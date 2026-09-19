import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function IntegrationsPage() {
  await requireUser();
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
    <h1 className="mt-8 text-3xl font-bold">Integrations</h1>
    <p className="mt-2 text-zinc-500">GitHub, Supabase and Vercel OAuth integrations will be implemented in the integration phase.</p>
  </div></main>;
}
