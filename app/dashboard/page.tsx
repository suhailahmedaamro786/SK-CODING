import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  return <main className="min-h-screen px-6 py-10"><div className="mx-auto max-w-6xl">
    <header className="flex items-center justify-between border-b border-white/10 pb-6">
      <div><p className="text-sm text-violet-300">SK Builder</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-zinc-500">Signed in as {user.emailAddresses[0]?.emailAddress ?? user.id}</p></div>
      <UserButton />
    </header>
    <section className="grid gap-4 py-10 md:grid-cols-3">
      <Link href="/dashboard/projects" className="rounded-2xl border border-white/10 bg-white/[.03] p-6 hover:bg-white/[.05]"><h2 className="font-semibold">Projects</h2><p className="mt-2 text-sm text-zinc-500">Create and manage AI-built applications.</p></Link>
      <Link href="/dashboard/ai-providers" className="rounded-2xl border border-white/10 bg-white/[.03] p-6 hover:bg-white/[.05]"><h2 className="font-semibold">AI Providers</h2><p className="mt-2 text-sm text-zinc-500">Manage future BYOK provider configuration.</p></Link>
      <Link href="/dashboard/integrations" className="rounded-2xl border border-white/10 bg-white/[.03] p-6 hover:bg-white/[.05]"><h2 className="font-semibold">Integrations</h2><p className="mt-2 text-sm text-zinc-500">GitHub, Supabase and Vercel connections.</p></Link>
    </section>
  </div></main>;
}
